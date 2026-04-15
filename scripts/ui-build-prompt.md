# SOVEREIGN FACTORY — UI Build Dispatch Prompt
# 
# Usage: paste this entire file into a Claude Code chat session opened on
#        ~/Dev/ai-enterprise-os   OR   ~/Dev/openrouter-crew-platform
#
# This prompt drives Claude Code to build the unified UI from the implicit
# combination of both repos. Read CLAUDE.md first for full system context.
# ─────────────────────────────────────────────────────────────────────────────

You are working on the **Sovereign Factory** project — a self-building AI Enterprise OS backed by
two complementary GitHub repos:

- `~/Dev/ai-enterprise-os` — Node.js orchestrator + MCP HTTP bridge + Python CrewAI + DDD engine
- `~/Dev/openrouter-crew-platform` — Turbo/pnpm monorepo + Next.js alex-dashboard + n8n

**Read `~/Dev/ai-enterprise-os/CLAUDE.md` before doing anything else.** It contains the authoritative
system context, architecture, crew routing, phase plan, and known bugs (already fixed).

---

## YOUR GOAL

Build the **unified Sovereign Factory UI** by combining `apps/dashboard` (already scaffolded in
ai-enterprise-os) with components from `openrouter-crew-platform/apps/alex-dashboard`.

The result: a single Next.js 15 dashboard at `apps/dashboard/` that is production-ready for both
local dev (http://localhost:3000) and eventual Vercel deploy.

---

## PHASE 1 — VSCode Extension (HIGHEST PRIORITY)

The `apps/vscode/` directory is empty. Bootstrap it as a real VSCode extension.

### Step 1.1 — Scaffold the extension

Create these files in `apps/vscode/`:

**`package.json`** (extension manifest):
```json
{
  "name": "sovereign-factory",
  "displayName": "Sovereign Factory",
  "description": "AI Enterprise OS — Star Trek crew agents in your editor",
  "version": "0.1.0",
  "publisher": "familiarcat",
  "engines": { "vscode": "^1.85.0" },
  "categories": ["AI", "Other"],
  "activationEvents": ["onStartupFinished"],
  "main": "./dist/extension.js",
  "contributes": {
    "commands": [
      { "command": "sovereign.runMission", "title": "Sovereign: Run Factory Mission" },
      { "command": "sovereign.assignCrew", "title": "Sovereign: Assign Crew Member" },
      { "command": "sovereign.searchCode", "title": "Sovereign: Search Codebase" },
      { "command": "sovereign.scaffoldDomain", "title": "Sovereign: Scaffold DDD Domain" },
      { "command": "sovereign.healthCheck", "title": "Sovereign: Health Check" },
      { "command": "sovereign.gitOperation", "title": "Sovereign: Git Operation" },
      { "command": "sovereign.openDashboard", "title": "Sovereign: Open Dashboard" }
    ],
    "views": {
      "explorer": [
        { "id": "sovereignCrew", "name": "Sovereign Crew", "type": "webview" }
      ]
    },
    "menus": {
      "commandPalette": [
        { "command": "sovereign.runMission" },
        { "command": "sovereign.openDashboard" }
      ]
    }
  },
  "scripts": {
    "compile": "tsc -p tsconfig.json",
    "watch": "tsc -watch -p tsconfig.json",
    "package": "vsce package"
  },
  "devDependencies": {
    "@types/vscode": "^1.85.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0",
    "@vscode/vsce": "^2.24.0"
  }
}
```

**`src/services/MCPClient.ts`**:
- Connects to MCP bridge via EventSource SSE at `${MCP_BRIDGE_URL}/sse`
- Extracts `sessionId` from first SSE event
- Sends JSON-RPC tool calls via `POST /messages?sessionId=<id>`
- Exposes: `callTool(name: string, args: Record<string, unknown>): Promise<string>`
- MCP_BRIDGE_URL defaults to `http://localhost:3002` (read from workspace settings)

**`src/views/SovereignPanel.ts`**:
- Creates a WebView panel (`vscode.window.createWebviewPanel`)
- Renders the dashboard HTML (inline React bundle from `apps/dashboard/.next/`)
- Message bridge: WebView → extension via `panel.webview.onDidReceiveMessage`
- Message bridge: extension → WebView via `panel.webview.postMessage`

**`src/commands/runMission.ts`**:
- `vscode.window.showInputBox({ prompt: 'Enter mission objective' })`
- `vscode.window.showQuickPick(crewHandles)` for persona selection
- Call `MCPClient.callTool('run_factory_mission', { project, objective, persona })`
- Stream output into an Output Channel: `vscode.window.createOutputChannel('Sovereign Factory')`

**`src/extension.ts`** (main entry):
- `activate(context)`: register all 7 commands, init MCPClient, create status bar item
- Status bar: `$(rocket) Sovereign [persona] — [model tier]` (click → openDashboard)
- `deactivate()`: clean up SSE connection

**`tsconfig.json`**:
```json
{
  "compilerOptions": {
    "target": "ES2020", "module": "commonjs", "lib": ["ES2020"],
    "outDir": "dist", "rootDir": "src", "strict": true,
    "esModuleInterop": true, "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Step 1.2 — Wire MCP client to all 7 commands

Each command must:
1. Show a progress notification while the MCP tool runs
2. Display result in the Output Channel
3. On error: call `crew_fail` equivalent — show `vscode.window.showErrorMessage` with the
   crew persona responsible for that command's domain

Command → MCP Tool mapping:
- `runMission` → `run_factory_mission`
- `assignCrew` → `run_crew_agent`
- `searchCode` → `search_code`
- `scaffoldDomain` → `run_factory_mission` (with DDD scaffold objective)
- `healthCheck` → `health_check`
- `gitOperation` → `git_operation`
- `openDashboard` → opens WebView panel (no MCP call)

### Step 1.3 — Package

```bash
cd apps/vscode
npm install
npm run compile
npx vsce package
# → sovereign-factory-0.1.0.vsix
code --install-extension sovereign-factory-0.1.0.vsix
```

---

## PHASE 1B — Dashboard UI Enhancements (parallel with extension)

These are additive changes to `apps/dashboard/`. Do NOT break the existing 4-step flow.

### Enhancement 1 — BridgeStatusBar component

**File**: `apps/dashboard/components/BridgeStatusBar.tsx`

A persistent bar at the top of the page (above the step tabs) showing:
- Bridge status: `● ONLINE` (green) | `○ OFFLINE` (red) | `~ UNKNOWN` (yellow)
- Active sessions count (from `/health` response)
- Current model tier in use
- Refresh button (re-polls `/api/mcp/status`)

Poll `/api/mcp/status` every 10 seconds. Replace the current inline bridge status check in
`page.tsx` with this component.

### Enhancement 2 — CostAccumulator in page.tsx

The `AgentExecution.cost` field is estimated per agent but never summed.

Add to `page.tsx` state:
```typescript
const [sessionCost, setSessionCost] = useState<number>(0);
```

Accumulate cost as executions complete. Display formatted total in Step 4 CodeExecutionPanel
and BridgeStatusBar: `Session cost: $0.0042`

### Enhancement 3 — CrewMemoryBrowser component

**File**: `apps/dashboard/components/CrewMemoryBrowser.tsx`

A panel (shown in the History tab of ObservationLounge) that:
- Fetches from `GET /api/lounge/observations`
- Displays a searchable/filterable list of observation cards
- Each card: crew member emoji + name, title, timestamp, tags, expandable findings
- Filter by: crew member, tag, date range

### Enhancement 4 — ModelCostCalculator inline in TaskLLMPanel

Augment the existing complexity estimation in `TaskLLMPanel.tsx`:
- After task is typed (debounced 400ms), show a mini cost estimate:
  `Estimated: ~$0.001 (HAIKU) | ~$0.012 (SONNET) | ~$0.060 (OPUS)` 
- Highlight recommended tier in crew-green
- This replaces the current static tier display with a dynamic one

### Enhancement 5 — PhaseProgressPanel

**File**: `apps/dashboard/components/PhaseProgressPanel.tsx`

A collapsible sidebar panel (right side) showing:
- Phase 0: ✅ Complete | Phase 1: 🔄 In Progress | Phase 2–4: 🔴 Pending
- Clickable phase → expands step list (p1-s1 through p1-s5)
- Each step: status icon + script name + responsible crew member
- "Run Step" button → triggers `run_factory_mission` MCP call with the step's context

Data is static (from CLAUDE.md phase table) — no backend needed for this component.

---

## COMPONENT PORTS FROM openrouter-crew-platform

After confirming `~/Dev/openrouter-crew-platform` is cloned, port these components:

### Port 1 — CostOptimizationMonitor

Source: `apps/alex-dashboard/components/CostOptimizationMonitor.tsx` (or similar path)

Integrate into Step 2 (TaskLLMPanel) as a collapsible sub-panel:
- Shows per-model cost breakdown
- Circuit breaker: if estimated cost > $0.10, show warning + require confirmation
- Budget buffer guard: tracks session total against configurable budget cap

### Port 2 — CrewCoordinationPanel  

Source: `apps/alex-dashboard/components/CrewCoordinationPanel.tsx`

Integrate into Step 3 (above ObservationLounge) when `runFullFlow` is true:
- Visualize the 8-step mission flow as a dependency graph
- Show which agents are THINKING / SUCCESS / waiting
- Animate edges when data flows between agents

### Port 3 — VersionsHierarchyTree

Source: Find by searching for `getVersionsHierarchy` usage in alex-dashboard

Integrate into Step 4 (CodeExecutionPanel) as a new tab "Version History":
- Calls `GET /api/mcp/versions` → bridge `get_versions_hierarchy` tool
- Renders as an expandable tree: project → domains → versions

---

## EXECUTION CHECKLIST (run in order)

```bash
# 1. Confirm bridge is running
curl http://localhost:3002/health

# 2. Start dashboard
cd ~/Dev/ai-enterprise-os/apps/dashboard
pnpm dev

# 3. Build VSCode extension
cd ~/Dev/ai-enterprise-os/apps/vscode
npm install && npm run compile && npx vsce package

# 4. Install extension locally
code --install-extension sovereign-factory-0.1.0.vsix

# 5. Run full Phase 0 validation
cd ~/Dev/ai-enterprise-os
./scripts/p0-run-all.sh

# 6. After Phase 1 complete, run Phase 2
./scripts/p2-s1-clone-platform.sh  # clone orc-p if not already cloned
./scripts/p2-run-all.sh
```

---

## CREW DISPATCH: USE THESE MCP TOOLS

When implementing each layer, use these MCP tools via `apps/dashboard/app/api/mcp/execute`:

| Task | MCP Tool | Args |
|------|----------|------|
| Scaffold a new component | `run_factory_mission` | `{ project: "ai-enterprise-os", objective: "Build BridgeStatusBar component ..." }` |
| Search orc-p for component source | `search_code` | `{ path: "~/Dev/openrouter-crew-platform", function_name: "CostOptimizationMonitor" }` |
| Validate after each build step | `health_check` | `{ fix: false }` |
| Check agent coordination | `run_crew_agent` | `{ objective: "...", agents: [{ persona: "commander_riker", role: "..." }] }` |
| Commit progress | `git_operation` | `{ project: "ai-enterprise-os", action: "commit", message: "feat: add BridgeStatusBar" }` |

---

## FAILURE RECOVERY

If any step fails, check `.pipeline-logs/` for the crew-dispatched prompt.
The crew persona assigned to each component domain:

| Domain | Crew Member | Model |
|--------|-------------|-------|
| VSCode extension wiring | Commander Riker | claude-3-5-sonnet |
| MCP bridge / SSE | Geordi La Forge | claude-3-5-sonnet |
| UI components | Counselor Troi | claude-3-haiku |
| Cost routing | Quark | gemini-flash-1.5 |
| QA / smoke tests | Lt. Worf | gpt-4o-mini |
| n8n / webhooks | Lt. Uhura | gemini-flash-1.5 |
| Architecture | Commander Data | claude-3-haiku |
| Health / env | Dr. Crusher | claude-3-haiku |

---

## CONSTRAINTS

- Do NOT break the existing 4-step mission flow in `apps/dashboard/app/page.tsx`
- All new components must use the existing Tailwind theme (crew-green: #00ffaa, space-dark: #0d1022)
- All API routes must proxy through the MCP bridge — no direct orchestrator calls from the UI
- The `crew-manifest.ts` is the SSOT for all crew metadata — do not duplicate persona data elsewhere
- Model IDs must come from `crew-manifest.ts` MODEL_ID_MAP — never hardcode OpenRouter model strings
- Phase 2 monorepo merge is destructive — confirm with user before running p2-run-all.sh

---

*This prompt was generated by the Sovereign Factory UI Build session on 2026-04-15.*
*System context: ~/Dev/ai-enterprise-os/CLAUDE.md*
*Pipeline runner: ./scripts/run-pipeline.sh --list*
