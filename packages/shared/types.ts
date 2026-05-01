/**
 * Standardized MCP Context Envelope
 * Replaces loose mission parameters with a composable cognitive structure.
 */
export interface MCPContext {
  sessionId: string;
  persona: string;
  systemPrompt: string;
  objective: string;
  historicalContext: string; // From recallMemory()
  toolsAvailable: string[];
  constraints: string[];
  modelTier: string;
  metadata: Record<string, any>;
}