/**
 * @generated_by SovereignFactory
 * @domain mission
 * @layer testing
 */

const { eventBus: getEventBus } = require('../core/memory.js'); // Renamed for clarity
const { initMissionSubscriber } = require('../apps/api/MissionSubscriber.js');

/**
 * Simulation Script to verify Event Bus communication
 * between MissionService (Emitter) and MissionSubscriber (Listener).
 */
async function simulateMissionLifecycle() {
  console.log('--- [Commander Data] Starting Mission Event Simulation ---');
  
  // 1. Initialize the Subscriber (Wire the listeners)
  initMissionSubscriber();

  const eventBus = getEventBus; // Now directly use the exported eventBus instance
  const mockMissionId = 'mission-' + Math.random().toString(36).substring(2, 9);

  // 2. Simulate mission creation
  console.log(`[Simulation] Emitting mission.created for ${mockMissionId}`);
  eventBus.emit('mission.created', {
    id: mockMissionId,
    project: 'sovereign-factory',
    objective: 'Simulated verification mission'
  });

  // 3. Simulate mission completion
  setTimeout(() => {
    console.log(`[Simulation] Emitting mission.completed for ${mockMissionId}`);
    eventBus.emit('mission.completed', { id: mockMissionId, result: 'SUCCESS' });
  }, 500);
}

simulateMissionLifecycle().catch(console.error);