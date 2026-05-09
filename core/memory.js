/**
 * @generated_by SovereignFactory
 * @domain kernel
 * @layer infrastructure
 */

const EventEmitter = require('events');
const Redis = require('ioredis');
const { createClient } = require('@supabase/supabase-js');

let _redis = null;
let _supabase = null;
const _eventBus = new EventEmitter();

/**
 * Resets the lazy-loaded memory systems.
 * Used primarily for unit testing isolation.
 */
function resetMemorySystems() {
  if (_redis) {
    try { _redis.quit(); } catch (e) {}
    _redis = null;
  }
  _supabase = null;
}

/**
 * Returns the shared memory system clients (Redis and Supabase).
 * Initializes them on first call using environment variables.
 */
function getMemorySystems() {
  if (!_redis) {
    const rawUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    const redisUrl = rawUrl.trim();
    
    const useTls = redisUrl.toLowerCase().includes('rediss://') || redisUrl.toLowerCase().includes('cache.amazonaws.com');
    const connectionString = redisUrl.includes('://') ? redisUrl : `${useTls ? 'rediss' : 'redis'}://${redisUrl}`;
    const redisOptions = useTls ? { tls: {} } : {};

    _redis = new Redis(connectionString, redisOptions);
    _redis.on('error', (err) => console.error('[Redis] Connection Error:', err.message));
  }
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_KEY || ''
    );
  }
  return { redis: _redis, supabase: _supabase };
}

/**
 * runMission: Core mission execution logic refactored for Composable Cognitive Infrastructure.
 * Utilizes the MCPContext interface for all agentic reasoning.
 *
 * @param {Object} context - Standardized MCPContext envelope.
 * @returns {Promise<Object>} Mission results and generated plan.
 */
async function runMission(context) {
  // Lazy-destructure required functions to ensure the orchestrator is fully loaded 
  // before these tools are invoked in the execution loop.
  const orchestrator = require('./orchestrator');
  const { 
    recallMemory, invokeCrewAgent, MODEL_CONFIG, storeMissionResult, discernHumanNeed, discoverMcpTools 
  } = orchestrator;

  // Normalize context from MCPContext interface
  const {
    sessionId, persona = 'captain_picard', task, memory = {}, constraints = [], metadata = {}
  } = context;

  console.log(`[Captain Picard] Session ${sessionId}: Engaging v11 execution loop for task: ${task.substring(0, 50)}...`);

  // 0. DISCOVERY PHASE (Autonomous Agency): Agent selects specialized tools based on task context
  console.log(`[Orchestrator] ${persona} is instantiating autonomous agency and selecting specialized tools...`);
  const discovery = await discoverMcpTools(task, persona);
  const toolInsights = `\n[Agent Discovery Log]: Verified tools selected for this persona: ${discovery.registries_searched.join(', ')}.\nRecommendation: ${discovery.recommendation}\n`;

  // Strictly use normalized memory properties
  const contextWindow = (memory.longTerm?.join('\n\n') || await recallMemory(task)) + toolInsights;

  try {
    let executionResponse = '';
    let reflectionResponse = '';
    let attempts = 0;
    const maxAttempts = 3;
    let passed = false;
    let currentTask = task;

    while (attempts < maxAttempts && !passed) {
      attempts++;
      console.log(`[Orchestrator] Attempt ${attempts}/${maxAttempts} for Session ${sessionId}...`);

      // 1. EXECUTION PHASE: Primary agent generates the result
      executionResponse = await invokeCrewAgent({
        objective: currentTask,
        persona,
        context: contextWindow,
        model: metadata.modelTier || MODEL_CONFIG[persona],
        constraints,
        metadata
      });

      // 1.5 INTENT VALIDATION (Counselor Troi): Validating strategic empathy and intent alignment
      console.log(`[Counselor Troi] Sensing intent alignment for Session ${sessionId}...`);
      const intentValidation = await invokeCrewAgent({
        objective: `Analyze if this response captures the 'intent' and 'empathy' of the original task: "${task}". Response:\n${executionResponse}`,
        persona: 'counselor_troi',
        context: contextWindow,
        model: MODEL_CONFIG.counselor_troi,
        metadata: { ...metadata, stage: 'intent_validation' }
      });

      // 2. REFLECTION PHASE (v11 Architecture): Auditor critiques the output
      console.log(`[Lt. Worf] Critically evaluating output for Session ${sessionId} (Attempt ${attempts})...`);
      reflectionResponse = await invokeCrewAgent({
        objective: `Critically evaluate the following output for the task: "${task}". Provide a quality score (1-10), identify technical weaknesses, and suggest specific improvements for the next iteration.`,
        persona: 'lt_worf',
        context: `Initial Output:\n${executionResponse}\n\nHistorical Constraints:\n${constraints.join(', ')}`,
        model: MODEL_CONFIG.lt_worf,
        metadata: { ...metadata, stage: 'reflection' }
      });

      // Parse score from Worf's reflection
      const scoreMatch = reflectionResponse.match(/score:\s*(\d+)/i);
      const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;

      // 2.1 DISCERNMENT PHASE (v11 "Hands-free" capability): Check for human intervention triggers
      const humanNeed = discernHumanNeed(reflectionResponse, score);
      if (humanNeed.required) {
        console.warn(`[Orchestrator] MISSION SUSPENDED: ${humanNeed.reason}`);
        return {
          status: 'HITL_REQUIRED',
          message: humanNeed.reason,
          content: [{ type: 'text', text: executionResponse }, { type: 'text', text: `\n\n[WORF CRITIQUE]: ${reflectionResponse}` }]
        };
      }

      if (score < 5 && attempts < maxAttempts) {
        console.warn(`[Lt. Worf] Score ${score} is unacceptable. Initiating self-correction loop...`);
        // Enrich the next task with the critique for iterative improvement
        currentTask = `The previous attempt failed evaluation with a score of ${score}/10. 
Feedback from Lt. Worf to address:
${reflectionResponse}

Re-implement the following task: "${task}"`;
      } else {
        passed = true;
      }
    }

    const finalPackage = {
      output: executionResponse,
      reflection: reflectionResponse,
      v11_compliant: true,
      attempts
    };

    // 3. STORAGE PHASE: Persist both execution and reflection for semantic memory
    await storeMissionResult(JSON.stringify(finalPackage), {
      ...metadata,
      sessionId,
      persona,
      task,
      timestamp: new Date().toISOString()
    });

    return {
      status: 'SUCCESS',
      content: [
        { type: 'text', text: `[Observation Lounge Session Consolidated Output]\n\n${executionResponse}` },
        { type: 'text', text: `\n\n--- [V11 REFLECTION: LT. WORF] ---\n${reflectionResponse}` },
        { type: 'text', text: `\n\n--- [INTENT ANALYSIS: COUNSELOR TROI] ---\n${intentValidation}` }
      ],
      plan: task,
      reflection: reflectionResponse
    };
  } catch (err) {
    console.error(`[Orchestrator] Mission failure: ${err.message}`);
    throw err;
  }
}

module.exports = { getMemorySystems, resetMemorySystems, eventBus: _eventBus, runMission };
