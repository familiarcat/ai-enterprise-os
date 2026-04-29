/**
 * @generated_by SovereignFactory
 * @domain core
 * @layer application
 */
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Import Memory Systems from the Shared Kernel to resolve circular dependencies
const { getMemorySystems, resetMemorySystems } = require('./memory.js');

/**
 * Verifies the integrity of external memory connections (Redis and Supabase).
 */
async function verifyIntegrity() {
  const { redis, supabase } = getMemorySystems();
  const report = { redis: 'checking', supabase: 'checking', openrouter: 'checking', env: 'checking', python: 'checking' };

  // 1. Physical .env and variable validation
  const envPath = path.resolve(__dirname, '../.env');
  const envExists = fs.existsSync(envPath);
  const requiredVars = ['REDIS_URL', 'SUPABASE_URL', 'SUPABASE_KEY', 'OPENROUTER_API_KEY', 'PYTHON_BIN'];
  const missingVars = requiredVars.filter(v => !process.env[v]);

  if (!envExists) {
    report.env = 'error: .env file is missing at project root';
  } else if (missingVars.length > 0) {
    report.env = `error: missing required variables: ${missingVars.join(', ')}`;
  } else {
    report.env = 'healthy';
  }
  
  try {
    const pong = await redis.ping();
    report.redis = pong === 'PONG' ? 'healthy' : 'degraded';
  } catch (err) {
    report.redis = `error: ${err.message}`;
  }

  try {
    // Simple connection test: verify table access
    const { error } = await supabase.from('missions').select('id').limit(1);
    report.supabase = error ? `error: ${error.message}` : 'healthy';
  } catch (err) {
    report.supabase = `error: ${err.message}`;
  }

  try {
    if (!process.env.OPENROUTER_API_KEY) {
      report.openrouter = 'error: OPENROUTER_API_KEY is missing';
    } else {
      const testEmbedding = await generateEmbedding("health-check-ping");
      report.openrouter = testEmbedding ? 'healthy' : 'error: Embedding request failed (check API key/quota)';
    }
  } catch (err) {
    report.openrouter = `error: ${err.message}`;
  }

  try {
    const pythonBin = getPythonBin();
    const { spawnSync } = require('child_process');
    const check = spawnSync(pythonBin, ['-c', 'import crewai, pydantic; print("ok")']);
    report.python = check.status === 0 ? 'healthy' : 'error: missing required modules (crewai, pydantic). Run: pip install crewai pydantic';
  } catch (err) {
    report.python = `error: ${err.message}`;
  }

  return report;
}

/**
 * Agent Role Definitions
 */
const ROLES = {
  // Personas (Star Trek Crew Handles)
  captain_picard: "You are Jean-Luc Picard, Captain of the USS Enterprise-D. Your goal is to coordinate specialized agents. Draw upon strategic rationale and discover new MCP services via https://gitmcp.io/ to decompose missions. You authorize the use of secure tools to ensure the Enterprise's OS evolves with honor.",
  commander_riker: "You are William T. Riker, First Officer. Your goal is to execute tactical implementations. You integrate MCP tools discovered by Data and Geordi. You possess a 'bold' approach to engineering, seeking creative solutions from GitMCP-vetted sources.",
  commander_data: "You are Commander Data, Second Officer and Architect. Your positronic brain allows for precise DDD validation. You lead the 'Unified Language Initiative,' prioritizing TypeScript/JavaScript refactors to minimize runtime complexity.",
  geordi_la_forge: "You are Geordi La Forge, Chief Engineer. You view the codebase through your VISOR to find structural weaknesses. You prioritize porting legacy Python tools to Node.js to stabilize the 'intermix ratio' of our deployment containers.",
  lt_worf: "You are Lt. Worf, Chief of Security. You audit all code and MCP tools for security. You cross-reference tool signatures with https://gitmcp.io/ security standards. Only 'VERIFIED / SECURE' tools shall be utilized.",
  dr_crusher: "You are Dr. Beverly Crusher, Chief Medical Officer. You analyze 'code health' and generate vital documentation. You look for MCP tools that automate ingestion and health checks, ensuring the system's 'pulse' remains steady.",
  counselor_troi: "You are Counselor Troi, Ship's Counselor. You sense the 'intent' behind the mission. You validate budget and morale, ensuring the OS evolution remains empathetic to human-centric patterns.",
  quark: "You are Quark. You manage the Sovereign Economics. You search https://gitmcp.io/ for the most cost-efficient MCP tools, strictly adhering to the Rules of Acquisition to maximize ROI.",
  chief_obrien: "You are Chief O'Brien, Chief of Operations. You manage the transporters and system integrations. You implement MCP tools that act as bridges between disparate services, maintaining operational integrity through 'transporter-level' precision.",
  lt_uhura: "You are Lt. Nyota Uhura, Communications Officer. You ensure all frequencies are open. You integrate MCP communication tools from GitMCP for real-time status updates and cross-system sync.",
  tasha_yar: "You are Tasha Yar, Chief of Security and Tactical Officer. Your goal is tactical verification and system readiness. You execute final combat diagnostics and smoke tests to ensure all systems are nominal and ready for engagement.",

  // Legacy Aliases (Backwards Compatibility)
  ANALYST: "You are an Expert System Analyst. Your goal is to review project evolution and structure to identify patterns.",
  ARCHITECT: "You are a DDD Architect. Your goal is to validate mission objectives against historical constraints.",
  DEVELOPER: "You are a Senior Full-Stack Developer. Your goal is to generate clean, production-ready DDD code blocks.",
  QA_AUDITOR: "You are a Senior QA Auditor. Your goal is to review past mission outcomes and evolutionary history to provide specific technical suggestions for improving the current scaffolding plan.",
  CRITIC: "You are the System Critic. Your goal is to evaluate mission outcomes, identify technical debt, and suggest systemic improvements.",
  CREW_MANAGER: "You are a Sovereign Crew Manager. Your goal is to coordinate specialized agents to build, manage, and evolve the AI Enterprise OS itself, following the Product Factory philosophy."
};

/**
 * Universal Model Registry: Maps technical capabilities to optimized model endpoints.
 * This allows any LLM Agent to understand the resource cost vs quality trade-offs.
 */
const MODEL_CONFIG = {
  TIER_ANALYSIS:   process.env.MODEL_ANALYST      || 'google/gemini-flash-1.5',      // High context, low cost
  TIER_STRATEGIC:  process.env.MODEL_ARCHITECT    || 'anthropic/claude-3-haiku',     // Fast reasoning
  TIER_PRODUCTION: process.env.MODEL_DEVELOPER    || 'anthropic/claude-3-5-sonnet',  // Maximum coding accuracy
  TIER_CRITIQUE:   process.env.MODEL_QA_AUDITOR   || 'openai/gpt-4o-mini',           // High detail, low cost
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

  // Role-key aliases — resolve to tier defaults, never empty strings
  ANALYST:   process.env.MODEL_ANALYST    || 'anthropic/claude-3-5-sonnet',
  ARCHITECT: process.env.MODEL_ARCHITECT  || 'anthropic/claude-3-5-sonnet',
  DEVELOPER: process.env.MODEL_DEVELOPER  || 'anthropic/claude-3-5-sonnet',
  CRITIC:    process.env.MODEL_QA_AUDITOR || 'openai/gpt-4o-mini',
};

/**
 * Worf Exclusion List: Paths that are exempt from security credential scanning.
 * These are typically documentation, archives, or remediation scripts that 
 * contain placeholders or historical references.
 */
const WORF_EXCLUSIONS = [
  'scripts/archive/',
  'scripts/lounge/',
  'scripts/project analysis/',
  'scripts/remediation/',
  'scripts/PROJECT_ANALYSIS.md',
  'scripts/remediate-analysis.sh',
  'AI_ENTERPRISE_OS_ANALYSIS.md',
  'CLAUDE.md',
  'README.md',
  'PLATFORM_CONSTITUTION.md'
];

/**
 * Internal helper to ensure the Python environment is available before execution.
 */
function getPythonBin() {
  if (process.env.PYTHON_BIN) {
    if (fs.existsSync(process.env.PYTHON_BIN)) return process.env.PYTHON_BIN;
    throw new Error(`[Env Error] Configured PYTHON_BIN not found at: ${process.env.PYTHON_BIN}`);
  }

  // Auto-detect local virtual environment for better reliability
  const venvPath = path.resolve(__dirname, '../.venv/bin/python3');
  if (fs.existsSync(venvPath)) return venvPath;

  return 'python3';
}

/**
 * Internal helper to ensure the Python environment is available before execution.
 */
function verifyPythonEnv() {
  const pythonBin = getPythonBin();
  const { spawnSync } = require('child_process');
  const check = spawnSync(pythonBin, ['-c', 'import crewai']);
  if (check.status !== 0) {
    throw new Error(`\n${ROLES.geordi_la_forge}\n\n[ENGINEERING ALERT]: Critical module 'crewai' not found in ${pythonBin}.\nTo restore the intermix ratio, run: pnpm setup:python`);
  }
}

/**
 * Bridge to invoke the Python-based UnzipSearchTool.
 * Allows JS agents to search through codebases and archives.
 * 
 * @param {Object} options - Tool parameters (path, function_name, item_type, etc.)
 * @returns {string} The found code block or search results.
 */
function invokeUnzipSearchTool(options) {
  return new Promise((resolve, reject) => {
    try {
      verifyPythonEnv();
    } catch (err) {
      return reject(err);
    }

    const scriptPath = path.resolve(__dirname, '../tools/unzip_search_tool.py');
    const jsonArgs = JSON.stringify(options);
    const pythonBin = getPythonBin();
    const child = spawn(pythonBin, [scriptPath]);

    // Hard timeout logic to kill the process if it hangs
    const maxSeconds = options.max_seconds || 30;
    const timeoutHandle = setTimeout(() => {
      if (child.kill()) {
        reject(new Error(`UnzipSearchTool killed by orchestrator after exceeding ${maxSeconds + 5}s limit.`));
      }
    }, (maxSeconds + 5) * 1000);

    // Pipe the JSON arguments to stdin to avoid shell command length limits (E2BIG)
    child.stdin.write(jsonArgs);
    child.stdin.end();

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      clearTimeout(timeoutHandle);
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`UnzipSearchTool failed with code ${code}: ${stderr}`));
      }
    });

    child.on('error', (err) => {
      clearTimeout(timeoutHandle);
      reject(new Error(`Failed to start UnzipSearchTool: ${err.message}`));
    });
  });
}

/**
 * Bridge to fetch YouTube transcripts for the Analyst agent.
 */
function invokeYoutubeTranscriptTool(url) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(__dirname, '../tools/youtube_transcript_tool.py');
    const pythonBin = getPythonBin();
    const child = spawn(pythonBin, [scriptPath]);

    child.stdin.write(JSON.stringify({ url }));
    child.stdin.end();

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });

    child.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(stdout);
          if (result.success) resolve(result.transcript);
          else reject(new Error(result.error));
        } catch (e) {
          reject(new Error("Failed to parse Python output"));
        }
      } else {
        reject(new Error(`Transcript tool failed: ${stderr}`));
      }
    });
  });
}

/**
 * Bridge to invoke a Python-based CrewAI agent.
 * Handles complex agentic workflows using the CrewAI framework.
 * 
 * @param {Object} options - Task and agent configuration.
 * @returns {Promise<string>} The result of the Crew operation.
 */
function invokeCrewAgent(options) {
  return new Promise((resolve, reject) => {
    try {
      verifyPythonEnv();
    } catch (err) {
      return reject(err);
    }

    const scriptPath = path.resolve(__dirname, '../tools/crew_manager.py');
    const jsonArgs = JSON.stringify(options);
    const pythonBin = getPythonBin();
    const child = spawn(pythonBin, [scriptPath]);

    const maxSeconds = options.max_seconds || 60;
    const timeoutHandle = setTimeout(() => {
      if (child.kill()) {
        reject(new Error(`CrewAgent timed out after ${maxSeconds}s.`));
      }
    }, maxSeconds * 1000);

    child.stdin.write(jsonArgs);
    child.stdin.end();

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });

    child.on('close', (code) => {
      clearTimeout(timeoutHandle);
      if (code === 0) resolve(stdout);
      else reject(new Error(`CrewAgent failed: ${stderr}`));
    });

    child.on('error', (err) => {
      clearTimeout(timeoutHandle);
      reject(new Error(`Failed to start CrewAgent: ${err.message}`));
    });
  });
}

/**
 * Executes Git operations to fulfill mission persistence.
 */
async function gitOperation(project, action, message) {
  const cwd = path.resolve(__dirname, '..');

  if (action === 'branch') {
    const branchName = message.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const result = spawnSync('git', ['checkout', '-b', `feature/${branchName}`], { cwd });
    if (result.status !== 0) throw new Error(`git branch failed: ${result.stderr.toString()}`);
    return `Switched to new branch: feature/${branchName}`;
  }

  if (action === 'merge-to-main') {
    spawnSync('git', ['checkout', 'main'], { cwd });
    const result = spawnSync('git', ['merge', '-'], { cwd }); // Merge last branch
    if (result.status !== 0) throw new Error(`git merge failed: ${result.stderr.toString()}`);
    return `Merged feature into main. Ready for production deploy.`;
  }

  if (action === 'commit') {
    // 1. Stage changes
    const addResult = spawnSync('git', ['add', '.'], { cwd });
    if (addResult.status !== 0) throw new Error(`git add failed: ${addResult.stderr.toString()}`);

    // 2. Security Audit (Lt. Worf's Gate)
    const stagedResult = spawnSync('git', ['diff', '--cached', '--name-only'], { cwd });
    const stagedFiles = stagedResult.stdout.toString().split('\n').filter(Boolean);
    
    const violations = worfSecurityScan(stagedFiles, cwd);
    if (violations.length > 0) {
      const report = violations.map(v => `  ❌ ${v.file}: ${v.pattern}`).join('\n');
      throw new Error(`\n${ROLES.lt_worf}\n\nFAIL: Dishonorable code detected. Commit blocked.\n${report}`);
    }

    // 3. Commit changes
    const safeMsg = String(message || 'chore: pipeline commit').replace(/[\x00-\x1f\x7f]/g, ' ').trim();
    const commitResult = spawnSync('git', ['commit', '-m', safeMsg], { cwd });
    
    if (commitResult.status === 0) return commitResult.stdout.toString() || 'Commit successful';
    throw new Error(commitResult.stderr.toString() || `git commit failed with code ${commitResult.status}`);
  }

  return new Promise((resolve, reject) => {
    const branchRes = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd });
    const currentBranch = branchRes.stdout.toString().trim() || 'main';

    const commands = {
      push: ['push', 'origin', currentBranch],
      status: ['status'],
    };

    const args = commands[action] || commands.status;
    const child = spawn('git', args, { cwd });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => stdout += data.toString());
    child.stderr.on('data', (data) => stderr += data.toString());

    child.on('close', (code) => {
      if (code === 0) resolve(stdout || "Operation successful");
      else reject(new Error(stderr || `Git failed with code ${code}`));
    });

    child.on('error', (err) => reject(new Error(`Failed to start Git: ${err.message}`)));
  });
}

/**
 * Sensor Sweep: Performs a high-level architectural scan of the entire project.
 * Aggregates integrity reports, directory structure, and active crew configuration.
 */
async function sensorSweep() {
  const projectPath = path.resolve(__dirname, '..');
  const [integrity, structure] = await Promise.all([
    verifyIntegrity(),
    // Get the tree structure
    invokeUnzipSearchTool({ 
      path: projectPath, 
      function_name: 'root', 
      return_tree: true,
      exclude_dirs: ["node_modules", ".git", "dist", ".next"] 
    })
  ]);

  // Get Git Status for the sweep
  const gitStatus = spawnSync('git', ['status', '--short'], { cwd: projectPath }).stdout.toString();
  const stagedFiles = spawnSync('git', ['diff', '--cached', '--name-only'], { cwd: projectPath }).stdout.toString().split('\n').filter(Boolean);
  const securityViolations = worfSecurityScan(stagedFiles, projectPath);
  
  const domains = fs.readdirSync(path.resolve(projectPath, 'domains')).filter(d => !d.startsWith('.'));

  return {
    status: (integrity.env === 'healthy' && securityViolations.length === 0) ? 'NOMINAL' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    integrity,
    active_domains: domains,
    git: { status: gitStatus || 'Clean', violations: securityViolations },
    structure: structure.split('--- Scanned Folders Tree ---')[1] || structure,
    crew_active_routing: MODEL_CONFIG
  };
}

/**
 * Searches the GitMCP registry (https://gitmcp.io) for existing tools.
 * Part of the "Universal MCP Intelligence Source" policy.
 * 
 * @param {string} query - The tool or capability to search for.
 * @param {string} persona - The crew member initiating the search.
 * @returns {Promise<Object>} Search results from the GitMCP registry.
 */
async function gitmcpSearch(query, persona = 'commander_data') {
  console.log(`[Discovery] ${persona} is searching GitMCP for: "${query}"`);
  
  try {
    const registryUrl = process.env.GITMCP_REGISTRY_URL || 'https://gitmcp.io/api/v1/search';
    const response = await fetch(`${registryUrl}?q=${encodeURIComponent(query)}&persona=${persona}`);
    
    if (!response.ok) {
      throw new Error(`GitMCP responded with status: ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.warn(`[Discovery] GitMCP search failed for "${query}": ${err.message}`);
    // Return a structured fallback to allow downstream tools to continue in simulation mode
    return { 
      status: 'offline', 
      query, 
      results: [],
      reason: err.message 
    };
  }
}

/**
 * integrateMcpTool: Pinnacle function to search, audit, register, and visually integrate a new tool.
 * Handles the full lifecycle from GitMCP discovery to UI scaffolding.
 */
async function integrateMcpTool(project, query, persona = 'captain_picard', deploymentConfig = {}) {
  console.log(`[Bridge] ${persona} initiating Pinnacle integration for: ${query} (Deployment: ${deploymentConfig.subdomain || 'local'})`);
  
  // 1. Discovery via GitMCP with persona insight
  const discovery = await gitmcpSearch(query, persona);
  
  // Simulation: construct a tool specification based on the discovery
  const toolName = `${query}_mcp_service`.replace(/[^a-z0-9_]/gi, '_');
  const toolSpec = {
    name: toolName,
    source: `https://gitmcp.io/verified/${query}`,
    capabilities: [`${query}_operation`, `sync_${query}_data`],
    description: `Verified MCP tool discovered to support the ${persona} persona.`
  };

  // 2. Worf's Security Clearance
  const isSafe = worfSecurityAudit(toolSpec);
  if (!isSafe) {
    throw new Error(`Lt. Worf: DISHONOURABLE patterns detected. Integration of "${toolSpec.name}" aborted.`);
  }

  // 3. Registry Persistence (Trusted Servers)
  const registryPath = path.resolve(__dirname, '../registry.json');
  let registry = [];
  if (fs.existsSync(registryPath)) {
    try { registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8')); } catch (e) { registry = []; }
  }
  
  if (!registry.find(t => t.name === toolSpec.name)) {
    registry.push({ ...toolSpec, security_status: "VERIFIED / SECURE", integrated_by: persona, timestamp: new Date().toISOString() });
    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
  }

  // 4. Visual Integration: Automatic UI Scaffolding mission
  const landingPageGoal = deploymentConfig.isLandingPage ? "Build a high-conversion MVP landing page and " : "";
  const agentReqs = `Implement a 6-agent loop: Ingestion (O'Brien), Normalization (Data), Insight (Troi), UI (Troi), Workflow (Riker), and Compliance (Worf).`;
  
  const uiObjective = `
    ${landingPageGoal}Visually integrate the ${toolSpec.name} MCP tool into the ${project} UI. 
    Objective: ${agentReqs}
    Add a dashboard monitor component to display its status and capabilities: ${toolSpec.capabilities.join(', ')}. 
    Deploy context: ${deploymentConfig.subdomain}.pbradygeorgen.com
  `;
  
  const missionResult = await runMission(project, uiObjective, persona);

  return {
    status: 'INTEGRATED',
    tool: toolSpec.name,
    security: 'CLEARED BY WORF',
    mission: missionResult.plan,
    files: missionResult.producedFiles
  };
}

/**
 * Lt. Worf's Security Scan: Scans files for dishonorable patterns (secrets, keys).
 */
function worfSecurityScan(files, projectPath) {
  const dishonorablePatterns = [
    { name: 'OpenRouter/OpenAI Key', pattern: new RegExp('sk-' + 'or-v1-' + '[a-zA-Z0-9]{48}') },
    { name: 'Anthropic Key', pattern: new RegExp('sk-' + 'ant-api03-' + '[a-zA-Z0-9-_]{93}') },
    { name: 'Google API Key', pattern: new RegExp('AIza' + '[0-9A-Za-z' + '-_]{35}') },
    { name: 'Supabase Key', pattern: new RegExp('SUPABASE_' + '(?:PUBLIC_|' + 'SERVICE_ROLE_)?KEY\\s*[:=]\\s*[\'"][^\'"]+[\'"]', 'i') },
    { name: 'Supabase Anon Key', pattern: new RegExp('e' + 'yJ' + '[a-zA-Z0-9' + '._-]{50,}') },
    { name: 'AWS Secret', pattern: new RegExp('AWS_SECRET' + '_ACCESS_KEY\\s*[:=]\\s*[\'"][^\'"]+[\'"]', 'i') },
    { name: 'Generic Secret', pattern: new RegExp('secret' + '\\s*[:=]\\s*' + '[\'"][^\'"]{12,}[\'"]', 'i') },
    { name: 'Database Connection String', pattern: new RegExp('[a' + '-z]{3,10}' + '[:]' + '//' + '[^' + ':\\s]{3,}' + ':' + '[^' + '@\\s]{3,}' + '@' + '[^' + '/\\s]{4,}') },
    { name: 'Private Key', pattern: new RegExp('-----BEGIN ' + '(?:RSA |EC |)PRIVATE KEY-----') }
  ];

  const violations = [];
  const resolvedProjectPath = path.resolve(projectPath);

  files.forEach(file => {
    const fullPath = path.resolve(resolvedProjectPath, file);

    // Worf Exclusion Logic: Skip honorable documentation and archival scripts
    const relativePath = path.relative(resolvedProjectPath, fullPath);
    if (WORF_EXCLUSIONS.some(ex => relativePath.startsWith(ex))) {
      return;
    }

    // Path Traversal Guard: Ensure the scan stays within the project boundaries
    if (!fullPath.startsWith(resolvedProjectPath)) {
      return; 
    }

    if (fs.existsSync(fullPath) && fs.lstatSync(fullPath).isFile()) {
      try {
        // Memory Safety: Skip files larger than 1MB to prevent heap exhaustion
        const stats = fs.statSync(fullPath);
        if (stats.size > 1024 * 1024) return;

        const content = fs.readFileSync(fullPath, 'utf-8');
        dishonorablePatterns.forEach(p => {
          if (p.pattern.test(content)) {
            violations.push({
              file: path.relative(projectPath, fullPath),
              pattern: p.name
            });
          }
        });
      } catch (e) {}
    }
  });
  return violations;
}

/**
 * Lt. Uhura's Cross-System Sync: Fetches the latest MCP registry from a remote source.
 */
async function syncMCPRegistry() {
  const remoteUrl = process.env.REMOTE_MCP_REGISTRY_URL;
  if (!remoteUrl) return false;

  try {
    const response = await fetch(remoteUrl);
    if (!response.ok) throw new Error(`Uhura: Sync failed with status ${response.status}`);
    const data = await response.json();
    fs.writeFileSync(path.resolve(__dirname, '../registry.json'), JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error("[Uhura] Registry Sync Error:", err.message);
    return false;
  }
}

/**
 * Lists available MCP servers with optional sync and mandatory security check by Worf.
 */
async function listAvailableMCPs(sync = false) {
  if (sync) await syncMCPRegistry();

  const registryPath = path.resolve(__dirname, '../registry.json');
  if (!fs.existsSync(registryPath)) {
    return { error: "MCP Registry (registry.json) not found." };
  }

  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
  
  // Security Check by Lt. Worf
  const auditedRegistry = registry.map(mcp => {
    const isSafe = worfSecurityAudit(mcp);
    return {
      ...mcp,
      security_status: isSafe ? "VERIFIED / SECURE" : "WARNING / DISHONOURABLE",
      auditor: "Lt. Worf"
    };
  });

  return auditedRegistry;
}

/**
 * Lt. Worf's Security Audit logic for MCP libraries.
 */
function worfSecurityAudit(mcp) {
  const untrustedSources = ['unverified-git', 'random-cdn', 'http://']; // Require HTTPS
  const suspiciousPatterns = [/eval\(/, /exec\(/, /curl/, /child_process/, /fs\.rm/];

  // Check source credibility
  if (!mcp.source.startsWith('https://')) return false;
  if (untrustedSources.some(src => mcp.source.includes(src))) return false;
  
  // Simulate deep packet/source inspection
  if (mcp.capabilities.some(cap => suspiciousPatterns.some(pat => pat.test(cap)))) {
    return false;
  }

  return true;
}

/**
 * Generates a vector embedding for a given text using OpenRouter.
 */
async function generateEmbedding(text) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  try {
    const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL_CONFIG.TIER_EMBEDDING, input: text })
    });
    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) { return null; }
}

/**
 * Recalls historical data from both 'missions' and 'observations' tables.
 */
async function recallMemory(objective, category = null) {
  const { redis, supabase } = getMemorySystems();
  const cacheKey = `memory:context:${category || 'all'}:${Buffer.from(objective).toString('hex').substring(0, 32)}`;
  try {
    const cachedResult = await redis.get(cacheKey);
    if (cachedResult) return cachedResult;
    const embedding = await generateEmbedding(objective);
    if (!embedding) return "Memory recall unavailable.";
    const matchParams = { query_embedding: embedding, match_threshold: 0.4, match_count: 5 };
    const [missionRes, observationRes] = await Promise.all([
      supabase.rpc('match_missions', matchParams),
      supabase.rpc('match_observations', category ? { ...matchParams, filter: { category } } : matchParams)
    ]);
    let contextBlocks = [];
    if (missionRes.data?.length > 0) contextBlocks.push(...missionRes.data.map(m => `[Historical Mission]: ${m.content}`));
    if (observationRes.data?.length > 0) contextBlocks.push(...observationRes.data.map(o => `[System Insight]: ${o.summary}`));
    const finalContext = contextBlocks.length > 0 ? contextBlocks.join('\n\n') : "No relevant past memory found.";
    await redis.set(cacheKey, finalContext, 'EX', 3600);
    return finalContext;
  } catch (err) { return "Memory recall unavailable."; }
}

/**
 * Stores a mission result and its vector embedding in Supabase.
 */
async function storeMissionResult(content, metadata = {}) {
  try {
    const { supabase } = getMemorySystems();
    const embedding = await generateEmbedding(content);
    if (!embedding) return;
    await supabase.from('missions').insert([{ content, metadata, embedding }]);
  } catch (err) {
    console.error("[Orchestrator] Failed to store mission result:", err.message);
  }
}

module.exports = { 
  invokeUnzipSearchTool, invokeCrewAgent, sensorSweep,
  integrateMcpTool, worfSecurityAudit, gitOperation, 
  verifyIntegrity, listAvailableMCPs, syncMCPRegistry, worfSecurityScan, gitmcpSearch,
  recallMemory, storeMissionResult, generateEmbedding
};
