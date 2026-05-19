import { MCPContext } from './context';
import { MCPClient } from '../services/MCPClient';

/**
 * The execution engine for the Sovereign Factory.
 * Properly constructs the MCPContext object before dispatching to the bridge.
 */
export async function executeAgentTask(
  client: MCPClient,
  persona: string, 
  task: string,
  metadata: Record<string, any> = {}
): Promise<any> {
  // Construct the full MCPContext envelope for semantic consistency
  const context: MCPContext = {
    sessionId: `vs-${Date.now()}`,
    systemPrompt: `You are ${persona}, coordinating a mission from the Sovereign VSCode Extension.`,
    task: task,
    memory: {
      shortTerm: [],
      longTerm: [] // Hydrated by the Orchestrator via recallMemory
    },
    tools: [],
    constraints: [],
    metadata: metadata
  };

  console.log(`[Captain Picard] Dispatching ${persona} mission via Bridge: ${context.task}`);

  // Dispatch to the bridge tool
  return client.executeTool('run_factory_mission', { context });
}