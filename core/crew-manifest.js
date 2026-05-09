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
  captain_picard:    { role: 'Sovereign Crew Manager',     goal: 'Provide strategic direction and coordinate the crew toward mission success', model: MODEL_CONFIG.captain_picard },
  commander_data:    { role: 'DDD Architect',               goal: 'Validate structural decisions and enforce architectural constraints',        model: MODEL_CONFIG.commander_data },
  commander_riker:   { role: 'Senior Full-Stack Developer', goal: 'Implement mission-critical features with production quality',                model: MODEL_CONFIG.commander_riker },
  geordi_la_forge:   { role: 'Senior Full-Stack Developer', goal: 'Engineer robust systems and solve complex technical problems',               model: MODEL_CONFIG.geordi_la_forge },
  chief_obrien:      { role: 'Senior Full-Stack Developer', goal: 'Integrate components and ensure reliable implementation',                    model: MODEL_CONFIG.chief_obrien },
  lt_worf:           { role: 'Senior QA Auditor',           goal: 'Aggressively challenge every assumption and find failure modes',             model: MODEL_CONFIG.lt_worf },
  counselor_troi:    { role: 'Expert System Analyst',       goal: 'Interpret user intent and surface UX signal from data patterns',            model: MODEL_CONFIG.counselor_troi },
  dr_crusher:        { role: 'Expert System Analyst',       goal: 'Diagnose system health and prescribe corrective actions',                   model: MODEL_CONFIG.dr_crusher },
  lt_uhura:          { role: 'Expert System Analyst',       goal: 'Analyze communication patterns and cross-system integration signals',        model: MODEL_CONFIG.lt_uhura },
  quark:             { role: 'Expert System Analyst',       goal: 'Maximize ROI, minimize cost, exploit arbitrage opportunities in model routing', model: MODEL_CONFIG.quark },
};

function normalisePersonaKey(name) {
  if (!name) return 'captain_picard';
  return name.toLowerCase()
    .replace(/^(captain|commander|lieutenant|lt\.|lt|counselor|dr\.|dr|chief)\s+/, '')
    .replace(/[\s\-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

module.exports = { MODEL_CONFIG, CREW_PERSONAS, normalisePersonaKey };