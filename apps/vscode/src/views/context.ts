/**
 * The foundational Context Envelope for the Sovereign Factory.
 * Ensures semantic consistency across all Star Trek personas.
 */
export interface MCPContext {
  sessionId: string;
  systemPrompt: string;
  task: string;
  memory: {
    shortTerm: string[];
    longTerm: string[]; // Vector-based retrieval results
  };
  tools: string[]; // Names of tools registered in ToolRegistry
  constraints: string[];
  metadata?: Record<string, any>;
}