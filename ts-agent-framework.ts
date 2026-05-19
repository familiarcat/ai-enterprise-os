/// <reference types="node" />

/**
 * ts-agent-framework.ts
 * Core engine for native TypeScript agents in the Sovereign Factory.
 */

export interface AgentOptions {
  objective: string;
  persona: string;
  context?: string;
  model: string;
  metadata?: any;
  system_prompt?: string;
  stateStore?: SynchronizedStateStore;
}

/**
 * Synchronized State Store
 * Allows agents to share tool outputs and derived data in real-time.
 */
export class SynchronizedStateStore {
  private state: Record<string, Array<{ version: number; timestamp: string; data: any }>> = {};
  private totalCost: number = 0;

  addCost(cost: number): void {
    this.totalCost += cost;
  }

  getTotalCost(): number {
    return this.totalCost;
  }

  set(key: string, value: any): void {
    if (!this.state[key]) this.state[key] = [];
    this.state[key].push({
      version: this.state[key].length + 1,
      timestamp: new Date().toISOString(),
      data: value
    });
  }

  get(key: string, version?: number): any {
    const history = this.state[key];
    if (!history || history.length === 0) return undefined;
    if (version !== undefined) {
      return history.find(v => v.version === version)?.data;
    }
    return history[history.length - 1].data;
  }

  getRegistry(): Record<string, { version: number; timestamp: string }> {
    const registry: Record<string, any> = {};
    for (const key of Object.keys(this.state)) {
      const latest = this.state[key][this.state[key].length - 1];
      registry[key] = { version: latest.version, timestamp: latest.timestamp };
    }
    return registry;
  }

  getAll(): Record<string, any> {
    const snapshot: Record<string, any> = {};
    for (const key of Object.keys(this.state)) {
      snapshot[key] = this.get(key);
    }
    return snapshot;
  }

  /**
   * Returns the full version history of the state.
   */
  getHistory(): Record<string, Array<{ version: number; timestamp: string; data: any }>> {
    return { ...this.state };
  }
}

export interface HierarchicalMissionOptions {
  objective: string;
  manager_persona: string;
  crew: string[]; // List of persona handles
  project_context?: string;
  model_overrides?: Record<string, string>;
}

/**
 * Native implementation of the agentic loop.
 * Directly communicates with OpenRouter to fulfill mission objectives.
 */
export async function runNativeAgent(options: AgentOptions): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is missing for native agency.");

  // 1. Circuit Breaker Check: Trip if mission cost exceeds threshold
  const threshold = parseFloat(process.env.MISSION_COST_THRESHOLD_USD || "2.00");
  if (options.stateStore && options.stateStore.getTotalCost() >= threshold) {
    throw new Error(`Circuit Breaker: Mission paused. Cumulative cost $${options.stateStore.getTotalCost().toFixed(4)} exceeds limit of $${threshold}.`);
  }

  console.log(`[Agent] ${options.persona} is processing objective: ${options.objective.substring(0, 60)}...`);

  const messages: any[] = [
    {
      role: "system",
      content: options.system_prompt || `You are an agent in the Sovereign Factory crew. Role: ${options.persona}`
    }
  ];

  if (options.stateStore) {
    messages.push({
      role: "system",
      content: `STATE REGISTRY (Mission Context):\n${JSON.stringify(options.stateStore.getRegistry(), null, 2)}\n\nTo minimize token usage, only keys and metadata are provided. Use the 'query_state_store' tool to retrieve full content for a specific key.`
    });
  }

  if (options.context) {
    messages.push({
      role: "system",
      content: `Context and Memory:\n${options.context}`
    });
  }

  messages.push({
    role: "user",
    content: options.objective
  });

  const tools = [
    {
      type: "function",
      function: {
        name: "query_state_store",
        description: "Retrieve full data for a specific key from the synchronized state store registry.",
        parameters: {
          type: "object",
          properties: {
            key: { type: "string", description: "The state key to retrieve (e.g., 'commander_data')" },
            version: { type: "number", description: "Optional specific version to retrieve" }
          },
          required: ["key"]
        }
      }
    }
  ];

  for (let i = 0; i < 5; i++) {
    let response: any;
    
    // Tactical Retries for transient 503 errors
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.OPENROUTER_REFERER || "http://localhost:3000",
            "X-Title": "Sovereign Factory Native Agent"
          },
          body: JSON.stringify({ model: options.model, messages, tools, temperature: 0.7, max_tokens: 2000 }),
          signal: AbortSignal.timeout(120000)
        });

        if (response.status === 503) {
          console.warn(`[Agent] OpenRouter 503 encountered. Attempt ${attempt + 1}/3. Retrying...`);
          await new Promise(res => setTimeout(res, 1000 * (attempt + 1)));
          continue;
        }
        break;
      } catch (err: any) {
        if (attempt === 2) throw err;
        await new Promise(res => setTimeout(res, 1000 * (attempt + 1)));
      }
    }

    try {
      if (!response || !response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter Error: ${response?.status || 'Unknown'} - ${error}`);
      }

      const data = await response.json();

      // 2. Cumulative Cost Tracking: Calculate cost of this specific interaction
      if (data.usage && options.stateStore) {
        const pricingMap: Record<string, number> = {
          'anthropic/claude-3-opus': 15.00,
          'anthropic/claude-3-5-sonnet': 3.00,
          'anthropic/claude-3-haiku': 0.25,
          'openai/gpt-4o-mini': 0.15,
          'google/gemini-flash-1.5': 0.075,
          'google/gemini-pro-1.5': 3.50,
        };
        const costPerMillion = pricingMap[options.model] || 3.00;
        const callCost = (data.usage.total_tokens / 1_000_000) * costPerMillion;
        options.stateStore.addCost(callCost);
        console.log(`[Circuit Breaker] ${options.persona} usage: ${data.usage.total_tokens} tokens (~$${callCost.toFixed(6)}). Session total: $${options.stateStore.getTotalCost().toFixed(4)}`);
      }

      const message = data.choices?.[0]?.message;

      if (!message) throw new Error("Empty response from native agent LLM.");

      if (message.tool_calls && message.tool_calls.length > 0) {
        messages.push(message);
        for (const call of message.tool_calls) {
          if (call.function.name === 'query_state_store') {
            const args = JSON.parse(call.function.arguments);
            const result = options.stateStore ? options.stateStore.get(args.key, args.version) : { error: "No state store" };
            messages.push({
              role: "tool",
              tool_call_id: call.id,
              content: JSON.stringify(result ?? { error: "Key not found" })
            });
          }
        }
        continue; // Re-call the LLM with tool results
      }

      if (!message.content) throw new Error("Empty response content from native agent LLM.");
      return message.content;
    } catch (err: any) {
      console.error(`[Agent Failure] ${options.persona}: ${err.message}`);
      throw err;
    }
  }
  throw new Error("Max tool call iterations (5) reached in native agent loop.");
}

/**
 * Hierarchical Task Logic (Ported from crew_manager.py)
 * A manager persona decomposes the objective and orchestrates the crew.
 */
export async function runHierarchicalMission(options: HierarchicalMissionOptions): Promise<{ report: string; history: any }> {
  const stateStore = new SynchronizedStateStore();

  console.log(`[Hierarchical] Manager ${options.manager_persona} is assembling the crew for: ${options.objective.substring(0, 50)}...`);

  // 1. Decomposition Phase
  const decompositionPrompt = `Decompose this mission into tasks for: ${options.crew.join(', ')}. JSON array: [{"persona": "...", "task": "..."}]`;

  const planRaw = await runNativeAgent({
    objective: `${decompositionPrompt}\nMISSION: "${options.objective}"`,
    persona: options.manager_persona,
    model: options.model_overrides?.[options.manager_persona] || "anthropic/claude-3-opus",
    stateStore
  });

  let tasks = JSON.parse(planRaw.match(/\[.*\]/s)?.[0] || "[]");
  let cumulativeContext = options.project_context || "";
  const results: string[] = [];

  for (const step of tasks) {
    const stepResult = await runNativeAgent({
      objective: step.task,
      persona: step.persona,
      context: cumulativeContext,
      model: options.model_overrides?.[step.persona] || "anthropic/claude-3-5-sonnet",
      stateStore
    });
    results.push(`--- [${step.persona} Output] ---\n${stepResult}`);
    stateStore.set(step.persona, stepResult);
    cumulativeContext += `\n\nFindings from ${step.persona}:\n${stepResult}`;
  }

  const report = await runNativeAgent({
      objective: `Synthesize outputs into a final report for: "${options.objective}"\n\nCREW OUTPUTS:\n${results.join('\n\n')}`,
      persona: options.manager_persona,
      model: options.model_overrides?.[options.manager_persona] || "anthropic/claude-3-5-sonnet",
      stateStore
    });
  
    return {
      report,
      history: stateStore.getHistory()
    };
}