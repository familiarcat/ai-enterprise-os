/**
 * ToolRegistry: Unifies the MCP HTTP Bridge tools with the Orchestrator.
 * Governed by Lt. Worf.
 */
export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools = new Map<string, Function>();

  private constructor() {}

  public static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  register(name: string, toolFn: Function) {
    console.log(`[Lt. Worf] Tool Registered: ${name}`);
    this.tools.set(name, toolFn);
  }

  get(name: string) {
    return this.tools.get(name);
  }
}