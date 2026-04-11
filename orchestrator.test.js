import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runMission } from '../core/orchestrator';
import fs from 'fs';

vi.mock('fs');

describe('Orchestrator Mission Logic', () => {
  beforeEach(() => {
    // Mock global fetch to intercept OpenRouter API calls
    vi.stubGlobal('fetch', vi.fn());

    // Mock fs methods to prevent real file system interaction
    fs.existsSync.mockReturnValue(false);
    fs.readdirSync.mockReturnValue([]);
  });

  it('should generate a mission plan and handle evolution history', async () => {
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