import { vi } from 'vitest';

// Mock child_process spawn to prevent Python execution across all tests
vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    spawn: vi.fn(() => ({
      stdin: { 
        write: vi.fn(), 
        end: vi.fn() 
      },
      stdout: { on: vi.fn((event, cb) => {
        if (event === 'data') cb(Buffer.from('--- Found in mock ---\nMocked Result'));
      }) },
      stderr: { on: vi.fn() },
      on: vi.fn((event, cb) => {
        if (event === 'close') cb(0); // Simulate successful exit code
      }),
      kill: vi.fn(),
    })),
  };
});