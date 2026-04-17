import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
    return {
      stdin: {
        write: vi.fn((data) => {
          const args = JSON.parse(data);
          let response = '--- Scanned Folders Tree ---\n└── root/';
          
          if (args.function_name === 'Setup') {
            response = '--- Found ---\nMocked Setup Documentation Content';
          } else if (args.function_name === 'init') {
            response = '--- Found ---\nMocked init script content';
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
  const RedisConstructor = vi.fn().mockImplementation(() => mockRedis);
  return RedisConstructor;
});
vi.mock('child_process', () => ({
  spawn: mockSpawn
}));

// 3. Import logic AFTER mocks are established to prevent leakage.
import * as orchestrator from './orchestrator';
import fs from 'fs';

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
    orchestrator.resetMemorySystems();
    fs.existsSync.mockReturnValue(false);
    fs.readdirSync.mockReturnValue([]);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should generate a mission plan and handle evolution history', async () => {
    vi.spyOn(orchestrator, 'storeMissionResult').mockResolvedValue();
    const objective = 'create new test objective';
    
    const result = await orchestrator.runMission('.', objective);
    
    expect(result).toHaveProperty('plan');
    expect(result).toHaveProperty('decision');
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

      await orchestrator.runMission('.', objective);

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
