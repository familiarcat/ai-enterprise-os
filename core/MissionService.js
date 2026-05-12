/**
 * @generated_by SovereignFactory
 * @domain kernel
 * @layer application
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
    recallMemory, invokeCrewAgent, MODEL_CONFIG, CREW_PERSONAS, MISSION_PIPELINE, MISSION_PHASES, normalisePersonaKey,
    storeMissionResult, discernHumanNeed, discoverMcpTools, calculateTaskComplexity 
  } = orchestrator;

  // Normalize context from MCPContext interface
  const {
    sessionId, persona = 'captain_picard', task, memory = {}, constraints = [], metadata = {}
  } = context;

  const activePersonaKey = normalisePersonaKey(persona);
  const personaName = activePersonaKey.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  console.log(`[${personaName}] Session ${sessionId}: Engaging v11 execution loop for task: ${task.substring(0, 50)}...`);

  // 0a. STRATEGIC ARBITRAGE (Quark): Determine optimal model based on complexity
  const complexity = calculateTaskComplexity(task);
  let activeModel = metadata.modelTier || MODEL_CONFIG[activePersonaKey];
  
  if (complexity < 0.4 && !metadata.modelTier) {
    console.log(`[${CREW_PERSONAS.quark.role}] Low complexity detected (${complexity}). Routing to optimized tier: TIER_STRATEGIC`);
    activeModel = MODEL_CONFIG.TIER_STRATEGIC; // Map to Haiku/Flash
  }

  // 0. DISCOVERY PHASE (Autonomous Agency): Agent selects specialized tools based on task context
  console.log(`[Orchestrator] ${personaName} is instantiating autonomous agency and selecting specialized tools...`);
  const discovery = await discoverMcpTools(task, persona);
  const toolInsights = `\n[Agent Discovery Log]: Verified tools selected for this persona: ${discovery.registries_searched.join(', ')}.\nRecommendation: ${discovery.recommendation}\n`;

  // Strictly use normalized memory properties
  const contextWindow = (memory.longTerm?.join('\n\n') || await recallMemory(task, metadata.project)) + toolInsights;

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
        model: activeModel,
        constraints,
        metadata
      });

      // COLLABORATION PIPELINE: Iterate through specialized agencies for audit and validation
      let intentValidation = ''; // Maintain reference for final report
      for (const agency of MISSION_PIPELINE) {
        if (!agency.trigger(task)) continue;

        // Dynamic Selection: Map pipeline stage to MISSION_PHASES to select a persona from the pool
        const phaseMap = {
          'engineering_audit': 'SCAFFOLDING',
          'intent_validation': 'INTENT_ANALYSIS',
          'qa_critique': 'SECURITY_AUDIT'
        };
        const phaseKey = phaseMap[agency.id];
        const candidates = MISSION_PHASES[phaseKey] || [agency.persona];
        const selectedPersonaKey = candidates[0]; // Select the primary registered persona for the current phase

        const agencyPersona = CREW_PERSONAS[selectedPersonaKey];
        console.log(`[${agencyPersona.role}] Session ${sessionId}: Executing ${agency.label}...`);

        const feedback = await invokeCrewAgent({
          objective: agency.objective(executionResponse, task, constraints),
          persona: selectedPersonaKey,
          context: contextWindow,
          model: MODEL_CONFIG[selectedPersonaKey],
          metadata: { ...metadata, stage: agency.id }
        });

        if (agency.isScoring) reflectionResponse = feedback;
        else executionResponse += `\n\n--- [${agency.label}: ${selectedPersonaKey.toUpperCase()}] ---\n${feedback}`;

        if (agency.id === 'intent_validation') intentValidation = feedback;
      }

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
        const scoringPersona = MISSION_PIPELINE.find(a => a.isScoring)?.persona || 'lt_worf';
        const auditorName = scoringPersona.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        
        console.warn(`[${auditorName}] Score ${score} is unacceptable. Initiating self-correction loop...`);
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