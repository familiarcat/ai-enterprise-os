import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as orchestrator from '../core/orchestrator';
import fs from 'fs';

vi.mock('fs');
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnThis(),
    })),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null })
  }))
}));
vi.mock('ioredis', () => ({
  default: vi.fn(() => ({
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
  }))
}));

describe('Orchestrator Mission Logic', () => {
  beforeEach(() => {
    // Mock global fetch to intercept OpenRouter API calls
    vi.stubGlobal('fetch', vi.fn());

    // Mock fs methods to prevent real file system interaction
    fs.existsSync.mockReturnValue(false);
    fs.readdirSync.mockReturnValue([]);
  });

  it('should generate a mission plan and handle evolution history', async () => {
    const storeSpy = vi.spyOn(orchestrator, 'storeMissionResult');

    // Set up the mock response for generateComponentContent
    const mockLLMResponse = {
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
    };

    fetch.mockResolvedValue({
      json: async () => mockLLMResponse,
    });

    const result = await runMission('.', 'create new test objective');
    
    expect(result).toHaveProperty('plan');
    expect(result).toHaveProperty('decision');
    expect(result).toHaveProperty('history');
    expect(typeof result.plan).toBe('string');
    // Verify that fetch was called (triggered by the 'create' keyword in objective)
    expect(fetch).toHaveBeenCalled();
  });
});