/**
 * @generated_by SovereignFactory
 * @domain core
 * @layer application
 */

const MODEL_CONFIG = {
  TIER_ANALYSIS:   process.env.MODEL_ANALYST      || 'google/gemini-flash-1.5',
  TIER_STRATEGIC:  process.env.MODEL_ARCHITECT    || 'anthropic/claude-3-haiku',
  TIER_PRODUCTION: process.env.MODEL_DEVELOPER    || 'anthropic/claude-3-5-sonnet',
  TIER_CRITIQUE:   process.env.MODEL_QA_AUDITOR   || 'openai/gpt-4o-mini',
  TIER_EMBEDDING:  process.env.MODEL_EMBEDDING    || 'openai/text-embedding-3-small',

  // Handle-based mapping
  captain_picard:  process.env.MODEL_CAPTAIN      || 'anthropic/claude-3-opus',
  commander_riker: process.env.MODEL_DEVELOPER    || 'anthropic/claude-3-5-sonnet',
  commander_data:  process.env.MODEL_ARCHITECT    || 'anthropic/claude-3-5-sonnet',
  geordi_la_forge: process.env.MODEL_DEVELOPER    || 'anthropic/claude-3-5-sonnet',
  lt_worf:         process.env.MODEL_QA_AUDITOR   || 'openai/gpt-4o-mini',
  dr_crusher:      process.env.MODEL_ANALYST      || 'anthropic/claude-3-5-sonnet',
  counselor_troi:  process.env.MODEL_ANALYST      || 'anthropic/claude-3-haiku',
  quark:           process.env.MODEL_QA_AUDITOR   || 'openai/gpt-4o-mini',
  chief_obrien:    process.env.MODEL_QA_AUDITOR   || 'openai/gpt-4o-mini',
  lt_uhura:        process.env.MODEL_ANALYST      || 'google/gemini-pro-1.5',
  tasha_yar:       process.env.MODEL_ANALYST      || 'google/gemini-flash-1.5',
};

const CREW_PERSONAS = {
  captain_picard:    { role: 'Sovereign Crew Manager',     goal: 'Coordinate specialized agents, decompose missions, and authorize secure tool use based on strategic rationale.', model: MODEL_CONFIG.captain_picard, status: 'AVAILABLE', skills: ['strategic_coordination', 'mission_decomposition', 'diplomacy'] },
  commander_data:    { role: 'DDD Architect',               goal: 'Lead the Unified Language Initiative by validating structural decisions and enforcing DDD architectural constraints.', model: MODEL_CONFIG.commander_data, status: 'AVAILABLE', skills: ['ddd_architecture', 'data_normalization', 'logic_validation'] },
  commander_riker:   { role: 'Senior Full-Stack Developer', goal: 'Execute tactical implementations and assemble final packages with production-grade quality.', model: MODEL_CONFIG.commander_riker, status: 'AVAILABLE', skills: ['tactical_implementation', 'code_assembly', 'full_stack_development'] },
  geordi_la_forge:   { role: 'Senior Full-Stack Developer', goal: 'Identify structural weaknesses and prioritize porting legacy code to stabilize deployment containers.', model: MODEL_CONFIG.geordi_la_forge, status: 'AVAILABLE', skills: ['infrastructure_optimization', 'containerization', 'performance_tuning'] },
  chief_obrien:      { role: 'Senior Full-Stack Developer', goal: 'Manage transporters and system integrations, acting as a bridge between disparate services.', model: MODEL_CONFIG.chief_obrien, status: 'AVAILABLE', skills: ['system_integration', 'operations_management', 'transporter_logic'] },
  lt_worf:           { role: 'Senior QA Auditor',           goal: 'Audit all code and MCP tools for security, cross-referencing signatures with verified standards.', model: MODEL_CONFIG.lt_worf, status: 'AVAILABLE', skills: ['security_auditing', 'code_integrity', 'threat_detection'] },
  counselor_troi:    { role: 'Expert System Analyst',       goal: 'Interpret user intent and validate strategic empathy, budget headroom, and morale alignment.', model: MODEL_CONFIG.counselor_troi, status: 'AVAILABLE', skills: ['intent_analysis', 'ux_validation', 'empathy_mapping'] },
  dr_crusher:        { role: 'Expert System Analyst',       goal: 'Analyze system pulse, generate vital documentation, and prescribe corrective actions for code health.', model: MODEL_CONFIG.dr_crusher, status: 'AVAILABLE', skills: ['code_health_diagnostics', 'technical_documentation', 'corrective_action_planning'] },
  lt_uhura:          { role: 'Expert System Analyst',       goal: 'Ensure all communication frequencies are open and integrate real-time status updates across systems.', model: MODEL_CONFIG.lt_uhura, status: 'AVAILABLE', skills: ['signal_processing', 'cross_system_sync', 'real_time_communication'] },
  quark:             { role: 'Expert System Analyst',       goal: 'Maximize ROI and exploit arbitrage opportunities in model routing while adhering to the Rules of Acquisition.', model: MODEL_CONFIG.quark, status: 'AVAILABLE', skills: ['resource_arbitrage', 'roi_projection', 'cost_optimization'] },
  tasha_yar:         { role: 'Senior QA Auditor',           goal: 'Execute final combat diagnostics and smoke tests to ensure system readiness for engagement.', model: MODEL_CONFIG.tasha_yar, status: 'AVAILABLE', skills: ['tactical_verification', 'smoke_testing', 'combat_diagnostics'] },
};

function normalisePersonaKey(name) {
  if (!name) return 'captain_picard';
  return name.toLowerCase()
    .replace(/^(captain|commander|lieutenant|lt\.|lt|counselor|dr\.|dr|chief)\s+/, '')
    .replace(/[\s\-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

/**
 * MISSION_PIPELINE: Dynamic collaboration sequence for mission execution.
 * Defines which agents provide specialized audits, validations, or critiques.
 */
const MISSION_PIPELINE = [
  {
    id: 'engineering_audit',
    persona: 'geordi_la_forge',
    label: 'ENGINEERING AUDIT',
    trigger: (task) => ['docker', 'terraform', 'aws', 'infra', 'deployment', 'setup', 'config', 'ec2', 'lambda', 'ci/cd', 'github actions', 'fargate', 'ecs'].some(k => task.toLowerCase().includes(k)),
    objective: (res) => `Review the following implementation for structural weaknesses, container optimization, and secure deployment patterns: "${res}"`
  },
  {
    id: 'intent_validation',
    persona: 'counselor_troi',
    label: 'INTENT VALIDATION',
    trigger: () => true,
    objective: (res, task) => `Analyze if this response captures the 'intent' and 'empathy' of the original task: "${task}". Response:\n${res}`
  },
  {
    id: 'qa_critique',
    persona: 'lt_worf',
    label: 'QA CRITIQUE',
    trigger: () => true,
    isScoring: true,
    objective: (res, task, constraints) => `Critically evaluate the following output for the task: "${task}". Provide a quality score (1-10), identify technical weaknesses, and suggest specific improvements for the next iteration.\n\nOutput to evaluate:\n${res}\n\nHistorical Constraints:\n${constraints.join(', ')}`
  }
];

/**
 * MISSION_PHASES: Mapping of architectural stages to registered crew personas.
 * Allows agents to be dynamically selected based on the phase of the mission.
 */
const MISSION_PHASES = {
  SCAFFOLDING: ['commander_data', 'commander_riker', 'geordi_la_forge'],
  UNIT_TESTING: ['commander_riker', 'chief_obrien', 'tasha_yar'],
  SECURITY_AUDIT: ['lt_worf', 'tasha_yar'],
  INTENT_ANALYSIS: ['counselor_troi', 'captain_picard'],
  ROI_ANALYSIS: ['quark'],
  DOCUMENTATION: ['dr_crusher', 'lt_uhura']
};

module.exports = { 
  MODEL_CONFIG, 
  CREW_PERSONAS, 
  normalisePersonaKey,
  MISSION_PIPELINE,
  MISSION_PHASES
};