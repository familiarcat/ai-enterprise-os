'use client';

/**
 * Mission Control — Main 4-step workflow
 *
 *  Step 1 · MCP Brain     — Select crew identity & role
 *  Step 2 · Task + LLM    — Define task, auto-route to optimal model
 *  Step 3 · Observation   — Watch agents execute, compare output
 *  Step 4 · Code Updates  — Review & apply scaffolded changes
 */

import React, { useState, useEffect } from 'react';
import CrewSelector from '@/components/CrewSelector';
import TaskLLMPanel, { type ExecutionConfig } from '@/components/TaskLLMPanel';
import ObservationLounge, { type AgentExecution } from '@/components/ObservationLounge';
import CodeExecutionPanel from '@/components/CodeExecutionPanel';
import { Billing } from '@/components/Billing';
import { BridgeSidebar, type DashboardTab } from '@/components/BridgeSidebar';
import { BridgeStatusBar } from '@/components/BridgeStatusBar';
import { CrewMemoryBrowser } from '@/components/CrewMemoryBrowser';
import { DocModal } from '@/components/DocModal';
import { type TokenUsageData } from '../../../core/model';
import { CREW, MISSION_FLOW, MODEL_ID_MAP } from '@/lib/crew-manifest';

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4;

const STEPS: { id: Step; label: string; icon: string; description: string }[] = [
  { id: 1, label: 'Fleet Deck',    icon: '🖖', description: 'Select Project Domain' },
  { id: 2, label: 'Agile Sprint',  icon: '🛰️', description: 'Define Mission Objective' },
  { id: 3, label: 'Task Force',   icon: '🧠', description: 'Assign Crew & Model' },
  { id: 4, label: 'The Bridge',    icon: '🔭', description: 'Observe & Apply Updates' },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function MissionControl() {
  const [step,          setStep]          = useState<Step>(1);
  const [activeTab,     setActiveTab]     = useState<DashboardTab>('live');
  const [selectedCrew,  setSelectedCrew]  = useState<string[]>([]);
  const [project,       setProject]       = useState('enterprise-os');
  const [executions,    setExecutions]    = useState<AgentExecution[]>([]);
  const [isLoading,     setIsLoading]     = useState(false);
  const [config,        setConfig]        = useState<ExecutionConfig | null>(null);
  const [usage,         setUsage]         = useState<TokenUsageData | null>(null);
  const [bridgeStatus,  setBridgeStatus]  = useState<'unknown' | 'online' | 'offline'>('unknown');
  const [sessionTitle,  setSessionTitle]  = useState<string>('');
  const [fleetHealth,   setFleetHealth]   = useState<Record<string, 'NOMINAL' | 'DEGRADED' | 'UNKNOWN'>>({});
  const [showDocModal,  setShowDocModal]  = useState(false);
  const [docModalTitle, setDocModalTitle] = useState('');
  const [docModalContent, setDocModalContent] = useState('');

  const totalCost = executions.reduce((acc, e) => acc + (e.cost ?? 0), 0);

  // Check MCP bridge health on mount
  useEffect(() => {
    fetch('/api/mcp/status')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(() => setBridgeStatus('online'))
      .catch(() => setBridgeStatus('offline'));

    // Initial usage fetch
    fetch('/api/billing/usage?projectId=' + project)
      .then(r => r.ok ? r.json() : null)
      .then(data => data && setUsage(data))
      .catch(err => console.warn('Usage fetch failed', err));
  }, [project]);

  // Fetch fleet health for dynamic display
  useEffect(() => {
    if (activeTab === 'fleet') {
      const fetchFleetHealth = async () => {
        try {
          const res = await fetch('/api/mcp/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tool: 'sensor_sweep', args: {} })
          });
          const data = await res.json();
          const healthReport = data.content?.[0]?.text ? JSON.parse(data.content[0].text) : {};
          const newHealth: Record<string, 'NOMINAL' | 'DEGRADED' | 'UNKNOWN'> = {};
          healthReport.active_domains?.forEach((domain: string) => {
            newHealth[domain.toUpperCase()] = healthReport.integrity?.env === 'healthy' ? 'NOMINAL' : 'DEGRADED'; // Simplified for now
          });
          setFleetHealth(newHealth);
        } catch (e) {
          console.error('Failed to fetch fleet health:', e);
        }
      };
      fetchFleetHealth();
      const interval = setInterval(fetchFleetHealth, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const runIntegrityCheck = async () => {
    alert('Initiating System Integrity Diagnostic via MCP Bridge...');
    // Logic for health_check tool call would go here
  };

  // ── Execute mission ─────────────────────────────────────────────────────────

  async function handleExecute(cfg: ExecutionConfig) {
    setConfig(cfg);
    setIsLoading(true);
    setStep(3);

    // Build agent list: full flow or single agent
    const agentHandles = cfg.runFullFlow
      ? MISSION_FLOW.map(s => s.agent as string)
      : [cfg.crewHandle];

    // Init all agents as THINKING
    const initExecs: AgentExecution[] = agentHandles.map(handle => ({
      handle,
      status:  'THINKING',
      output:  '',
      model:   MODEL_ID_MAP[CREW[handle]?.preferredTier ?? cfg.tier],
    }));
    setExecutions(initExecs);
    setSessionTitle(`${cfg.project} — ${cfg.task.slice(0, 60)}${cfg.task.length > 60 ? '…' : ''}`);

    // Call /api/mcp/execute — sequential for full flow, single call otherwise
    try {
      if (cfg.runFullFlow) {
        await runFullMissionFlow(cfg, agentHandles);
      } else {
        await runSingleAgent(cfg);
      }
    } finally {
      setIsLoading(false);
      setStep(4);
    }
  }

  async function runSingleAgent(cfg: ExecutionConfig) {
    const start = Date.now();
    try {
      const res = await fetch('/api/mcp/execute', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          tool:    'run_factory_mission',
          args:    { project: cfg.project, objective: cfg.task, persona: cfg.crewHandle },
        }),
      });

      const data = await res.json();
      const output = data.content?.[0]?.text ?? data.error ?? JSON.stringify(data, null, 2);

      setExecutions([{
        handle:      cfg.crewHandle,
        status:      res.ok && !data.isError ? 'SUCCESS' : 'ERROR',
        output,
        model:       cfg.model,
        durationMs:  Date.now() - start,
        cost:        estimateCost(cfg.tier, output.length),
      }]);
    } catch (err) {
      setExecutions([{
        handle:  cfg.crewHandle,
        status:  'ERROR',
        output:  String(err),
        model:   cfg.model,
        durationMs: Date.now() - start,
      }]);
    }
  }

  async function runFullMissionFlow(cfg: ExecutionConfig, handles: string[]) {
    for (let i = 0; i < MISSION_FLOW.length; i++) {
      const step = MISSION_FLOW[i];
      const handle = handles[i];
      const agent = CREW[handle];
      const start = Date.now();

      // Mark this agent as active
      setExecutions(prev => prev.map(e =>
        e.handle === handle ? { ...e, status: 'THINKING' } : e
      ));

      try {
        const res = await fetch('/api/mcp/execute', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            tool: 'run_factory_mission',
            args: {
              project:   cfg.project,
              objective: `${step.description}: ${cfg.task}`,
              persona:   handle,
            },
          }),
        });

        const data = await res.json();
        const output = data.content?.[0]?.text ?? data.error ?? JSON.stringify(data, null, 2);
        const tier = agent?.preferredTier ?? cfg.tier;

        setExecutions(prev => prev.map(e =>
          e.handle === handle
            ? {
                ...e,
                status:     res.ok && !data.isError ? 'SUCCESS' : 'ERROR',
                output,
                model:      MODEL_ID_MAP[tier],
                durationMs: Date.now() - start,
                cost:       estimateCost(tier, output.length),
              }
            : e
        ));
      } catch (err) {
        setExecutions(prev => prev.map(e =>
          e.handle === handle
            ? { ...e, status: 'ERROR', output: String(err), durationMs: Date.now() - start }
            : e
        ));
      }

      // Brief pause between agents so UI updates are visible
      await new Promise(r => setTimeout(r, 300));
    }
  }

  async function handleViewDocs(domain: string) {
    try {
      const res = await fetch('/api/mcp/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'search_code',
          args: { 
            path: `domains/${domain.toLowerCase()}/docs`, 
            function_name: 'Architecture', 
            item_type: 'constant' 
          }
        })
      });
      const data = await res.json();
      setDocModalTitle(`${domain.toUpperCase()} Architecture`);
      setDocModalContent(data.content?.[0]?.text || `Documentation not found for ${domain}.`);
      setShowDocModal(true);
    } catch (e) {
      alert('Error retrieving documentation from Bridge.');
    }
  }

  function resetMission() {
    setStep(1);
    setExecutions([]);
    setConfig(null);
    setSessionTitle('');
  }

  const currentSprintStatus = isLoading 
    ? 'Executing' 
    : step === 1 ? 'Planning' 
    : step === 2 ? 'Planning' 
    : step === 3 ? 'Planning'
    : 'Reviewing';

  const onGoToActiveTask = () => setActiveTab('live');

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white text-black font-sans flex min-h-screen selection:bg-red-500 selection:text-white">
      {/* Global Navigation */}
      <BridgeSidebar
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        currentProject={project}
        currentObjective={config?.task}
        currentSprintStatus={currentSprintStatus}
        onGoToActiveTask={onGoToActiveTask}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Global Telemetry Header */}
        <BridgeStatusBar sessionCost={totalCost} />

        <main className="flex-1 overflow-auto p-8 max-w-[1600px] mx-auto w-full">
          {activeTab === 'live' && (
            <div>
              {/* Agile Dashboard Header — Only visible when not deep in a mission step */}
              {step === 1 && (
                <div className="mb-12 grid grid-cols-12 gap-8">
                  <div className="col-span-12 lg:col-span-8 p-10 border-2 border-black bg-zinc-50 relative overflow-hidden">
                    <div className="relative z-10">
                      <h1 className="text-6xl font-black uppercase tracking-tighter leading-none mb-4">
                        Fleet <br /> Readiness
                      </h1>
                      <p className="text-sm font-bold uppercase tracking-widest text-zinc-500 max-w-md">
                        All systems nominal. {executions.length} active tasks detected. 
                        Select a project domain to initiate a new Agile mission.
                      </p>
                    </div>
                    <div className="absolute top-0 right-0 p-10 opacity-10 text-9xl grayscale">🖖</div>
                  </div>
                  <div className="col-span-12 lg:col-span-4 p-8 border-2 border-black flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-black uppercase tracking-widest text-red-600 block mb-2">00 / Recent Activity</span>
                      <div className="space-y-4">
                        {['CIVIC-01', 'CORE-82', 'ADS-04'].map((id) => (
                          <div key={id} className="flex justify-between items-center border-b border-black/10 pb-2">
                            <span className="text-sm font-black italic">{id}</span>
                            <span className="text-[10px] font-bold uppercase text-zinc-400">Deployed</span>
                          </div> 
                        ))}
                      </div>
                    </div>
                    <button onClick={() => setStep(1)} className="w-full py-4 bg-black text-white font-black uppercase text-xs tracking-widest hover:bg-red-600 transition-colors">
                      View All Sprints
                    </button>
                  </div>
                </div>
              )}

              {/* Step indicator — Only relevant for Mission Control (Live) */}
              <div className="grid grid-cols-4 gap-0 mb-12 border-2 border-black">
                {STEPS.map((s) => {
                  const isDone    = step > s.id;
                  const isActive  = step === s.id;
                  const canClick  = isDone || isActive;
                  return (
                    <button
                      key={s.id}
                      onClick={() => canClick && setStep(s.id)}
                      disabled={!canClick}
                      className={[
                        'flex flex-col p-6 text-left border-r-2 last:border-r-0 border-black transition-all duration-200',
                        isActive ? 'bg-black text-white' : isDone ? 'bg-white hover:bg-zinc-50' : 'bg-white opacity-20',
                      ].join(' ')}
                    >
                      <span className="text-xs font-black uppercase tracking-[0.2em] mb-4 text-red-600">0{s.id} / PHASE</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{s.icon}</span>
                        <span className="text-xl font-black uppercase tracking-tighter leading-none">{s.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Step content card */}
              <div className="border-2 border-black bg-white overflow-hidden">
                <div className="border-b-2 border-black px-8 py-6 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{STEPS[step - 1].icon}</span>
                      <h2 className="text-4xl font-black uppercase tracking-tighter">{STEPS[step - 1].label}</h2>
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest mt-1 ml-8">{STEPS[step - 1].description}</p>
                  </div>
                  {step > 1 && (
                    <button onClick={resetMission} className="text-xs font-black uppercase border-2 border-black px-4 py-2 hover:bg-black hover:text-white transition-colors">
                      ↺ Reset
                    </button>
                  )}
                </div>

                <div className="p-8">
                  {/* Step 1: Project Selection (Formerly part of Fleet tab) */}
                  {step === 1 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                      {['ADS', 'FUND', 'OUTBOUND', 'REVENUE', 'SEO', 'CIVIC', 'ENTERPRISE-OS'].map(domain => (
                        <button 
                          key={domain} 
                          onClick={() => { setProject(domain.toLowerCase()); setStep(2); setConfig(null); }} // Reset config when changing project
                          className={`p-8 border-2 transition-all text-left group ${project === domain.toLowerCase() ? 'bg-black text-white border-black' : 'bg-white text-black border-black hover:bg-[#00ffaa]'}`}
                        >
                          <div className="text-xs font-black opacity-50 mb-1 uppercase">Project Domain</div>
                          <div className="text-2xl font-black uppercase tracking-tighter">{domain}</div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Step 2: Mission/Sprint Definition */}
                  {step === 2 && (
                    <TaskLLMPanel 
                      selectedCrew={selectedCrew}
                      onExecute={(cfg) => { setConfig(cfg); setStep(3); }} // Set config and move to crew assignment
                      isLoading={isLoading} 
                      externalProject={project}
                      onProjectChange={setProject}
                    />
                  )}

                  {/* Step 3: Crew/Task Assignment */}
                  {step === 3 && (
                    <div className="space-y-8">
                      <CrewSelector selected={selectedCrew} onChange={setSelectedCrew} />
                      <div className="flex justify-end">
                        <button
                          onClick={() => config && handleExecute(config)}
                          className="px-12 py-4 bg-red-600 text-white font-black uppercase tracking-widest hover:bg-black transition-colors"
                        >
                          Engage Mission
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Observation & Final Code Updates */}
                  {step === 4 && (
                    <div className="space-y-12">
                      <ObservationLounge executions={executions} sessionTitle={sessionTitle} />
                      {executions.every(e => e.status === 'SUCCESS' || e.status === 'ERROR') && config && (
                        <CodeExecutionPanel executions={executions} task={config.task} project={config.project} onNewTask={resetMission} />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <CrewMemoryBrowser />
          )}

          {activeTab === 'fleet' && (
            <div className="p-8 border-2 border-black bg-zinc-50">
              <div className="mb-8">
                <h2 className="text-4xl font-black uppercase tracking-tighter">Fleet Command</h2>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-2">Active DDD Domains & Platform Services</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {['ADS', 'FUND', 'OUTBOUND', 'REVENUE', 'SEO', 'CIVIC'].map(domain => (
                  <div key={domain} className="border-2 border-black bg-white group flex flex-col">
                    <button 
                      onClick={() => { 
                        setProject(domain.toLowerCase()); 
                        setActiveTab('live'); 
                        setStep(1); // Go to project selection step for this domain
                      }}
                      className="flex-1 p-6 hover:bg-[#00ffaa] transition-colors text-left"
                    >
                      <div className="text-xs font-black text-zinc-400 group-hover:text-black mb-1 uppercase">
                        DOMAIN / 01
                      </div>
                      <div className="text-xl font-black uppercase tracking-tighter">
                        {domain}
                      </div>
                    </button>
                    <button
                      onClick={() => handleViewDocs(domain)}
                      className="p-3 border-t-2 border-black bg-zinc-50 hover:bg-black hover:text-white transition-all text-xs font-black uppercase tracking-widest"
                    >
                      📂 View Docs
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'integrity' && (
            <div className="p-8 border-2 border-black bg-zinc-50 text-center">
              <h2 className="text-4xl font-black uppercase tracking-tighter mb-4">System Integrity</h2>
              <button 
                onClick={runIntegrityCheck}
                className="px-12 py-4 bg-black text-white font-black uppercase tracking-widest text-xs hover:bg-red-600 transition-colors border-2 border-black"
              >
                Run Deep Diagnostic
              </button>
            </div>
          )}

          <div className="mt-12">
            <Billing usage={usage} />
          </div>

          <footer className="mt-12 text-center text-xs text-black font-black uppercase tracking-[0.4em] border-t-2 border-black/5 pt-8">
            AI Enterprise OS · MCP Bridge :3002 / Star Trek Crew via OpenRouter
          </footer>
        </main>
      </div>

      {/* Documentation Modal */}
      <DocModal
        isOpen={showDocModal}
        onClose={() => setShowDocModal(false)}
        title={docModalTitle}
        content={docModalContent}
      />
    </div>
  );
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function estimateCost(tier: string, outputChars: number): number {
  const ratePerM: Record<string, number> = {
    HAIKU:          0.25,
    SONNET:         3.0,
    OPUS:           15.0,
    GPT_4O:         0.15,
    GEMINI_1_5_PRO: 0.075,
    BUDGET:         0.25,
    STANDARD:       3.0,
    PREMIUM:        15.0,
  };
  const rate = ratePerM[tier] ?? 3.0;
  const tokens = outputChars / 4; // rough estimate
  return (tokens / 1_000_000) * rate;
}
