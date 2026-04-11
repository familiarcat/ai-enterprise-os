#!/usr/bin/env bash
# =============================================================================
#  evolve-v11-crew.sh
#  v11 Universal AI System Evolution — openrouter-crew-platform
#  Scaffolds: memory / reflection / meta / observation / evaluation / visualization
#
#  Usage:
#    bash evolve-v11-crew.sh [OPTIONS]
#
#  Options:
#    --dry-run          Print what would happen, touch nothing
#    --yes              Skip confirmation prompts
#    --phase N          Run only phase N  (1-7, default: all)
#    --backup-dir DIR   Override backup location (default: .v11-backup-<ts>)
#    --help             Show this message
#
#  Phases:
#    1  Memory layer        (packages/crew-memory)
#    2  Reflection engine   (packages/crew-reflection)
#    3  Meta-orchestration  (packages/crew-captain)
#    4  Observation Lounge  (packages/crew-observation)
#    5  Evaluation system   (packages/crew-evaluation)
#    6  Visualization layer (packages/crew-visualization)
#    7  Wire-up             (turbo.json · pnpm-workspace · supabase migrations)
# =============================================================================
set -euo pipefail

# ── colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

log()  { printf "${GREEN}[v11]${RESET}  %s\n" "$*"; }
info() { printf "${CYAN}[info]${RESET} %s\n" "$*"; }
warn() { printf "${YELLOW}[warn]${RESET} %s\n" "$*"; }
err()  { printf "${RED}[err]${RESET}  %s\n" "$*" >&2; }
step() { printf "\n${BOLD}${CYAN}━━━  Phase %s: %s  ━━━${RESET}\n\n" "$1" "$2"; }
dry()  { printf "${YELLOW}[dry-run]${RESET} would: %s\n" "$*"; }

# ── defaults ──────────────────────────────────────────────────────────────────
DRY_RUN=false
AUTO_YES=false
ONLY_PHASE=""
TS=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=".v11-backup-${TS}"

# ── arg parsing ───────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)    DRY_RUN=true ;;
    --yes)        AUTO_YES=true ;;
    --phase)      ONLY_PHASE="$2"; shift ;;
    --backup-dir) BACKUP_DIR="$2"; shift ;;
    --help)
      sed -n '3,20p' "$0"
      exit 0 ;;
    *) err "Unknown flag: $1"; exit 1 ;;
  esac
  shift
done

# ── helpers ───────────────────────────────────────────────────────────────────
should_run_phase() {
  [[ -z "$ONLY_PHASE" || "$ONLY_PHASE" == "$1" ]]
}

confirm() {
  $AUTO_YES && return 0
  $DRY_RUN  && return 0
  printf "${YELLOW}%s [y/N] ${RESET}" "$1"
  read -r reply
  [[ "$reply" =~ ^[Yy]$ ]]
}

# Write a file (respects --dry-run, creates parent dirs)
write_file() {
  local path="$1"
  local content="$2"
  if $DRY_RUN; then
    dry "write $path"
    return 0
  fi
  mkdir -p "$(dirname "$path")"
  printf '%s' "$content" > "$path"
  log "  wrote $path"
}

# Make a directory (respects --dry-run)
make_dir() {
  if $DRY_RUN; then dry "mkdir -p $1"; return 0; fi
  mkdir -p "$1"
  log "  mkdir $1"
}

# Detect sed in-place flag (macOS vs Linux)
SED_INPLACE=(-i '')
uname -s | grep -qi linux && SED_INPLACE=(-i)

# ── pre-flight ────────────────────────────────────────────────────────────────
info "openrouter-crew-platform · v11 Crew Architecture Evolution"
info "Generated: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
info "Mode: $( $DRY_RUN && echo 'DRY-RUN (no files written)' || echo 'LIVE' )"
echo ""

# Verify we're at repo root
if [[ ! -f "pnpm-workspace.yaml" || ! -f "turbo.json" ]]; then
  err "Run this script from the repository root (where pnpm-workspace.yaml lives)."
  exit 1
fi

# Verify pnpm available
if ! command -v pnpm &>/dev/null; then
  err "pnpm not found. Install it: npm install -g pnpm"
  exit 1
fi

# ── backup ────────────────────────────────────────────────────────────────────
do_backup() {
  if $DRY_RUN; then dry "backup turbo.json pnpm-workspace.yaml → $BACKUP_DIR/"; return; fi
  mkdir -p "$BACKUP_DIR"
  cp turbo.json "$BACKUP_DIR/turbo.json.bak"         2>/dev/null || true
  cp pnpm-workspace.yaml "$BACKUP_DIR/pnpm-workspace.yaml.bak" 2>/dev/null || true
  [[ -d supabase/migrations ]] && cp -r supabase/migrations "$BACKUP_DIR/migrations.bak" 2>/dev/null || true
  log "Backed up config files → $BACKUP_DIR/"
}

confirm "This will scaffold v11 crew layers into your monorepo. Continue?" || { info "Aborted."; exit 0; }
do_backup

# =============================================================================
# PHASE 1 — Memory Layer
# =============================================================================
if should_run_phase 1; then
  step 1 "Memory Layer  (packages/crew-memory)"

  PKG="packages/crew-memory"
  make_dir "$PKG/src/episodic"
  make_dir "$PKG/src/semantic"
  make_dir "$PKG/src/procedural"
  make_dir "$PKG/src/store"

  # package.json
  write_file "$PKG/package.json" '{
  "name": "@openrouter-crew/crew-memory",
  "version": "0.1.0",
  "private": true,
  "description": "v11 persistent memory layer — episodic, semantic, procedural",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc --project tsconfig.json",
    "dev":   "tsc --project tsconfig.json --watch",
    "test":  "jest"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}'

  # tsconfig.json
  write_file "$PKG/tsconfig.json" '{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules"]
}'

  # types
  write_file "$PKG/src/types.ts" '// ─────────────────────────────────────────────
// v11 Memory Layer — Shared Types
// ─────────────────────────────────────────────
export type MemoryType = "episodic" | "semantic" | "procedural";

export interface BaseMemory {
  id: string;
  type: MemoryType;
  content: string;
  metadata: Record<string, unknown>;
  embedding?: number[];
  created_at: string;
  updated_at: string;
  retrieval_count: number;
}

/** Episodic: what happened during a task execution */
export interface EpisodicMemory extends BaseMemory {
  type: "episodic";
  task_id: string;
  mission_id?: string;
  agent_id: string;
  output: string;
  score: number;        // 1-10 reflection score
  success: boolean;
}

/** Semantic: knowledge and patterns extracted from experience */
export interface SemanticMemory extends BaseMemory {
  type: "semantic";
  domain: string;
  confidence: number;   // 0-1
  source_task_ids: string[];
}

/** Procedural: strategies and optimisations that worked */
export interface ProceduralMemory extends BaseMemory {
  type: "procedural";
  strategy_name: string;
  trigger_conditions: string[];
  success_rate: number; // 0-1
  last_used_at: string;
}

export interface MemoryQuery {
  type?: MemoryType;
  agent_id?: string;
  mission_id?: string;
  domain?: string;
  limit?: number;
  min_score?: number;
  semantic_search?: string;
}

export interface MemoryWriteResult {
  id: string;
  success: boolean;
  error?: string;
}
'

  # store/SupabaseMemoryStore.ts
  write_file "$PKG/src/store/SupabaseMemoryStore.ts" 'import { SupabaseClient } from "@supabase/supabase-js";
import type {
  BaseMemory, EpisodicMemory, SemanticMemory,
  ProceduralMemory, MemoryQuery, MemoryWriteResult
} from "../types";

/**
 * SupabaseMemoryStore
 * Central persistence layer for all three v11 memory types.
 * Table: crew_memories (id, type, content, metadata, embedding, ...)
 */
export class SupabaseMemoryStore {
  private client: SupabaseClient;
  private table = "crew_memories";

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  // ── write ────────────────────────────────────────────────────────
  async write(memory: Omit<BaseMemory, "id" | "created_at" | "updated_at" | "retrieval_count">): Promise<MemoryWriteResult> {
    const { data, error } = await this.client
      .from(this.table)
      .insert({
        ...memory,
        retrieval_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) return { id: "", success: false, error: error.message };
    return { id: (data as { id: string }).id, success: true };
  }

  // ── query ────────────────────────────────────────────────────────
  async query(q: MemoryQuery): Promise<BaseMemory[]> {
    let builder = this.client
      .from(this.table)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(q.limit ?? 20);

    if (q.type)       builder = builder.eq("type", q.type);
    if (q.agent_id)   builder = builder.eq("metadata->>agent_id", q.agent_id);
    if (q.mission_id) builder = builder.eq("metadata->>mission_id", q.mission_id);
    if (q.domain)     builder = builder.eq("metadata->>domain", q.domain);
    if (q.min_score)  builder = builder.gte("metadata->>score", q.min_score);

    const { data, error } = await builder;
    if (error) throw new Error(`Memory query failed: ${error.message}`);

    // bump retrieval counts
    const ids = (data ?? []).map((m: BaseMemory) => m.id);
    if (ids.length > 0) {
      await this.client.rpc("increment_retrieval_counts", { memory_ids: ids });
    }
    return (data ?? []) as BaseMemory[];
  }

  // ── typed getters ────────────────────────────────────────────────
  async getEpisodic(q: MemoryQuery = {}): Promise<EpisodicMemory[]> {
    return this.query({ ...q, type: "episodic" }) as Promise<EpisodicMemory[]>;
  }
  async getSemantic(q: MemoryQuery = {}): Promise<SemanticMemory[]> {
    return this.query({ ...q, type: "semantic" }) as Promise<SemanticMemory[]>;
  }
  async getProcedural(q: MemoryQuery = {}): Promise<ProceduralMemory[]> {
    return this.query({ ...q, type: "procedural" }) as Promise<ProceduralMemory[]>;
  }

  // ── delete ───────────────────────────────────────────────────────
  async delete(id: string): Promise<void> {
    const { error } = await this.client.from(this.table).delete().eq("id", id);
    if (error) throw new Error(`Memory delete failed: ${error.message}`);
  }

  // ── cleanup ──────────────────────────────────────────────────────
  async purgeOlderThan(days: number): Promise<number> {
    const cutoff = new Date(Date.now() - days * 86400_000).toISOString();
    const { count, error } = await this.client
      .from(this.table)
      .delete()
      .lt("created_at", cutoff)
      .select("id", { count: "exact", head: true });
    if (error) throw new Error(`Purge failed: ${error.message}`);
    return count ?? 0;
  }
}
'

  # index
  write_file "$PKG/src/index.ts" '// @openrouter-crew/crew-memory — v11 Memory Layer
export * from "./types";
export * from "./store/SupabaseMemoryStore";
export * from "./episodic/EpisodicRecorder";
export * from "./semantic/SemanticIndex";
export * from "./procedural/ProceduralLibrary";
'

  # EpisodicRecorder
  write_file "$PKG/src/episodic/EpisodicRecorder.ts" 'import { SupabaseMemoryStore } from "../store/SupabaseMemoryStore";
import type { EpisodicMemory, MemoryWriteResult } from "../types";

/** Records task executions as episodic memories after reflection */
export class EpisodicRecorder {
  constructor(private store: SupabaseMemoryStore) {}

  async record(params: {
    task_id: string;
    mission_id?: string;
    agent_id: string;
    output: string;
    score: number;
    success: boolean;
    metadata?: Record<string, unknown>;
  }): Promise<MemoryWriteResult> {
    const mem: Omit<EpisodicMemory, "id" | "created_at" | "updated_at" | "retrieval_count"> = {
      type: "episodic",
      content: params.output,
      task_id: params.task_id,
      mission_id: params.mission_id,
      agent_id: params.agent_id,
      output: params.output,
      score: params.score,
      success: params.success,
      metadata: {
        agent_id: params.agent_id,
        mission_id: params.mission_id ?? null,
        score: params.score,
        ...params.metadata,
      },
    };
    return this.store.write(mem);
  }

  /** Retrieve top-N successful episodes for an agent */
  async bestEpisodes(agent_id: string, limit = 5): Promise<EpisodicMemory[]> {
    return this.store.getEpisodic({ agent_id, min_score: 7, limit });
  }
}
'

  # SemanticIndex
  write_file "$PKG/src/semantic/SemanticIndex.ts" 'import { SupabaseMemoryStore } from "../store/SupabaseMemoryStore";
import type { SemanticMemory, MemoryWriteResult } from "../types";

/** Stores extracted knowledge and patterns in semantic memory */
export class SemanticIndex {
  constructor(private store: SupabaseMemoryStore) {}

  async store_knowledge(params: {
    domain: string;
    content: string;
    confidence: number;
    source_task_ids?: string[];
    metadata?: Record<string, unknown>;
  }): Promise<MemoryWriteResult> {
    const mem: Omit<SemanticMemory, "id" | "created_at" | "updated_at" | "retrieval_count"> = {
      type: "semantic",
      content: params.content,
      domain: params.domain,
      confidence: params.confidence,
      source_task_ids: params.source_task_ids ?? [],
      metadata: {
        domain: params.domain,
        confidence: params.confidence,
        ...params.metadata,
      },
    };
    return this.store.write(mem);
  }

  async byDomain(domain: string, limit = 10): Promise<SemanticMemory[]> {
    return this.store.getSemantic({ domain, limit });
  }
}
'

  # ProceduralLibrary
  write_file "$PKG/src/procedural/ProceduralLibrary.ts" 'import { SupabaseMemoryStore } from "../store/SupabaseMemoryStore";
import type { ProceduralMemory, MemoryWriteResult } from "../types";

/** Stores reusable strategies that have proven effective */
export class ProceduralLibrary {
  constructor(private store: SupabaseMemoryStore) {}

  async register(params: {
    strategy_name: string;
    content: string;
    trigger_conditions: string[];
    success_rate?: number;
    metadata?: Record<string, unknown>;
  }): Promise<MemoryWriteResult> {
    const mem: Omit<ProceduralMemory, "id" | "created_at" | "updated_at" | "retrieval_count"> = {
      type: "procedural",
      content: params.content,
      strategy_name: params.strategy_name,
      trigger_conditions: params.trigger_conditions,
      success_rate: params.success_rate ?? 0,
      last_used_at: new Date().toISOString(),
      metadata: {
        strategy_name: params.strategy_name,
        success_rate: params.success_rate ?? 0,
        ...params.metadata,
      },
    };
    return this.store.write(mem);
  }

  async bestStrategies(limit = 5): Promise<ProceduralMemory[]> {
    const all = await this.store.getProcedural({ limit: 50 });
    return all
      .sort((a, b) => b.success_rate - a.success_rate)
      .slice(0, limit);
  }
}
'

  log "Phase 1 complete — crew-memory package scaffolded."
fi

# =============================================================================
# PHASE 2 — Reflection Engine
# =============================================================================
if should_run_phase 2; then
  step 2 "Reflection Engine  (packages/crew-reflection)"

  PKG="packages/crew-reflection"
  make_dir "$PKG/src"

  write_file "$PKG/package.json" '{
  "name": "@openrouter-crew/crew-reflection",
  "version": "0.1.0",
  "private": true,
  "description": "v11 reflection engine — score, critique, improve, store",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc --project tsconfig.json",
    "dev":   "tsc --project tsconfig.json --watch",
    "test":  "jest"
  },
  "dependencies": {
    "@openrouter-crew/crew-memory": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}'

  write_file "$PKG/tsconfig.json" '{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules"]
}'

  write_file "$PKG/src/types.ts" '// v11 Reflection Engine — Types
export interface ReflectionInput {
  task_id: string;
  agent_id: string;
  mission_id?: string;
  original_prompt: string;
  raw_output: string;
  context?: Record<string, unknown>;
}

export interface ReflectionOutput {
  score: number;            // 1-10
  weaknesses: string[];
  improvements: string[];
  revised_output: string;
  memory_written: boolean;
  insights: string[];
}

export interface ReflectionCycle {
  input: ReflectionInput;
  output: ReflectionOutput;
  completed_at: string;
  duration_ms: number;
}
'

  write_file "$PKG/src/ReflectionEngine.ts" 'import type { ReflectionInput, ReflectionOutput, ReflectionCycle } from "./types";
import type { EpisodicRecorder } from "@openrouter-crew/crew-memory";

/**
 * ReflectionEngine — v11 mandatory reflection loop
 *
 * Every agent output MUST pass through this engine before being
 * returned to the caller or stored. No output without reflection.
 *
 * Loop: Output → Critique → Improve → Store
 */
export class ReflectionEngine {
  private recorder: EpisodicRecorder;
  private callReflectionLLM: (prompt: string) => Promise<string>;

  constructor(params: {
    recorder: EpisodicRecorder;
    /** Inject your OpenRouter/Claude call here */
    callReflectionLLM: (prompt: string) => Promise<string>;
  }) {
    this.recorder = params.recorder;
    this.callReflectionLLM = params.callReflectionLLM;
  }

  async reflect(input: ReflectionInput): Promise<ReflectionCycle> {
    const start = Date.now();

    const prompt = this._buildReflectionPrompt(input);
    const raw = await this.callReflectionLLM(prompt);
    const output = this._parseReflectionResponse(raw);

    // Record to episodic memory — mandatory
    const { success } = await this.recorder.record({
      task_id:    input.task_id,
      mission_id: input.mission_id,
      agent_id:   input.agent_id,
      output:     output.revised_output,
      score:      output.score,
      success:    output.score >= 6,
      metadata: {
        weaknesses:   output.weaknesses,
        improvements: output.improvements,
        insights:     output.insights,
      },
    });

    output.memory_written = success;

    return {
      input,
      output,
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - start,
    };
  }

  private _buildReflectionPrompt(input: ReflectionInput): string {
    return `You are a critical reflection engine in a v11 AI crew system.

ORIGINAL TASK:
${input.original_prompt}

AGENT OUTPUT TO EVALUATE:
${input.raw_output}

Perform mandatory reflection. Respond ONLY with valid JSON matching this schema:
{
  "score": <integer 1-10>,
  "weaknesses": ["<specific weakness>", ...],
  "improvements": ["<concrete improvement>", ...],
  "revised_output": "<improved version of the output>",
  "insights": ["<system-level learning>", ...]
}

Be brutally honest. Score below 7 if improvements are clearly possible.`;
  }

  private _parseReflectionResponse(raw: string): ReflectionOutput {
    try {
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned) as ReflectionOutput;
      // Validate required fields
      if (typeof parsed.score !== "number") throw new Error("missing score");
      return {
        score:          Math.max(1, Math.min(10, Math.round(parsed.score))),
        weaknesses:     Array.isArray(parsed.weaknesses)    ? parsed.weaknesses    : [],
        improvements:   Array.isArray(parsed.improvements)  ? parsed.improvements  : [],
        revised_output: parsed.revised_output ?? raw,
        insights:       Array.isArray(parsed.insights)      ? parsed.insights      : [],
        memory_written: false,
      };
    } catch {
      // Graceful degradation — reflection parsing failed, still store raw
      return {
        score: 5,
        weaknesses: ["Reflection parsing failed — raw output stored"],
        improvements: [],
        revised_output: raw,
        insights: [],
        memory_written: false,
      };
    }
  }
}
'

  write_file "$PKG/src/index.ts" '// @openrouter-crew/crew-reflection — v11 Reflection Engine
export * from "./types";
export * from "./ReflectionEngine";
'

  log "Phase 2 complete — crew-reflection package scaffolded."
fi

# =============================================================================
# PHASE 3 — Meta-Orchestration (Crew Captain)
# =============================================================================
if should_run_phase 3; then
  step 3 "Meta-Orchestration  (packages/crew-captain)"

  PKG="packages/crew-captain"
  make_dir "$PKG/src/routing"
  make_dir "$PKG/src/context"

  write_file "$PKG/package.json" '{
  "name": "@openrouter-crew/crew-captain",
  "version": "0.1.0",
  "private": true,
  "description": "v11 Crew Captain — meta-orchestration, task routing, agent selection",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc --project tsconfig.json",
    "dev":   "tsc --project tsconfig.json --watch",
    "test":  "jest"
  },
  "dependencies": {
    "@openrouter-crew/crew-memory":     "workspace:*",
    "@openrouter-crew/crew-reflection": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}'

  write_file "$PKG/tsconfig.json" '{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules"]
}'

  write_file "$PKG/src/types.ts" '// v11 Crew Captain — Types
export type AgentRole =
  | "researcher"
  | "analyst"
  | "writer"
  | "critic"
  | "planner"
  | "executor"
  | "observer";

export type TaskComplexity = "simple" | "medium" | "complex";

export interface AgentSpec {
  id: string;
  role: AgentRole;
  model: string;      // OpenRouter model string
  capabilities: string[];
  cost_per_1k: number;
}

export interface MissionContext {
  mission_id: string;
  mission_name: string;
  objective: string;
  budget_remaining_usd: number;
  prior_episodes?: import("@openrouter-crew/crew-memory").EpisodicMemory[];
  best_strategies?: import("@openrouter-crew/crew-memory").ProceduralMemory[];
}

export interface RoutedTask {
  task_id: string;
  mission_context: MissionContext;
  assigned_agent: AgentSpec;
  injected_context: string;
  estimated_cost_usd: number;
}

export interface CaptainDecision {
  routed_tasks: RoutedTask[];
  routing_rationale: string;
  total_estimated_cost_usd: number;
}
'

  write_file "$PKG/src/routing/TaskRouter.ts" 'import type { AgentSpec, TaskComplexity, RoutedTask, MissionContext } from "../types";

/** Complexity thresholds based on token count heuristic */
const COMPLEXITY_THRESHOLDS = { simple: 200, medium: 800 };

/** Default agent fleet — override via constructor */
const DEFAULT_AGENTS: AgentSpec[] = [
  { id: "haiku-researcher",  role: "researcher", model: "anthropic/claude-haiku-4-5-20251001", capabilities: ["search","summarise"],          cost_per_1k: 0.001 },
  { id: "sonnet-analyst",    role: "analyst",    model: "anthropic/claude-sonnet-4-6",          capabilities: ["analyse","reason","plan"],      cost_per_1k: 0.003 },
  { id: "sonnet-writer",     role: "writer",     model: "anthropic/claude-sonnet-4-6",          capabilities: ["write","format","structure"],   cost_per_1k: 0.003 },
  { id: "sonnet-critic",     role: "critic",     model: "anthropic/claude-sonnet-4-6",          capabilities: ["critique","reflect","score"],   cost_per_1k: 0.003 },
  { id: "opus-planner",      role: "planner",    model: "anthropic/claude-opus-4-6",            capabilities: ["plan","architect","strategize"],cost_per_1k: 0.015 },
];

export class TaskRouter {
  private agents: AgentSpec[];

  constructor(agents: AgentSpec[] = DEFAULT_AGENTS) {
    this.agents = agents;
  }

  detectComplexity(prompt: string): TaskComplexity {
    const words = prompt.split(/\s+/).length;
    if (words < COMPLEXITY_THRESHOLDS.simple) return "simple";
    if (words < COMPLEXITY_THRESHOLDS.medium) return "medium";
    return "complex";
  }

  selectAgent(role: AgentSpec["role"], complexity: TaskComplexity): AgentSpec {
    // Match role first; fall back to complexity-appropriate model
    const roleMatch = this.agents.find(a => a.role === role);
    if (roleMatch) return roleMatch;

    const fallback = this.agents.find(a =>
      complexity === "simple" ? a.cost_per_1k <= 0.001 :
      complexity === "complex" ? a.cost_per_1k >= 0.01  : true
    );
    return fallback ?? this.agents[0];
  }

  route(params: {
    task_id: string;
    prompt: string;
    role: AgentSpec["role"];
    mission_context: MissionContext;
    injected_context?: string;
  }): RoutedTask {
    const complexity = this.detectComplexity(params.prompt);
    const agent = this.selectAgent(params.role, complexity);
    const est_tokens = params.prompt.split(/\s+/).length * 1.3; // rough factor
    const estimated_cost_usd = (est_tokens / 1000) * agent.cost_per_1k;

    return {
      task_id:             params.task_id,
      mission_context:     params.mission_context,
      assigned_agent:      agent,
      injected_context:    params.injected_context ?? "",
      estimated_cost_usd,
    };
  }
}
'

  write_file "$PKG/src/context/ContextInjector.ts" 'import type {
  EpisodicMemory, SemanticMemory, ProceduralMemory
} from "@openrouter-crew/crew-memory";

/**
 * ContextInjector
 * Enriches agent prompts with relevant memories so no execution is stateless.
 */
export class ContextInjector {
  build(params: {
    base_prompt: string;
    episodic?:   EpisodicMemory[];
    semantic?:   SemanticMemory[];
    procedural?: ProceduralMemory[];
  }): string {
    const sections: string[] = [];

    if (params.episodic?.length) {
      const top = params.episodic.slice(0, 3);
      sections.push(
        "## Relevant Past Executions\n" +
        top.map(e => `- [Score ${e.score}/10] ${e.content.slice(0, 200)}`).join("\n")
      );
    }

    if (params.semantic?.length) {
      sections.push(
        "## Domain Knowledge\n" +
        params.semantic.slice(0, 3).map(s => `- ${s.content.slice(0, 200)}`).join("\n")
      );
    }

    if (params.procedural?.length) {
      const best = params.procedural[0];
      sections.push(
        `## Recommended Strategy: ${best.strategy_name}\n${best.content.slice(0, 300)}`
      );
    }

    if (sections.length === 0) return params.base_prompt;

    return [
      params.base_prompt,
      "\n---\n## Memory Context (injected by Crew Captain)\n",
      ...sections,
    ].join("\n");
  }
}
'

  write_file "$PKG/src/CrewCaptain.ts" 'import { TaskRouter } from "./routing/TaskRouter";
import { ContextInjector } from "./context/ContextInjector";
import type {
  AgentSpec, MissionContext, CaptainDecision, RoutedTask
} from "./types";
import type {
  SupabaseMemoryStore, EpisodicRecorder
} from "@openrouter-crew/crew-memory";
import { ReflectionEngine } from "@openrouter-crew/crew-reflection";

/**
 * CrewCaptain — Meta-Orchestrator (v11)
 *
 * Responsibilities:
 *   1. Accept a mission with N tasks
 *   2. Pull relevant memories for each task
 *   3. Route tasks to appropriate agents
 *   4. Inject memory context into prompts
 *   5. Enforce reflection on every output
 *   6. Share insights across the system
 */
export class CrewCaptain {
  private router: TaskRouter;
  private injector: ContextInjector;
  private memStore: SupabaseMemoryStore;
  private recorder: EpisodicRecorder;
  private reflection: ReflectionEngine;

  constructor(params: {
    memStore: SupabaseMemoryStore;
    recorder: EpisodicRecorder;
    reflection: ReflectionEngine;
    agents?: AgentSpec[];
  }) {
    this.memStore  = params.memStore;
    this.recorder  = params.recorder;
    this.reflection = params.reflection;
    this.router    = new TaskRouter(params.agents);
    this.injector  = new ContextInjector();
  }

  async orchestrate(params: {
    tasks: Array<{ id: string; prompt: string; role: AgentSpec["role"] }>;
    mission: MissionContext;
  }): Promise<CaptainDecision> {
    const routed: RoutedTask[] = [];
    let total_cost = 0;
    const rationale: string[] = [];

    for (const task of params.tasks) {
      // Pull memories for context
      const [episodic, semantic, procedural] = await Promise.all([
        this.memStore.getEpisodic({ agent_id: task.role, limit: 3, min_score: 6 }),
        this.memStore.getSemantic({ limit: 3 }),
        this.memStore.getProcedural({ limit: 2 }),
      ]);

      const enrichedPrompt = this.injector.build({
        base_prompt: task.prompt,
        episodic, semantic, procedural,
      });

      const routed_task = this.router.route({
        task_id:          task.id,
        prompt:           enrichedPrompt,
        role:             task.role,
        mission_context:  params.mission,
        injected_context: enrichedPrompt,
      });

      routed.push(routed_task);
      total_cost += routed_task.estimated_cost_usd;
      rationale.push(
        `Task "${task.id}" → ${routed_task.assigned_agent.role} ` +
        `(${routed_task.assigned_agent.model}) ` +
        `est. $${routed_task.estimated_cost_usd.toFixed(4)}`
      );
    }

    // Budget guard
    if (total_cost > params.mission.budget_remaining_usd) {
      throw new Error(
        `Estimated cost $${total_cost.toFixed(4)} exceeds ` +
        `remaining budget $${params.mission.budget_remaining_usd.toFixed(4)}`
      );
    }

    return {
      routed_tasks: routed,
      routing_rationale: rationale.join("\n"),
      total_estimated_cost_usd: total_cost,
    };
  }
}
'

  write_file "$PKG/src/index.ts" '// @openrouter-crew/crew-captain — v11 Meta-Orchestrator
export * from "./types";
export * from "./CrewCaptain";
export * from "./routing/TaskRouter";
export * from "./context/ContextInjector";
'

  log "Phase 3 complete — crew-captain package scaffolded."
fi

# =============================================================================
# PHASE 4 — Observation Lounge
# =============================================================================
if should_run_phase 4; then
  step 4 "Observation Lounge  (packages/crew-observation)"

  PKG="packages/crew-observation"
  make_dir "$PKG/src"

  write_file "$PKG/package.json" '{
  "name": "@openrouter-crew/crew-observation",
  "version": "0.1.0",
  "private": true,
  "description": "v11 Observation Lounge — post-task meta-learning and strategy updates",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc --project tsconfig.json",
    "dev":   "tsc --project tsconfig.json --watch",
    "test":  "jest"
  },
  "dependencies": {
    "@openrouter-crew/crew-memory":     "workspace:*",
    "@openrouter-crew/crew-reflection": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}'

  write_file "$PKG/tsconfig.json" '{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules"]
}'

  write_file "$PKG/src/types.ts" '// v11 Observation Lounge — Types
import type { ReflectionCycle } from "@openrouter-crew/crew-reflection";

export interface ObservationSession {
  session_id: string;
  mission_id: string;
  reflection_cycles: ReflectionCycle[];
  started_at: string;
  completed_at?: string;
}

export interface ObservationInsight {
  category: "success" | "failure" | "pattern" | "strategy";
  description: string;
  affected_agents: string[];
  confidence: number;     // 0-1
  action_taken: string;
}

export interface ObservationReport {
  session_id: string;
  mission_id: string;
  total_tasks: number;
  avg_score: number;
  success_rate: number;
  top_failures: string[];
  insights: ObservationInsight[];
  strategy_updates: string[];
  completed_at: string;
}
'

  write_file "$PKG/src/ObservationLounge.ts" 'import type { ObservationSession, ObservationReport, ObservationInsight } from "./types";
import type { ReflectionCycle } from "@openrouter-crew/crew-reflection";
import type { SemanticIndex, ProceduralLibrary } from "@openrouter-crew/crew-memory";

/**
 * ObservationLounge — v11 meta-learning hub
 *
 * After each mission, the Lounge:
 *   1. Analyses what worked and what failed
 *   2. Identifies cross-agent patterns
 *   3. Updates strategy library (procedural memory)
 *   4. Stores new domain knowledge (semantic memory)
 *   5. Emits a full ObservationReport
 */
export class ObservationLounge {
  private sessions = new Map<string, ObservationSession>();
  private semanticIndex: SemanticIndex;
  private proceduralLib: ProceduralLibrary;

  constructor(params: {
    semanticIndex:   SemanticIndex;
    proceduralLib:   ProceduralLibrary;
  }) {
    this.semanticIndex = params.semanticIndex;
    this.proceduralLib = params.proceduralLib;
  }

  openSession(mission_id: string): string {
    const session_id = `obs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.sessions.set(session_id, {
      session_id,
      mission_id,
      reflection_cycles: [],
      started_at: new Date().toISOString(),
    });
    return session_id;
  }

  addCycle(session_id: string, cycle: ReflectionCycle): void {
    const session = this.sessions.get(session_id);
    if (!session) throw new Error(`Unknown session: ${session_id}`);
    session.reflection_cycles.push(cycle);
  }

  async closeSession(session_id: string): Promise<ObservationReport> {
    const session = this.sessions.get(session_id);
    if (!session) throw new Error(`Unknown session: ${session_id}`);

    const cycles = session.reflection_cycles;
    const scores  = cycles.map(c => c.output.score);
    const avg_score    = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
    const success_rate = scores.filter(s => s >= 6).length / (scores.length || 1);

    // Aggregate failures
    const failures = cycles
      .filter(c => c.output.score < 6)
      .flatMap(c => c.output.weaknesses)
      .slice(0, 5);

    // Aggregate insights
    const all_insights = cycles.flatMap(c => c.output.insights);
    const insights: ObservationInsight[] = all_insights.slice(0, 10).map(desc => ({
      category: "pattern" as const,
      description: desc,
      affected_agents: [cycles[0]?.input.agent_id ?? "unknown"],
      confidence: 0.7,
      action_taken: "stored to semantic memory",
    }));

    // Strategy updates from high-scoring cycles
    const winners = cycles.filter(c => c.output.score >= 8);
    const strategy_updates: string[] = [];
    for (const w of winners) {
      const name = `strategy-${w.input.agent_id}-${w.input.task_id}`;
      await this.proceduralLib.register({
        strategy_name: name,
        content: w.output.revised_output.slice(0, 500),
        trigger_conditions: w.output.improvements,
        success_rate: w.output.score / 10,
      });
      strategy_updates.push(`Registered strategy: ${name}`);
    }

    // Store insights to semantic memory
    for (const insight of insights) {
      await this.semanticIndex.store_knowledge({
        domain: "observation-lounge",
        content: insight.description,
        confidence: insight.confidence,
        source_task_ids: cycles.map(c => c.input.task_id),
      });
    }

    session.completed_at = new Date().toISOString();
    this.sessions.delete(session_id);

    return {
      session_id,
      mission_id: session.mission_id,
      total_tasks: cycles.length,
      avg_score,
      success_rate,
      top_failures: failures,
      insights,
      strategy_updates,
      completed_at: session.completed_at,
    };
  }
}
'

  write_file "$PKG/src/index.ts" '// @openrouter-crew/crew-observation — v11 Observation Lounge
export * from "./types";
export * from "./ObservationLounge";
'

  log "Phase 4 complete — crew-observation package scaffolded."
fi

# =============================================================================
# PHASE 5 — Evaluation System
# =============================================================================
if should_run_phase 5; then
  step 5 "Evaluation System  (packages/crew-evaluation)"

  PKG="packages/crew-evaluation"
  make_dir "$PKG/src"

  write_file "$PKG/package.json" '{
  "name": "@openrouter-crew/crew-evaluation",
  "version": "0.1.0",
  "private": true,
  "description": "v11 evaluation system — multi-dimensional task scoring and benchmarking",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc --project tsconfig.json",
    "dev":   "tsc --project tsconfig.json --watch",
    "test":  "jest"
  },
  "dependencies": {
    "@openrouter-crew/crew-memory":      "workspace:*",
    "@openrouter-crew/crew-reflection":  "workspace:*",
    "@openrouter-crew/crew-observation": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}'

  write_file "$PKG/tsconfig.json" '{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules"]
}'

  write_file "$PKG/src/types.ts" '// v11 Evaluation System — Types
export interface EvaluationCriteria {
  name: string;
  weight: number;   // 0-1, all weights must sum to 1
  scorer: (output: string, context: Record<string, unknown>) => number; // returns 0-10
}

export interface EvaluationResult {
  task_id: string;
  agent_id: string;
  overall_score: number;
  dimension_scores: Record<string, number>;
  passed: boolean;         // score >= passing_threshold
  recommendations: string[];
  evaluated_at: string;
}

export interface BenchmarkRun {
  id: string;
  name: string;
  results: EvaluationResult[];
  avg_score: number;
  pass_rate: number;
  ran_at: string;
}
'

  write_file "$PKG/src/Evaluator.ts" 'import type { EvaluationCriteria, EvaluationResult } from "./types";

/** Default criteria set — override in constructor */
const DEFAULT_CRITERIA: EvaluationCriteria[] = [
  {
    name: "completeness",
    weight: 0.3,
    scorer: (output) => {
      const words = output.split(/\s+/).length;
      return Math.min(10, Math.round(words / 50)); // crude heuristic
    },
  },
  {
    name: "coherence",
    weight: 0.3,
    scorer: (output) => {
      // Check for structural markers as proxy for coherence
      const hasStructure = /\n/.test(output) ? 1 : 0;
      const hasPunctuation = /[.!?]/.test(output) ? 1 : 0;
      return (hasStructure + hasPunctuation) * 5;
    },
  },
  {
    name: "relevance",
    weight: 0.2,
    scorer: (_output, context) => {
      // Placeholder — replace with embedding similarity in production
      return context["relevance_hint"] as number ?? 7;
    },
  },
  {
    name: "cost_efficiency",
    weight: 0.2,
    scorer: (_output, context) => {
      const cost = context["cost_usd"] as number ?? 0;
      if (cost <= 0.01) return 10;
      if (cost <= 0.05) return 8;
      if (cost <= 0.10) return 6;
      return 4;
    },
  },
];

export class Evaluator {
  private criteria: EvaluationCriteria[];
  private passing_threshold: number;

  constructor(params?: {
    criteria?: EvaluationCriteria[];
    passing_threshold?: number;
  }) {
    this.criteria = params?.criteria ?? DEFAULT_CRITERIA;
    this.passing_threshold = params?.passing_threshold ?? 6;
  }

  evaluate(params: {
    task_id: string;
    agent_id: string;
    output: string;
    context?: Record<string, unknown>;
  }): EvaluationResult {
    const ctx = params.context ?? {};
    const dimension_scores: Record<string, number> = {};
    let weighted_sum = 0;
    const recommendations: string[] = [];

    for (const criterion of this.criteria) {
      const raw_score = criterion.scorer(params.output, ctx);
      const clamped = Math.max(0, Math.min(10, raw_score));
      dimension_scores[criterion.name] = clamped;
      weighted_sum += clamped * criterion.weight;

      if (clamped < 6) {
        recommendations.push(`Improve "${criterion.name}" (score: ${clamped}/10)`);
      }
    }

    const overall_score = Math.round(weighted_sum * 10) / 10;

    return {
      task_id:          params.task_id,
      agent_id:         params.agent_id,
      overall_score,
      dimension_scores,
      passed:           overall_score >= this.passing_threshold,
      recommendations,
      evaluated_at:     new Date().toISOString(),
    };
  }
}
'

  write_file "$PKG/src/index.ts" '// @openrouter-crew/crew-evaluation — v11 Evaluation System
export * from "./types";
export * from "./Evaluator";
'

  log "Phase 5 complete — crew-evaluation package scaffolded."
fi

# =============================================================================
# PHASE 6 — Visualization Layer
# =============================================================================
if should_run_phase 6; then
  step 6 "Visualization Layer  (packages/crew-visualization)"

  PKG="packages/crew-visualization"
  make_dir "$PKG/src/dashboard"
  make_dir "$PKG/src/api"

  write_file "$PKG/package.json" '{
  "name": "@openrouter-crew/crew-visualization",
  "version": "0.1.0",
  "private": true,
  "description": "v11 visualization layer — system health dashboard and insight renderer",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc --project tsconfig.json",
    "dev":   "tsc --project tsconfig.json --watch",
    "serve": "node dist/api/server.js",
    "test":  "jest"
  },
  "dependencies": {
    "@openrouter-crew/crew-memory":      "workspace:*",
    "@openrouter-crew/crew-evaluation":  "workspace:*",
    "@openrouter-crew/crew-observation": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}'

  write_file "$PKG/tsconfig.json" '{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules"]
}'

  write_file "$PKG/src/dashboard/SystemSnapshot.ts" 'import type { ObservationReport } from "@openrouter-crew/crew-observation";
import type { EvaluationResult } from "@openrouter-crew/crew-evaluation";
import type { BaseMemory } from "@openrouter-crew/crew-memory";

export interface SystemSnapshot {
  generated_at: string;
  memory_stats: {
    total_memories: number;
    episodic_count: number;
    semantic_count: number;
    procedural_count: number;
    avg_retrieval_count: number;
  };
  performance_stats: {
    avg_task_score: number;
    pass_rate: number;
    top_failing_dimensions: string[];
    recent_improvements: string[];
  };
  observation_summary: {
    total_sessions: number;
    avg_session_score: number;
    strategy_count: number;
    top_insights: string[];
  };
  cost_stats: {
    total_estimated_usd: number;
    avg_per_task_usd: number;
    budget_utilisation_pct: number;
  };
}

export function buildSnapshot(params: {
  memories:     BaseMemory[];
  evaluations:  EvaluationResult[];
  observations: ObservationReport[];
  budget_usd:   number;
}): SystemSnapshot {
  const { memories, evaluations, observations, budget_usd } = params;

  const episodic   = memories.filter(m => m.type === "episodic").length;
  const semantic   = memories.filter(m => m.type === "semantic").length;
  const procedural = memories.filter(m => m.type === "procedural").length;
  const avg_ret    = memories.reduce((s, m) => s + m.retrieval_count, 0) / (memories.length || 1);

  const scores     = evaluations.map(e => e.overall_score);
  const avg_score  = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
  const pass_rate  = evaluations.filter(e => e.passed).length / (evaluations.length || 1);

  const dim_failures = evaluations
    .flatMap(e => Object.entries(e.dimension_scores).filter(([, v]) => v < 6).map(([k]) => k));
  const failure_freq: Record<string, number> = {};
  dim_failures.forEach(d => { failure_freq[d] = (failure_freq[d] ?? 0) + 1; });
  const top_failing = Object.entries(failure_freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k);

  const improvements = evaluations.flatMap(e => e.recommendations).slice(0, 5);

  const obs_scores   = observations.map(o => o.avg_score);
  const avg_obs      = obs_scores.reduce((a, b) => a + b, 0) / (obs_scores.length || 1);
  const strategy_cnt = observations.reduce((s, o) => s + o.strategy_updates.length, 0);
  const top_insights = observations.flatMap(o => o.insights.map(i => i.description)).slice(0, 5);

  const total_cost   = evaluations.reduce((s, e) => s + (e.dimension_scores["cost_efficiency"] ?? 0), 0) * 0.01;
  const avg_cost     = total_cost / (evaluations.length || 1);
  const budget_util  = (total_cost / (budget_usd || 1)) * 100;

  return {
    generated_at: new Date().toISOString(),
    memory_stats: {
      total_memories: memories.length,
      episodic_count: episodic,
      semantic_count: semantic,
      procedural_count: procedural,
      avg_retrieval_count: Math.round(avg_ret * 10) / 10,
    },
    performance_stats: {
      avg_task_score: Math.round(avg_score * 10) / 10,
      pass_rate: Math.round(pass_rate * 1000) / 10,
      top_failing_dimensions: top_failing,
      recent_improvements: improvements,
    },
    observation_summary: {
      total_sessions: observations.length,
      avg_session_score: Math.round(avg_obs * 10) / 10,
      strategy_count: strategy_cnt,
      top_insights,
    },
    cost_stats: {
      total_estimated_usd: Math.round(total_cost * 10000) / 10000,
      avg_per_task_usd:    Math.round(avg_cost  * 10000) / 10000,
      budget_utilisation_pct: Math.round(budget_util * 10) / 10,
    },
  };
}
'

  write_file "$PKG/src/index.ts" '// @openrouter-crew/crew-visualization — v11 Visualization Layer
export * from "./dashboard/SystemSnapshot";
'

  log "Phase 6 complete — crew-visualization package scaffolded."
fi

# =============================================================================
# PHASE 7 — Wire-Up
# =============================================================================
if should_run_phase 7; then
  step 7 "Wire-Up  (turbo.json · pnpm-workspace · supabase migration)"

  # ── pnpm-workspace.yaml ──────────────────────────────────────────
  info "Patching pnpm-workspace.yaml ..."
  if $DRY_RUN; then
    dry "add packages/crew-* glob to pnpm-workspace.yaml"
  else
    # Only add if the glob isn't already there
    if ! grep -q "packages/crew-\*" pnpm-workspace.yaml 2>/dev/null; then
      # macOS-safe sed: append new line after last 'packages/' entry
      # Use a python one-liner as a portable cross-platform approach
      python3 - <<'PYEOF'
import re, sys

with open("pnpm-workspace.yaml", "r") as f:
    content = f.read()

addition = "  - 'packages/crew-*'\n"
if addition.strip() not in content:
    # Insert after last occurrence of a packages/ entry
    content = re.sub(
        r"(packages:.*\n(?:  - '.*'\n)*)",
        lambda m: m.group(0) + addition,
        content,
        count=1,
        flags=re.DOTALL
    )
    with open("pnpm-workspace.yaml", "w") as f:
        f.write(content)
    print("[v11]   patched pnpm-workspace.yaml")
else:
    print("[v11]   pnpm-workspace.yaml already contains crew-* glob")
PYEOF
    else
      log "  pnpm-workspace.yaml already contains crew-* glob — skipped."
    fi
  fi

  # ── turbo.json ───────────────────────────────────────────────────
  info "Patching turbo.json ..."
  if $DRY_RUN; then
    dry "add crew:snapshot and crew:observe tasks to turbo.json"
  else
    python3 - <<'PYEOF'
import json

with open("turbo.json", "r") as f:
    t = json.load(f)

tasks = t.setdefault("tasks", {})

added = False
if "crew:snapshot" not in tasks:
    tasks["crew:snapshot"] = {
        "dependsOn": ["build"],
        "outputs": ["dist/snapshot.json"]
    }
    added = True

if "crew:observe" not in tasks:
    tasks["crew:observe"] = {
        "dependsOn": ["build"],
        "cache": False
    }
    added = True

with open("turbo.json", "w") as f:
    json.dump(t, f, indent=2)
    f.write("\n")

if added:
    print("[v11]   patched turbo.json with crew:snapshot and crew:observe tasks")
else:
    print("[v11]   turbo.json already up to date")
PYEOF
  fi

  # ── Supabase Migration ───────────────────────────────────────────
  info "Creating Supabase migration ..."
  MIGRATION_DIR="supabase/migrations"
  MIGRATION_FILE="${MIGRATION_DIR}/$(date +%Y%m%d%H%M%S)_v11_crew_memory.sql"

  write_file "$MIGRATION_FILE" '-- =================================================================
-- v11 Crew Architecture — Memory Layer Migration
-- =================================================================

-- crew_memories: unified storage for episodic / semantic / procedural
CREATE TABLE IF NOT EXISTS crew_memories (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type             TEXT NOT NULL CHECK (type IN ('"'"'episodic'"'"', '"'"'semantic'"'"', '"'"'procedural'"'"')),
  content          TEXT NOT NULL,
  metadata         JSONB NOT NULL DEFAULT '"'"'{}'"'"',
  embedding        vector(1536),   -- pgvector; NULL until embedding is computed
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retrieval_count  INTEGER NOT NULL DEFAULT 0
);

-- Indexes
CREATE INDEX IF NOT EXISTS crew_memories_type_idx       ON crew_memories (type);
CREATE INDEX IF NOT EXISTS crew_memories_created_at_idx ON crew_memories (created_at DESC);
CREATE INDEX IF NOT EXISTS crew_memories_metadata_idx   ON crew_memories USING GIN (metadata);

-- RLS
ALTER TABLE crew_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY crew_memories_service_role ON crew_memories
  USING (auth.role() = '"'"'service_role'"'"');

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_crew_memory_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crew_memories_updated_at ON crew_memories;
CREATE TRIGGER crew_memories_updated_at
  BEFORE UPDATE ON crew_memories
  FOR EACH ROW EXECUTE FUNCTION update_crew_memory_timestamp();

-- RPC: bulk increment retrieval counts (called by SupabaseMemoryStore)
CREATE OR REPLACE FUNCTION increment_retrieval_counts(memory_ids UUID[])
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE crew_memories
  SET retrieval_count = retrieval_count + 1
  WHERE id = ANY(memory_ids);
END;
$$;

-- crew_observation_reports: stores ObservationReport snapshots
CREATE TABLE IF NOT EXISTS crew_observation_reports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       TEXT NOT NULL,
  mission_id       TEXT NOT NULL,
  report           JSONB NOT NULL,
  avg_score        NUMERIC(4,2),
  success_rate     NUMERIC(4,3),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS obs_reports_mission_idx ON crew_observation_reports (mission_id);
CREATE INDEX IF NOT EXISTS obs_reports_created_idx ON crew_observation_reports (created_at DESC);

-- crew_evaluation_results: stores per-task evaluation scores
CREATE TABLE IF NOT EXISTS crew_evaluation_results (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id          TEXT NOT NULL,
  agent_id         TEXT NOT NULL,
  overall_score    NUMERIC(4,2) NOT NULL,
  dimension_scores JSONB NOT NULL DEFAULT '"'"'{}'"'"',
  passed           BOOLEAN NOT NULL DEFAULT FALSE,
  recommendations  TEXT[] NOT NULL DEFAULT '"'"'{}'"'"',
  evaluated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS eval_results_task_idx    ON crew_evaluation_results (task_id);
CREATE INDEX IF NOT EXISTS eval_results_agent_idx   ON crew_evaluation_results (agent_id);
CREATE INDEX IF NOT EXISTS eval_results_score_idx   ON crew_evaluation_results (overall_score DESC);
'

  # ── Root README patch ─────────────────────────────────────────────
  info "Writing docs/V11_ARCHITECTURE.md ..."
  write_file "docs/V11_ARCHITECTURE.md" '# v11 Crew Architecture — System Overview

> Generated by evolve-v11-crew.sh

## Layer Map

| Package | Path | Responsibility |
|---|---|---|
| `@openrouter-crew/crew-memory` | `packages/crew-memory` | Episodic · Semantic · Procedural persistence |
| `@openrouter-crew/crew-reflection` | `packages/crew-reflection` | Output → Critique → Improve → Store loop |
| `@openrouter-crew/crew-captain` | `packages/crew-captain` | Meta-orchestration · Task routing · Context injection |
| `@openrouter-crew/crew-observation` | `packages/crew-observation` | Post-mission meta-learning · Strategy updates |
| `@openrouter-crew/crew-evaluation` | `packages/crew-evaluation` | Multi-dimensional task scoring |
| `@openrouter-crew/crew-visualization` | `packages/crew-visualization` | System snapshot dashboard |

## Execution Loop (v11 mandatory)

```
1. Understand    ← CrewCaptain.orchestrate()
2. Plan          ← TaskRouter.route()
3. Execute       ← Agent (via OpenRouter)
4. Evaluate      ← Evaluator.evaluate()
5. Reflect       ← ReflectionEngine.reflect()
6. Store memory  ← EpisodicRecorder.record()
7. Share         ← ObservationLounge.closeSession()
```

## Data Flow

```
Mission
  └─ CrewCaptain
       ├─ pulls EpisodicMemory / SemanticMemory / ProceduralMemory
       ├─ injects context via ContextInjector
       ├─ routes tasks via TaskRouter
       └─ per task:
            Agent executes
              └─ Evaluator.evaluate()
              └─ ReflectionEngine.reflect()
                   └─ EpisodicRecorder.record()  → Supabase crew_memories
              └─ ObservationLounge.addCycle()
       └─ ObservationLounge.closeSession()
            ├─ SemanticIndex.store_knowledge()
            ├─ ProceduralLibrary.register()
            └─ returns ObservationReport
```

## Supabase Tables

- `crew_memories` — unified memory store (all types)
- `crew_observation_reports` — session-level reports
- `crew_evaluation_results` — per-task scores

## Environment Variables Required

```bash
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENROUTER_API_KEY=...
```
'

  log "Phase 7 complete — wire-up done."
fi

# =============================================================================
# Summary
# =============================================================================
echo ""
printf "${BOLD}${GREEN}━━━  v11 Evolution Complete  ━━━${RESET}\n\n"

if $DRY_RUN; then
  warn "DRY-RUN — no files were written. Re-run without --dry-run to apply."
else
  printf "  Packages created:\n"
  for p in crew-memory crew-reflection crew-captain crew-observation crew-evaluation crew-visualization; do
    [[ -d "packages/$p" ]] && printf "    ${GREEN}✓${RESET}  packages/%s\n" "$p"
  done
  echo ""
  printf "  Next steps:\n"
  printf "    1.  ${CYAN}pnpm install${RESET}               — link new workspaces\n"
  printf "    2.  ${CYAN}pnpm build${RESET}                 — compile all packages\n"
  printf "    3.  ${CYAN}supabase db push${RESET}            — apply memory migration\n"
  printf "    4.  Wire CrewCaptain into your mission entrypoint\n"
  printf "    5.  Provide a callReflectionLLM callback to ReflectionEngine\n"
  printf "    6.  Read docs/V11_ARCHITECTURE.md for the full data-flow diagram\n"
  echo ""
  printf "  Backup: ${YELLOW}%s/${RESET}\n" "$BACKUP_DIR"
fi
echo ""
