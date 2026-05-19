import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Import resetMemorySystems from the core/MissionService.js
import { resetMemorySystems } from './MissionService.js';
// 1. Create stable hoisted mock objects to ensure the test and the factory share references.
const { mockSupabase, mockRedis, mockSpawn } = vi.hoisted(() => ({
  mockSupabase: {
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null })
  },
  mockRedis: {
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    on: vi.fn(), // Intercept listeners to prevent real connection attempts
    quit: vi.fn().mockResolvedValue('OK'),
  },
  mockSpawn: vi.fn(() => {
    let onData;
    let onClose;
    return { // This mock is for Python tools
      stdin: {
        write: vi.fn((data) => {
          const args = JSON.parse(data);
          let response = '--- Scanned Folders Tree ---\n└── root/';
          
          if (args.function_name === 'Setup') {
            response = '--- Found ---\nMocked Setup Documentation Content';
          } else if (args.function_name === 'init') {
            response = '--- Found ---\nMocked init script content';
          } else if (args.objective?.includes('scaffold')) {
            response = 'Domain: model.js\nApplication: service.js\nInfrastructure: repo.js\nUI: component.tsx';
          }
          
          if (onData) onData(Buffer.from(response));
        }),
        end: vi.fn(() => {
          if (onClose) setTimeout(() => onClose(0), 10);
        }),
        on: vi.fn(),
      },
      stdout: {
        on: vi.fn((event, cb) => {
          if (event === 'data') onData = cb;
        }),
      },
    stderr: { on: vi.fn() },
    on: vi.fn((event, cb) => {
      if (event === 'close') onClose = cb;
    }),
    kill: vi.fn(),
    };
  })
}));

// 2. Apply module-level mocks using stable hoisted references.
// Mocks MUST be defined before the orchestrator is imported.
vi.mock('fs');
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase)
}));
vi.mock('ioredis', () => {
  // Return the constructor directly for CommonJS require interoperability.
  // Return the constructor directly for CommonJS require interoperability
  const RedisConstructor = vi.fn().mockImplementation(() => mockRedis);
  return RedisConstructor;
});
vi.mock('child_process', () => ({
  spawn: mockSpawn
}));

// 3. Import logic AFTER mocks are established to prevent leakage.
import * as orchestrator from './orchestrator';
import fs from 'fs';
import { unzipSearchTool } from './tools/unzip-search';
import { YouTubeTranscriptService } from './tools/YouTubeTranscriptService.ts';

// Mock the new unzipSearchTool directly
vi.mock('./tools/unzip-search', () => ({
  unzipSearchTool: vi.fn().mockResolvedValue('--- Found in mock ---\nMocked JS Search Result')
}));

// Mock YouTubeTranscriptService
vi.mock('./tools/YouTubeTranscriptService.ts', () => ({
  YouTubeTranscriptService: { getTranscript: vi.fn() }
}));

describe('Orchestrator Mission Logic', () => {
  beforeEach(() => {
    // 4. Smart fetch mock: handles completions, embeddings, and suggestions.
    vi.stubGlobal('fetch', vi.fn((url, options) => {
      const body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body || {};
      const content = body.messages?.[0]?.content || '';

      if (url.includes('embeddings') || body.model?.includes('embedding')) {
        return Promise.resolve({
          json: () => Promise.resolve({ data: [{ embedding: new Array(1536).fill(0.1) }] })
        });
      }

      if (content.includes('Senior QA Auditor')) {
        return Promise.resolve({
          json: () => Promise.resolve({ choices: [{ message: { content: "1. Use PascalCase\n2. Add logging" } }] })
        });
      }

      return Promise.resolve({
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: JSON.stringify({
                domain: "// Mocked Domain Logic",
                application: "// Mocked Application Service",
                infrastructure: "// Mocked Infrastructure Repository",
                ui: "export const MockComp = () => <div>Mocked UI</div>"
              })
            }
          }]
        })
      });
    }));
    
    // Ensure singletons are cleared so every test gets fresh mock instances.
    resetMemorySystems();
    fs.existsSync.mockReturnValue(false);
    fs.readdirSync.mockReturnValue([]);
    fs.readdirSync.mockReturnValue([]); // Mock for getVersionsHierarchy, etc.
  });

  
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should generate a mission plan and handle evolution history', async () => {
    vi.spyOn(orchestrator, 'storeMissionResult').mockResolvedValue();
    const objective = 'create new test objective';

    const result = await orchestrator.runMission({ sessionId: 'test-session', task: objective });
    
    expect(result).toHaveProperty('plan');
    // The runMission result structure is different now, it returns { status, content, plan, reflection }
    expect(result).toHaveProperty('status', 'SUCCESS');
    expect(result).toHaveProperty('plan', objective);
  });
describe('Self-Correction Loop', () => {
    it('should trigger remediation when Worf detects a mock secret', async () => {
      process.env.OPENROUTER_API_KEY = 'test-key';
      // Pattern: sk- followed by 48 alphanumeric characters
      const secretKey = 'sk-' + 'a'.repeat(48); 
      const objective = 'create new SecureDomain';
      
      // track generateComponentContent calls to simulate remediation on second call
      let generationCount = 0;
      
      vi.stubGlobal('fetch', vi.fn((url, options) => {
        const body = JSON.parse(options.body);
        
        // Handle Embeddings (recallMemory)
        if (url.includes('embeddings')) {
          return Promise.resolve({
            json: () => Promise.resolve({ data: [{ embedding: new Array(1536).fill(0.1) }] })
          });
        }

        // Handle Auditor call (auditPastMissions)
        if (body.messages?.[0]?.content.includes('Senior QA Auditor')) {
          return Promise.resolve({
            json: () => Promise.resolve({ choices: [{ message: { content: "Audit passed." } }] })
          });
        }

        // Handle Critic call (conductObservationLounge)
        if (body.messages?.[0]?.content.includes('System Critic')) {
          return Promise.resolve({
            json: () => Promise.resolve({
              choices: [{ message: { content: JSON.stringify({ score: 9, weaknesses: [], improvements: [], summary: "Safe" }) } }]
            })
          });
        }

        // Handle Developer calls (generateComponentContent)
        generationCount++;
        if (generationCount === 1) {
          // Return content WITH a secret to trigger worfSecurityScan failure
          return Promise.resolve({
            json: () => Promise.resolve({
              choices: [{
                message: {
                  content: JSON.stringify({
                    domain: `const key = "${secretKey}";`,
                    application: "// logic", infrastructure: "// repo", ui: "// component"
                  })
                }
              }]
            })
          });
        } else {
          // Return content WITHOUT a secret (Simulating successful remediation)
          return Promise.resolve({
            json: () => Promise.resolve({
              choices: [{
                message: {
                  content: JSON.stringify({
                    domain: `const key = process.env.API_KEY;`,
                    application: "// logic", infrastructure: "// repo", ui: "// component"
                  })
                }
              }]
            })
          });
        }
      }));

      // Use custom file mock implementations to simulate disk write/read
      const disk = {};
      fs.writeFileSync.mockImplementation((p, c) => { disk[p] = c; });
      fs.readFileSync.mockImplementation((p) => disk[p] || "");
      fs.existsSync.mockReturnValue(true);
      fs.lstatSync.mockReturnValue({ isFile: () => true });

      await orchestrator.runMission({ sessionId: 'remediation-test', task: objective });

      // Verify self-correction: should have called developer twice
      expect(generationCount).toBe(2); 
      const domainFile = Object.keys(disk).find(p => p.includes('model.js'));
      expect(disk[domainFile]).not.toContain(secretKey);
      expect(disk[domainFile]).toContain('process.env.API_KEY');
    });
  });
});


  describe('recallMemory', () => {
    it('should return past experiences when similar missions are found in Supabase', async () => {
      process.env.OPENROUTER_API_KEY = 'test-key';
      const mockMatches = [
        { content: 'Optimized DB queries' },
        { content: 'Implemented Redis locking' }
      ];
      mockSupabase.rpc.mockResolvedValueOnce({ data: mockMatches, error: null });

      const result = await orchestrator.recallMemory('database performance');
      
      expect(result).toContain('[Past Experience]: Optimized DB queries');
      expect(result).toContain('[Past Experience]: Implemented Redis locking');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('match_missions', expect.any(Object));
    });
  });

  describe('auditPastMissions', () => {
    it('should return technical suggestions when context is provided', async () => {
      process.env.OPENROUTER_API_KEY = 'test-key';
      const result = await orchestrator.auditPastMissions('test obj', 'test history', 'test memory');
      expect(result).toContain('Use PascalCase');
    });

    it('should return default message if no context data is found', async () => {
      const history = "No evolutionary data extracted.";
      const memory = "No relevant past memory found in Supabase.";
      const result = await orchestrator.auditPastMissions('obj', history, memory);
      expect(result).toBe("No specific QA suggestions based on history.");
    });
  });
  describe('Honor Guard Security Suite', () => {
    it('should detect and block native agent responses containing OpenRouter keys', async () => {
      process.env.USE_NATIVE_TS_AGENTS = 'true';
      process.env.OPENROUTER_API_KEY = 'test-key';
      const secretKey = 'sk-or-v1-' + 'a'.repeat(48);
      
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: `Critical Error: Authorization header required for ${secretKey}` } }]
        })
      }));

      await expect(orchestrator.invokeNativeTsAgent({
        persona: 'commander_data',
        objective: 'Test secret detection'
      })).rejects.toThrow(/DISHONOURABLE leakage detected: OpenRouter\/OpenAI Key/);
    });

    it('should detect and block native agent responses containing generic secrets', async () => {
      process.env.USE_NATIVE_TS_AGENTS = 'true';
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Config updated: secret="master_password_over_12_chars"' } }]
        })
      }));

      await expect(orchestrator.invokeNativeTsAgent({
        persona: 'geordi_la_forge',
        objective: 'Test generic secret detection'
      })).rejects.toThrow(/DISHONOURABLE leakage detected: Generic Secret/);
    });

    it('should detect and block Python agent responses containing secrets (parity check)', async () => {
      process.env.USE_NATIVE_TS_AGENTS = 'false';
      const secretKey = 'sk-or-v1-' + 'a'.repeat(48);
      
      mockSpawn.mockReturnValueOnce({
        stdin: { write: vi.fn(), end: vi.fn() },
        stdout: { on: vi.fn((event, cb) => { if (event === 'data') cb(Buffer.from(`Error: ${secretKey}`)); }) },
        stderr: { on: vi.fn() },
        on: vi.fn((event, cb) => { if (event === 'close') setTimeout(() => cb(0), 10); }),
        kill: vi.fn()
      });

      await expect(orchestrator.invokeCrewAgent({
        persona: 'commander_data',
        objective: 'Test Python secret detection'
      })).rejects.toThrow(/Lt. Worf: Python agent output from commander_data rejected. DISHONOURABLE leakage detected: OpenRouter\/OpenAI Key/);
    });

    it('should detect and block UnzipSearchTool responses containing secrets (parity check)', async () => {
      const secretKey = 'sk-or-v1-' + 'a'.repeat(48);
      unzipSearchTool.mockResolvedValueOnce(`// Found secret: ${secretKey}`);

      await expect(orchestrator.invokeUnzipSearchTool({
        path: '/test',
        function_name: 'testFunc'
      })).rejects.toThrow(/Lt. Worf: UnzipSearchTool output rejected. DISHONOURABLE leakage detected: OpenRouter\/OpenAI Key/);
    });

    it('should detect and block YouTube transcript responses containing secrets (parity check)', async () => {
      const secretKey = 'sk-or-v1-' + 'a'.repeat(48);
      vi.mocked(YouTubeTranscriptService.getTranscript).mockResolvedValueOnce({
        success: true,
        transcript: `Confidential: ${secretKey}`
      });

      await expect(orchestrator.invokeYoutubeTranscriptTool('https://youtube.com/watch?v=123'))
        .rejects.toThrow(/Lt. Worf: YouTube transcript rejected. DISHONOURABLE leakage detected: OpenRouter\/OpenAI Key/);
    });
  });

  describe('Logic Comparison Suite (TS vs Python Parity)', () => {
    const objective = 'Decompose a mission for a new project';

    it('should produce structured JSON task lists that match the legacy Python schema', async () => {
      process.env.USE_NATIVE_TS_AGENTS = 'true';
      
      const mockSchema = [
        { persona: "commander_data", task: "Architect the solution" },
        { persona: "geordi_la_forge", task: "Implement core logic" }
      ];

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: JSON.stringify(mockSchema) } }]
        })
      }));

      const result = await orchestrator.invokeNativeTsAgent({
        persona: 'captain_picard',
        objective: objective
      });

      const parsed = JSON.parse(result);
      expect(Array.isArray(parsed)).toBe(true);
      parsed.forEach(item => {
        expect(item).toHaveProperty('persona');
        expect(item).toHaveProperty('task');
      });
    });

    it('should return valid DDD component blocks consistent with Python tool output', async () => {
      const result = await orchestrator.runMission({ 
        sessionId: 'parity-test', 
        task: 'scaffold ads domain' 
      });

      // Status parity
      expect(result.status).toBe('SUCCESS');
      
      // Structural parity: Ensure all 4 DDD layers are represented in the consolidated output
      const consolidatedText = result.content[0].text;
      expect(consolidatedText).toMatch(/Domain/i);
      expect(consolidatedText).toMatch(/Application/i);
      expect(consolidatedText).toMatch(/Infrastructure/i);
      expect(consolidatedText).toMatch(/UI/i);
    });
  });
