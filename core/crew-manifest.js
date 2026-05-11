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
  captain_picard:    { role: 'Sovereign Crew Manager',     goal: 'Coordinate specialized agents, decompose missions, and authorize secure tool use based on strategic rationale.', model: MODEL_CONFIG.captain_picard, status: 'AVAILABLE' },
  commander_data:    { role: 'DDD Architect',               goal: 'Lead the Unified Language Initiative by validating structural decisions and enforcing DDD architectural constraints.', model: MODEL_CONFIG.commander_data, status: 'AVAILABLE' },
  commander_riker:   { role: 'Senior Full-Stack Developer', goal: 'Execute tactical implementations and assemble final packages with production-grade quality.', model: MODEL_CONFIG.commander_riker, status: 'AVAILABLE' },
  geordi_la_forge:   { role: 'Senior Full-Stack Developer', goal: 'Identify structural weaknesses and prioritize porting legacy code to stabilize deployment containers.', model: MODEL_CONFIG.geordi_la_forge, status: 'AVAILABLE' },
  chief_obrien:      { role: 'Senior Full-Stack Developer', goal: 'Manage transporters and system integrations, acting as a bridge between disparate services.', model: MODEL_CONFIG.chief_obrien, status: 'AVAILABLE' },
  lt_worf:           { role: 'Senior QA Auditor',           goal: 'Audit all code and MCP tools for security, cross-referencing signatures with verified standards.', model: MODEL_CONFIG.lt_worf, status: 'AVAILABLE' },
  counselor_troi:    { role: 'Expert System Analyst',       goal: 'Interpret user intent and validate strategic empathy, budget headroom, and morale alignment.', model: MODEL_CONFIG.counselor_troi, status: 'AVAILABLE' },
  dr_crusher:        { role: 'Expert System Analyst',       goal: 'Analyze system pulse, generate vital documentation, and prescribe corrective actions for code health.', model: MODEL_CONFIG.dr_crusher, status: 'AVAILABLE' },
  lt_uhura:          { role: 'Expert System Analyst',       goal: 'Ensure all communication frequencies are open and integrate real-time status updates across systems.', model: MODEL_CONFIG.lt_uhura, status: 'AVAILABLE' },
  quark:             { role: 'Expert System Analyst',       goal: 'Maximize ROI and exploit arbitrage opportunities in model routing while adhering to the Rules of Acquisition.', model: MODEL_CONFIG.quark, status: 'AVAILABLE' },
  tasha_yar:         { role: 'Senior QA Auditor',           goal: 'Execute final combat diagnostics and smoke tests to ensure system readiness for engagement.', model: MODEL_CONFIG.tasha_yar, status: 'AVAILABLE' },
};

function normalisePersonaKey(name) {
  if (!name) return 'captain_picard';
  return name.toLowerCase()
    .replace(/^(captain|commander|lieutenant|lt\.|lt|counselor|dr\.|dr|chief)\s+/, '')
    .replace(/[\s\-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

module.exports = { MODEL_CONFIG, CREW_PERSONAS, normalisePersonaKey };