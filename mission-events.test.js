/**
 * @generated_by SovereignFactory
 * @domain mission
 * @layer testing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getEventBus } from '../../../apps/api/index.js';
import { initMissionSubscriber } from '../../../apps/api/MissionSubscriber.js';

// Mock external infrastructure clients to avoid real network calls during testing
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null })
  }))
}));

// Mock ioredis to prevent connection attempts in the kernel
vi.mock('ioredis', () => {
  return vi.fn().mockImplementation(() => ({ on: vi.fn(), ping: vi.fn().mockResolvedValue('PONG') }));
});

import * as MissionRepository from '../infrastructure/MissionRepository.js';

describe('Mission Domain Event Integrity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure subscriber is wired
    initMissionSubscriber();
    // Spy on the actual repository implementation to verify it's being used
    vi.spyOn(MissionRepository, 'saveMissionData');
  });

  it('should actualize mission.created events via the Event Bus', async () => {
    const eventBus = getEventBus();
    const mockId = 'mission-' + Math.random().toString(36).substring(2, 9);
    const missionData = {
      id: mockId,
      project: 'sovereign-factory',
      objective: 'Verify event bus actualization'
    };

    eventBus.emit('mission.created', missionData);

    // Wait for async event loop processing
    await new Promise(resolve => setTimeout(resolve, 50));

    // Verify the actual repository function was called
    expect(MissionRepository.saveMissionData).toHaveBeenCalledWith(
      // We check that it maps the event data to the expected initial status
      expect.objectContaining({
        id: mockId,
        status: 'pending'
      })
    );
  });

  it('should update persistence state on mission.completed', async () => {
    const eventBus = getEventBus();
    eventBus.emit('mission.completed', { id: 'test-id', result: 'Success' });

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(MissionRepository.saveMissionData).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed' })
    );
  });
});