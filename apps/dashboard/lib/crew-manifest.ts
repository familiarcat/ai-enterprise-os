/**
 * lib/crew-manifest.ts
 *
 * Single source of truth for all crew agent identities, model tiers,
 * memory scopes, and collaboration routing rules.
 *
 * Ported from openrouter-crew-platform/domains/shared/agent-orchestration/src/crew-manifest.ts
 * and merged with ai-enterprise-os/apps/api/mcp-http-bridge.mjs CREW_PERSONAS.
 *
 * No external workspace dependencies — standalone for this app.
 */

// ── Model tiers ───────────────────────────────────────────────────────────────

export type ModelTier = 'HAIKU' | 'SONNET' | 'OPUS' | 'GPT_4O' | 'GEMINI_1_5_PRO' | 'BUDGET' | 'STANDARD' | 'PREMIUM';

export const ModelTier = {
  HAIKU:          'HAIKU',
  SONNET:         'SONNET',
  OPUS:           'OPUS',
  GPT_4O:         'GPT_4O',
  GEMINI_1_5_PRO: 'GEMINI_1_5_PRO',
  BUDGET:         'BUDGET',
  STANDARD:       'STANDARD',
  PREMIUM:        'PREMIUM',
} as const;

// ── OpenRouter model ID map ───────────────────────────────────────────────────

export const MODEL_ID_MAP: Record<ModelTier, string> = {
  HAIKU:          'anthropic/claude-3-haiku',
  SONNET:         'anthropic/claude-3-5-sonnet',
  OPUS:           'anthropic/claude-3-opus',
  GPT_4O:         'openai/gpt-4o-mini',
  GEMINI_1_5_PRO: 'google/gemini-flash-1.5',
  BUDGET:         'anthropic/claude-3-haiku',
  STANDARD:       'anthropic/claude-3-5-sonnet',
  PREMIUM:        'anthropic/claude-3-opus',
};

export const MODEL_COST_LABEL: Record<ModelTier, string> = {
  HAIKU:          '$0.25/M',
  SONNET:         '$3/M',
  OPUS:           '$15/M',
  GPT_4O:         '$0.15/M',
  GEMINI_1_5_PRO: '$0.075/M',
  BUDGET:         '$0.25/M',
  STANDARD:       '$3/M',
  PREMIUM:        '$15/M',
};

// ── Memory layer numeric IDs ──────────────────────────────────────────────────

export const MemoryLayer = {
  EPISODIC:   1,
  SEMANTIC:   2,
  PROCEDURAL: 3,
  STRATEGIC:  4,
  CREW:       5,
} as const;

export type MemoryLayerId = typeof MemoryLayer[keyof typeof MemoryLayer];

// ── Agent capability tags ─────────────────────────────────────────────────────

export type AgentCapability =
  | 'planning'
  | 'coordination'
  | 'data-analysis'
  | 'infrastructure'
  | 'security'
  | 'content-generation'
  | 'cost-optimization'
  | 'business-logic'
  | 'devops'
  | 'communications';

// ── DDD roles (from ai-enterprise-os orchestrator) ────────────────────────────

export type DDDRole = 'ANALYST' | 'ARCHITECT' | 'DEVELOPER' | 'QA_AUDITOR' | 'CREW_MANAGER';

// ── Core agent definition ─────────────────────────────────────────────────────

export interface CrewAgent {
  handle:           string;
  displayName:      string;
  character:        string;
  role:             string;
  dddRole:          DDDRole;
  emoji:            string;
  preferredTier:    ModelTier;
  fallbackTier:     ModelTier;
  readLayers:       MemoryLayerId[];
  writeLayers:      MemoryLayerId[];
  capabilities:     AgentCapability[];
  mcpServer?:       string;
  workflowSlug?:    string;
  systemPromptPath?: string;
}

// ── The Crew ─────────────────────────────────────────────────────────────────

export const CREW: Record<string, CrewAgent> = {

  captain_picard: {
    handle:       'captain_picard',
    displayName:  'Captain Picard',
    character:    'Jean-Luc Picard',
    role:         'Architect & Mission Planner — decomposes high-level goals into agent task graphs',
    dddRole:      'CREW_MANAGER',
    emoji:        '🖖',
    preferredTier: ModelTier.OPUS,
    fallbackTier:  ModelTier.SONNET,
    readLayers:   [MemoryLayer.STRATEGIC, MemoryLayer.SEMANTIC, MemoryLayer.CREW],
    writeLayers:  [MemoryLayer.STRATEGIC, MemoryLayer.EPISODIC],
    capabilities: ['planning', 'coordination'],
    mcpServer:    'captain-picard-mcp',
    workflowSlug: 'crew-architect',
  },

  commander_riker: {
    handle:       'commander_riker',
    displayName:  'Commander Riker',
    character:    'William T. Riker',
    role:         'Execution Coordinator — sequences agent calls, manages retries and handoffs',
    dddRole:      'DEVELOPER',
    emoji:        '🎯',
    preferredTier: ModelTier.SONNET,
    fallbackTier:  ModelTier.HAIKU,
    readLayers:   [MemoryLayer.PROCEDURAL, MemoryLayer.EPISODIC, MemoryLayer.CREW],
    writeLayers:  [MemoryLayer.EPISODIC],
    capabilities: ['coordination'],
    mcpServer:    'commander-riker-mcp',
    workflowSlug: 'crew-coordinate',
  },

  commander_data: {
    handle:       'commander_data',
    displayName:  'Commander Data',
    character:    'Data',
    role:         'DDD Architect & Data Synthesis — processes structured data, validates domain models',
    dddRole:      'ARCHITECT',
    emoji:        '🤖',
    preferredTier: ModelTier.SONNET,
    fallbackTier:  ModelTier.HAIKU,
    readLayers:   [MemoryLayer.SEMANTIC, MemoryLayer.EPISODIC],
    writeLayers:  [MemoryLayer.SEMANTIC, MemoryLayer.EPISODIC],
    capabilities: ['data-analysis'],
    mcpServer:    'commander-data-mcp',
    workflowSlug: 'crew-analyze',
  },

  geordi_la_forge: {
    handle:       'geordi_la_forge',
    displayName:  'Geordi La Forge',
    character:    'Geordi La Forge',
    role:         'Infrastructure & Build — repairs TypeScript errors, manages build pipeline',
    dddRole:      'DEVELOPER',
    emoji:        '🛠️',
    preferredTier: ModelTier.HAIKU,
    fallbackTier:  ModelTier.HAIKU,
    readLayers:   [MemoryLayer.PROCEDURAL],
    writeLayers:  [MemoryLayer.PROCEDURAL, MemoryLayer.EPISODIC],
    capabilities: ['infrastructure', 'devops'],
    mcpServer:    'geordi-mcp',
    workflowSlug: 'crew-build',
  },

  worf: {
    handle:       'worf',
    displayName:  'Worf',
    character:    'Worf, Son of Mogh',
    role:         'QA Auditor & Security — validates outputs, enforces type safety, guards APIs',
    dddRole:      'QA_AUDITOR',
    emoji:        '🛡️',
    preferredTier: ModelTier.GPT_4O,
    fallbackTier:  ModelTier.HAIKU,
    readLayers:   [MemoryLayer.PROCEDURAL],
    writeLayers:  [MemoryLayer.EPISODIC],
    capabilities: ['security'],
    mcpServer:    'worf-mcp',
    workflowSlug: 'crew-validate',
  },

  crusher: {
    handle:       'crusher',
    displayName:  'Dr. Crusher',
    character:    'Beverly Crusher',
    role:         'UX & Content Generation — produces copy, UI text, and user-facing documents',
    dddRole:      'ANALYST',
    emoji:        '⚕️',
    preferredTier: ModelTier.SONNET,
    fallbackTier:  ModelTier.HAIKU,
    readLayers:   [MemoryLayer.SEMANTIC, MemoryLayer.STRATEGIC],
    writeLayers:  [MemoryLayer.EPISODIC],
    capabilities: ['content-generation'],
    mcpServer:    'crusher-mcp',
    workflowSlug: 'crew-generate',
  },

  counselor_troi: {
    handle:       'counselor_troi',
    displayName:  'Counselor Troi',
    character:    'Deanna Troi',
    role:         'Cost Optimization & Routing — monitors spend, selects model tiers, triggers throttling',
    dddRole:      'ANALYST',
    emoji:        '🧠',
    preferredTier: ModelTier.HAIKU,
    fallbackTier:  ModelTier.HAIKU,
    readLayers:   [MemoryLayer.STRATEGIC, MemoryLayer.EPISODIC],
    writeLayers:  [MemoryLayer.STRATEGIC],
    capabilities: ['cost-optimization'],
    mcpServer:    'troi-mcp',
    workflowSlug: 'crew-optimize',
  },

  quark: {
    handle:       'quark',
    displayName:  'Quark',
    character:    'Quark',
    role:         'Business Logic & Pricing — generates financial projections, validates $1.50 budget',
    dddRole:      'ANALYST',
    emoji:        '💼',
    preferredTier: ModelTier.GPT_4O,
    fallbackTier:  ModelTier.HAIKU,
    readLayers:   [MemoryLayer.STRATEGIC, MemoryLayer.EPISODIC],
    writeLayers:  [MemoryLayer.EPISODIC],
    capabilities: ['business-logic'],
    mcpServer:    'quark-mcp',
    workflowSlug: 'crew-finance',
  },

  chief_obrien: {
    handle:       'chief_obrien',
    displayName:  "Chief O'Brien",
    character:    "Miles O'Brien",
    role:         'DevOps & Deployment — manages Docker, AWS, n8n, Supabase migrations',
    dddRole:      'DEVELOPER',
    emoji:        '⚙️',
    preferredTier: ModelTier.GPT_4O,
    fallbackTier:  ModelTier.HAIKU,
    readLayers:   [MemoryLayer.PROCEDURAL],
    writeLayers:  [MemoryLayer.PROCEDURAL, MemoryLayer.EPISODIC],
    capabilities: ['devops', 'infrastructure'],
    mcpServer:    'obrien-mcp',
    workflowSlug: 'crew-deploy',
  },

  uhura: {
    handle:       'uhura',
    displayName:  'Lieutenant Uhura',
    character:    'Nyota Uhura',
    role:         'External Communications & Webhooks — sends n8n webhooks, posts notifications',
    dddRole:      'ANALYST',
    emoji:        '📡',
    preferredTier: ModelTier.GEMINI_1_5_PRO,
    fallbackTier:  ModelTier.HAIKU,
    readLayers:   [MemoryLayer.PROCEDURAL],
    writeLayers:  [MemoryLayer.EPISODIC],
    capabilities: ['communications'],
    mcpServer:    'uhura-mcp',
    workflowSlug: 'crew-notify',
  },

} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Complexity score (0–1) → appropriate ModelTier */
export function selectTierByComplexity(score: number): ModelTier {
  if (score < 0.3) return ModelTier.HAIKU;
  if (score < 0.7) return ModelTier.SONNET;
  return ModelTier.OPUS;
}

/** Estimate task complexity from a free-text description */
export function estimateComplexity(task: string): number {
  const words = task.trim().split(/\s+/).length;
  const hasCodeKeywords = /\b(refactor|architect|design|system|integrate|migrate|scaffold|DDD|domain)\b/i.test(task);
  const hasSimpleKeywords = /\b(list|show|get|fetch|check|status|ping|health)\b/i.test(task);

  if (hasSimpleKeywords) return 0.15;
  if (hasCodeKeywords)   return 0.75;
  if (words > 30)        return 0.7;
  if (words > 10)        return 0.45;
  return 0.3;
}

/** Select agents best suited for a given capability */
export function selectAgentsByCapability(
  capability: AgentCapability,
  budgetConstrained = false
): CrewAgent[] {
  return Object.values(CREW)
    .filter(a => a.capabilities.includes(capability))
    .sort((a, b) => {
      if (budgetConstrained) return tierRank(a.fallbackTier) - tierRank(b.fallbackTier);
      return tierRank(a.preferredTier) - tierRank(b.preferredTier);
    });
}

function tierRank(tier: ModelTier): number {
  const order: ModelTier[] = [
    ModelTier.HAIKU, ModelTier.BUDGET, ModelTier.GPT_4O,
    ModelTier.GEMINI_1_5_PRO, ModelTier.SONNET, ModelTier.STANDARD,
    ModelTier.OPUS, ModelTier.PREMIUM,
  ];
  return order.indexOf(tier);
}

// ── Mission flow ──────────────────────────────────────────────────────────────

export interface MissionStep {
  agent:       keyof typeof CREW;
  capability:  AgentCapability;
  description: string;
}

/** Canonical mission flow: DDD scaffolding / business generation */
export const MISSION_FLOW: MissionStep[] = [
  { agent: 'captain_picard',  capability: 'planning',           description: 'Decompose goal into task graph' },
  { agent: 'counselor_troi',  capability: 'cost-optimization',  description: 'Validate budget headroom' },
  { agent: 'commander_data',  capability: 'data-analysis',      description: 'Analyse domain + enrich context' },
  { agent: 'crusher',         capability: 'content-generation', description: 'Generate copy & documentation' },
  { agent: 'quark',           capability: 'business-logic',     description: 'Financial projections & ROI' },
  { agent: 'worf',            capability: 'security',           description: 'Validate outputs & security gate' },
  { agent: 'commander_riker', capability: 'coordination',       description: 'Assemble final package' },
  { agent: 'uhura',           capability: 'communications',     description: 'Notify via webhook on completion' },
];
