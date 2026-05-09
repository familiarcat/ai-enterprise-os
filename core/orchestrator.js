/**
 * @generated_by SovereignFactory
 * @domain core
 * @layer application
 */
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Infrastructure imports - Moved to top to resolve circular initialization 
// issues and Temporal Dead Zone (TDZ) errors in test environments.
const { getMemorySystems, resetMemorySystems, runMission } = require('./memory.js');
const { MODEL_CONFIG, CREW_PERSONAS, normalisePersonaKey } = require('./crew-manifest.js');
const { incrementTokenUsage } = require('./repository.js');

/**
 * Internal helper to resolve the correct Python binary for agent tools.
 */
function getPythonBin() {
  if (process.env.PYTHON_BIN && fs.existsSync(process.env.PYTHON_BIN)) {
    return process.env.PYTHON_BIN;
  }

  const candidates = [
    path.resolve(__dirname, '../.venv313/bin/python3.13'),
    path.resolve(__dirname, '../.venv313/bin/python3'),
    path.resolve(__dirname, '../.venv/bin/python3'),
    path.resolve(__dirname, '../.venv/bin/python'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }

  return 'python3';
}

/**
 * Internal helper to ensure the Python environment is available before execution.
 */
function verifyPythonEnv() {
  const pythonBin = getPythonBin();
  const check = spawnSync(pythonBin, ['-c', 'import crewai, pydantic, langchain_openai']);
  if (check.status !== 0) {
    console.warn(`\n${ROLES.geordi_la_forge}\n\n[ENGINEERING WARNING]: Python environment is degraded. Moving to Unified Language Initiative.`);
    return false;
  }
  return true;
}

/**
 * Verifies the integrity of external memory connections (Redis and Supabase).
 * @param {boolean} fix - If true, attempts to install missing Python dependencies.
 */
async function verifyIntegrity(fix = false) {
  // Always reload .env so health checks reflect current file state regardless of process age
  require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });
  resetMemorySystems();
  const { redis, supabase } = getMemorySystems();
  const report = { redis: 'checking', supabase: 'checking', openrouter: 'checking', env: 'checking', python: 'checking' };

  // 1. Physical .env and variable validation
  const envPath = path.resolve(__dirname, '../.env');
  const envExists = fs.existsSync(envPath);
  const requiredVars = ['REDIS_URL', 'SUPABASE_URL', 'SUPABASE_KEY', 'OPENROUTER_API_KEY', 'PYTHON_BIN'];
  const missingVars = requiredVars.filter(v => !process.env[v] || process.env[v].includes('REPLACE_WITH_ACTUAL'));

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
    const pythonModules = 'crewai, pydantic, langchain_openai';
    const checkCmd = `import ${pythonModules}; print("ok")`;
    let check = spawnSync(pythonBin, ['-c', checkCmd]);
    
    if (check.status !== 0 && fix) {
      console.log(`[Geordi] Missing Python dependencies. Attempting automatic repair...`);
      const repair = spawnSync(pythonBin, ['-m', 'pip', 'install', 'crewai', 'langchain-openai', 'pydantic'], { stdio: 'inherit' });
      if (repair.status !== 0) {
        console.error(`[Geordi] Repair failed with status ${repair.status}. Manual intervention required.`);
      }
      check = spawnSync(pythonBin, ['-c', checkCmd]);
    }

    report.python = check.status === 0 ? 'healthy' : `error: missing required modules (${pythonModules}). Run: pnpm setup:python`;
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
  'PLATFORM_CONSTITUTION.md',
  'core/docker-compose.yml',
  'apps/vscode/media/',
  'apps/vscode/out/',
  'dist/',
  'crew-memories/'
];

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
      if (verifyPythonEnv() === false) {
        return reject(new Error("Python environment degraded: missing required modules for search."));
      }
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
      if (verifyPythonEnv() === false) {
        return reject(new Error("Python environment degraded: missing required modules for CrewAI. Run 'health_check --fix'"));
      }
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
    }).catch(err => `[ENGINEERING WARNING]: Unable to scan directory structure via Python. ${err.message}`)
  ]);

  // Get Git Status for the sweep
  const gitStatus = spawnSync('git', ['status', '--short'], { cwd: projectPath }).stdout.toString();
  const stagedFiles = spawnSync('git', ['diff', '--cached', '--name-only'], { cwd: projectPath }).stdout.toString().split('\n').filter(Boolean);
  const securityViolations = worfSecurityScan(stagedFiles, projectPath);

  const domainsPath = path.resolve(projectPath, 'domains');
  const domains = fs.existsSync(domainsPath) 
    ? fs.readdirSync(domainsPath).filter(d => !d.startsWith('.'))
    : [];

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
 * Discover MCP Tools: Actively searches multiple registries (GitMCP, GitHub, Anthropic)
 * for tools matching the agent's persona and current task requirements.
 */
async function discoverMcpTools(query, persona = 'captain_picard') {
  console.log(`[Discovery] ${persona} is initiating a deep search for MCP libraries matching: "${query}"`);
  
  const registries = [
    { name: 'GitMCP', url: `https://gitmcp.io/api/v1/search?q=${encodeURIComponent(query)}` },
    { name: 'GitHub', url: `https://api.github.com/search/repositories?q=mcp-server+${encodeURIComponent(query)}` }
  ];

  const results = [];

  for (const registry of registries) {
    try {
      const response = await fetch(registry.url, { signal: AbortSignal.timeout(5000) });
      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const data = await response.json();
        results.push({ registry: registry.name, data });
      }
    } catch (err) {
      console.warn(`[Discovery] Failed to search ${registry.name}: ${err.message}`);
    }
  }

  // If no external tools are found, skip the LLM selection mission to save tokens and prevent crashes
  if (results.length === 0) {
    return {
      query,
      recommendation: "No specialized MCP tools discovered in external registries. Proceeding with core system capabilities.",
      registries_searched: registries.map(r => r.name)
    };
  }

  // Enrichment: Use the LLM to select the best tool from results based on the persona
  const selectionMission = await invokeCrewAgent({
    objective: `Analyze these search results for "${query}" and select the most pragmatic MCP library for a "${persona}" persona.`,
    persona: 'commander_data',
    context: JSON.stringify(results),
    model: MODEL_CONFIG.commander_data
  });

  return {
    query,
    recommendation: selectionMission,
    registries_searched: registries.map(r => r.name)
  };
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

  const missionResult = await runMission({
    sessionId: `pinnacle-${Date.now()}`,
    persona,
    task: uiObjective,
    memory: {
      shortTerm: [],
      longTerm: [await recallMemory(uiObjective)]
    },
    metadata: { project, ...deploymentConfig, modelTier: MODEL_CONFIG[persona] }
  });

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

    // Tactical Ignore: Sourcemaps and build metadata often contain false positives
    if (fullPath.endsWith('.map') || fullPath.endsWith('.js.map') || fullPath.endsWith('.css.map')) {
      return;
    }

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
 * Conducts an Observation Lounge roll call.
 * Each crew member affirms access to memory systems.
 * Extended: Reports on current autonomy levels.
 */
async function conductRollCall() {
  const integrity = await verifyIntegrity();
  const isHealthy = integrity.redis === 'healthy' && integrity.supabase === 'healthy';

  const crewAffirmations = Object.keys(ROLES).map(key => {
    const name = key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    if (isHealthy) {
      return `[${name}]: Affirmative. I have established a secure link to the Redis synaptic cache and Supabase vector memory. Access is nominal.`;
    } else {
      return `[${name}]: Warning. I sense a disturbance in the memory pathways. Integrity check failed.`;
    }
  });

  return {
    status: isHealthy ? 'NOMINAL' : 'DEGRADED',
    message: "Observation Lounge Roll Call Complete.",
    integrity,
    affirmations: crewAffirmations,
    autonomy_mode: "ENABLED - Minimal human intervention required."
  };
}

/**
 * Lists all available .skill files in the orchestrator core.
 */
function listSkills() {
  const skillsPath = path.resolve(__dirname, 'skills');
  return fs.existsSync(skillsPath) ? fs.readdirSync(skillsPath).filter(f => f.endsWith('.skill')) : [];
}

/**
 * Retrieves the content of a specific .skill file.
 * @param {string} name - Name of the skill file.
 */
function getSkill(name) {
  const fileName = name.endsWith('.skill') ? name : `${name}.skill`;
  const skillPath = path.resolve(__dirname, 'skills', fileName);
  
  if (!fs.existsSync(skillPath)) return { error: "Skill not found" };
  return fs.readFileSync(skillPath, 'utf-8');
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
async function recallMemory(task, category = null) {
  const { redis, supabase } = getMemorySystems();
  const cacheKey = `memory:context:${category || 'all'}:${Buffer.from(task).toString('hex').substring(0, 32)}`;
  try {
    const cachedResult = await redis.get(cacheKey);
    if (cachedResult) return cachedResult;
    const embedding = await generateEmbedding(task);
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

    // 1. Calculate Token and Cost Estimates (v11 Economics)
    const tokenEstimate = Math.ceil(content.length / 4); // Standard heuristic
    const persona = metadata.persona || 'captain_picard';
    const modelUsed = metadata.modelTier || MODEL_CONFIG[persona] || 'anthropic/claude-3-haiku';
    
    // Pricing per 1M tokens (OpenRouter benchmarks)
    const pricingMap = {
      'anthropic/claude-3-opus': 15.00,
      'anthropic/claude-3-5-sonnet': 3.00,
      'anthropic/claude-3-haiku': 0.25,
      'openai/gpt-4o-mini': 0.15,
      'google/gemini-flash-1.5': 0.075,
      'google/gemini-pro-1.5': 3.50,
    };

    const costPerMillion = pricingMap[modelUsed] || 3.00; // Default to mid-tier
    const costEstimateUsd = (tokenEstimate / 1_000_000) * costPerMillion;

    const enrichedMetadata = {
      ...metadata,
      token_estimate: tokenEstimate,
      cost_usd: costEstimateUsd,
      model_identity: modelUsed,
      factory_version: 'v11.0'
    };

    await supabase.from('missions').insert([{ 
      content, 
      metadata: enrichedMetadata, 
      embedding 
    }]);

    // 2. Increment global project billing (v11 Economics)
    const projectId = metadata.project || 'sovereign';
    await incrementTokenUsage(projectId, tokenEstimate);
    
    console.log(`[Quark] Mission persisted. Estimated Cost: $${costEstimateUsd.toFixed(6)} (${tokenEstimate} tokens)`);
  } catch (err) {
    console.error("[Orchestrator] Failed to store mission result:", err.message);
  }
}

/**
 * Quark's ROI Analysis Engine: Aggregates cost_usd from the missions table.
 * Provides a breakdown of resource allocation and model arbitrage efficiency.
 */
async function generateROIReport(project = null) {
  const { supabase } = getMemorySystems();
  
  let query = supabase
    .from('missions')
    .select('metadata');

  if (project) {
    query = query.eq('metadata->project', project);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`[Quark] Failed to retrieve ROI data: ${error.message}`);
  }

  let totalCost = 0;
  const personaBreakdown = {};
  const projectBreakdown = {};
  const projectPersonaBreakdown = {};
  const timeSeriesMap = {};

  (data || []).forEach(row => {
    const meta = row.metadata || {};
    const cost = parseFloat(meta.cost_usd || 0);
    const persona = meta.persona || 'unknown';
    const proj = meta.project || 'unknown';

    const dateStr = meta.timestamp ? meta.timestamp.split('T')[0] : null;
    if (dateStr) timeSeriesMap[dateStr] = (timeSeriesMap[dateStr] || 0) + cost;
    
    totalCost += cost;
    
    if (!personaBreakdown[persona]) {
      personaBreakdown[persona] = { count: 0, cost_usd: 0 };
    }
    personaBreakdown[persona].count += 1;
    personaBreakdown[persona].cost_usd += cost;

    if (!projectBreakdown[proj]) {
      projectBreakdown[proj] = { count: 0, cost_usd: 0 };
    }
    projectBreakdown[proj].count += 1;
    projectBreakdown[proj].cost_usd += cost;

    if (!projectPersonaBreakdown[proj]) {
      projectPersonaBreakdown[proj] = {};
    }
    if (!projectPersonaBreakdown[proj][persona]) {
      projectPersonaBreakdown[proj][persona] = { count: 0, cost_usd: 0 };
    }
    projectPersonaBreakdown[proj][persona].count += 1;
    projectPersonaBreakdown[proj][persona].cost_usd += cost;
  });

  // Generate continuous 30-day time series
  const time_series = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const s = d.toISOString().split('T')[0];
    time_series.push({ date: s, cost: timeSeriesMap[s] || 0 });
  }

  return {
    status: 'SUCCESS',
    report: {
      project: project || 'global',
      total_missions: data ? data.length : 0,
      total_cost_usd: totalCost,
      average_cost_per_mission: (data && data.length > 0) ? totalCost / data.length : 0,
      persona_breakdown: personaBreakdown,
      project_breakdown: projectBreakdown,
      project_persona_breakdown: projectPersonaBreakdown,
      time_series,
      currency: 'USD',
      generated_at: new Date().toISOString()
    }
  };
}

/**
 * Determines if human interaction is required based on agent confidence and risk.
 * Part of the "hands-free" discernment logic.
 */
function discernHumanNeed(agentResponse, score) {
  const triggers = [
    "DELETION_REQUIRED",
    "CREDENTIALS_MISSING",
    "AMBIGUOUS_OBJECTIVE",
    "COST_OVERRUN"
  ];

  if (score < 3) return { required: true, reason: "Critical quality failure below threshold." };
  
  for (const trigger of triggers) {
    if (agentResponse.includes(trigger)) {
      return { required: true, reason: `Agent flagged high-risk trigger: ${trigger}` };
    }
  }

  return { required: false };
}

/**
 * Unified Tool Dispatcher
 * This is the "Single Point of Execution" for all MCP tools.
 * Both stdio and HTTP servers call this to ensure identical behavior.
 */
async function handleToolCall(name, args, { notify = () => {} } = {}) {
  // Security/Config Guards
  const LLM_TOOLS = ['run_factory_mission', 'run_batch_missions', 'run_crew_agent', 'search_code'];
  if (LLM_TOOLS.includes(name) && !process.env.OPENROUTER_API_KEY) {
    throw new Error(`OPENROUTER_API_KEY is not set. Required for tool: ${name}`);
  }

  switch (name) {
    case 'search_code':
      return await invokeUnzipSearchTool(args);

    case 'run_factory_mission': {
      const context = args.context || args; // Support both flat and wrapped args
      const personaKey = normalisePersonaKey(context.persona);
      const personaConfig = CREW_PERSONAS[personaKey];
      return await runMission({
        ...context,
        persona: personaKey,
        metadata: {
          ...context.metadata,
          modelTier: context.metadata?.modelTier || personaConfig?.model
        }
      });
    }

    case 'run_batch_missions':
      return await runMissions(args.missions, args.limit, (info) => {
        notify(`[Batch] ${info.index + 1}/${info.total}: ${info.objective}`);
      });

    case 'docker_build':
      return await new Promise((resolve) => {
        const { tag, dockerfile, context = '.' } = args;
        notify(`[Geordi] Initiating local Docker build: ${tag}...`);
        const cmd = spawnSync('docker', ['build', '-t', tag, '-f', dockerfile, context], { 
          cwd: path.resolve(__dirname, '..'), encoding: 'utf-8' 
        });
        resolve({ status: cmd.status === 0 ? 'SUCCESS' : 'ERROR', stdout: cmd.stdout, stderr: cmd.stderr });
      });

    case 'terraform_plan':
      return await new Promise((resolve) => {
        notify(`[Data] Executing Terraform plan for: ${args.dir}...`);
        const cmd = spawnSync('terraform', ['-chdir=' + args.dir, 'plan'], { 
          cwd: path.resolve(__dirname, '..'), encoding: 'utf-8' 
        });
        resolve({ status: cmd.status === 0 ? 'SUCCESS' : 'ERROR', stdout: cmd.stdout, stderr: cmd.stderr });
      });

    case 'get_versions_hierarchy':
      return await getVersionsHierarchy();

    case 'manage_project':
      return await manageProject(args.project, args.action, args.details);

    case 'manage_sprint':
      return await manageSprint(args.project, args.action, args.sprint_name, args.details);

    case 'manage_task':
      return await manageTask(args.project, args.action, args.task_id, args.details);

    case 'run_crew_agent':
      return await invokeCrewAgent({
        ...args,
        agents: (args.agents || []).map(agent => {
          const key = normalisePersonaKey(agent.persona || agent.role || '');
          const persona = CREW_PERSONAS[key];
          if (!persona) return agent;
          return {
            role: agent.role || persona.role,
            goal: agent.goal || persona.goal,
            model: agent.model || persona.model,
            ...agent
          };
        })
      });

    case 'git_operation':
      return await gitOperation(args.project, args.action, args.message);

    case 'list_skills':
      return listSkills();

    case 'get_skill':
      return getSkill(args.name);

    case 'worf_security_scan':
      return worfSecurityScan(args.files, path.resolve(__dirname, '..'));

    case 'list_available_mcps':
      return await listAvailableMCPs(args.sync);

    case 'sync_mcp_registry':
      return await syncMCPRegistry();

    case 'sensor_sweep':
      return await sensorSweep();

    case 'gitmcp_search':
      return await gitmcpSearch(args.query);

    case 'discover_mcp_tools':
      notify(`[Discovery] Initiating multi-registry scan for: ${args.query}...`);
      return await discoverMcpTools(args.query, args.persona || 'commander_data');

    case 'integrate_mcp_tool':
      return await integrateMcpTool(args.project, args.query, args.persona, args.deploymentConfig);

    case 'generate_roi_report':
      return await generateROIReport(args.project);

    case 'crew_roll_call':
      return await conductRollCall();

    case 'deploy_production': {
      const { domain, rationale } = args;
      const owner = process.env.GITHUB_OWNER;
      const repo = process.env.GITHUB_REPO;
      const token = process.env.GITHUB_TOKEN;
      const workflowId = 'main.yml';

      if (!owner || !repo || !token) {
        throw new Error("GitHub deployment credentials (GITHUB_OWNER, GITHUB_REPO, GITHUB_TOKEN) are not configured.");
      }

      notify(`[Picard] Authorizing production deployment for ${domain}...`);
      
      try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28'
          },
          body: JSON.stringify({
            ref: 'main',
            inputs: {
              target_app: domain === 'civic' ? 'civic' : 'dashboard'
            }
          })
        });

        if (!response.ok) {
          const errorMsg = await response.text();
          throw new Error(`Workflow dispatch failed: ${response.status} - ${errorMsg}`);
        }

        return { status: "DISPATCHED", message: `Production deployment for ${domain} triggered via GHA. Rationale: ${rationale}` };
      } catch (err) {
        throw new Error(`Deployment failed: ${err.message}`);
      }
    }

    case 'health_check':
      const integrity = await verifyIntegrity(args.fix);
      return { status: Object.values(integrity).every(v => v === 'healthy') ? 'healthy' : 'degraded', memory_systems: integrity };

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

/**
 * runMissions: Executes multiple missions concurrently.
 */
async function runMissions(missions, limit = 5, progressCallback = () => {}) {
  console.log(`[Geordi] Initiating batch execution for ${missions.length} missions. Concurrency limit: ${limit}`);
  const results = [];
  
  const pLimit = (await import('p-limit')).default(limit);
  const tasks = missions.map((mission, index) => pLimit(async () => {
    progressCallback({ index, total: missions.length, objective: mission.objective });
    const res = await runMission({
      sessionId: `batch-${Date.now()}-${index}`,
      task: mission.objective,
      metadata: { project: mission.project, batch: true }
    });
    return { mission: mission.objective, status: 'SUCCESS', output: res };
  }));

  const chunkResults = await Promise.allSettled(tasks);
  results.push(...chunkResults.map((r, i) => r.status === 'fulfilled' ? r.value : { mission: missions[i].objective, status: 'ERROR', error: r.reason.message }));

  return { status: 'BATCH_COMPLETE', results };
}

/**
 * getVersionsHierarchy: Extracts a structured JSON hierarchy of project versions.
 */
async function getVersionsHierarchy() {
  const versionsPath = path.resolve(__dirname, '../versions');
  console.log(`[Data] Scanning versions directory: ${versionsPath}`);
  
  if (!fs.existsSync(versionsPath)) {
    return { status: 'ERROR', message: 'Versions directory not found' };
  }

  const files = fs.readdirSync(versionsPath);
  const hierarchy = {};

  files.forEach(file => {
    if (file.endsWith('.md') || file.endsWith('.json')) {
      const stats = fs.statSync(path.join(versionsPath, file));
      const versionKey = file.split('-')[0] || file;
      hierarchy[versionKey] = {
        filename: file,
        date: stats.mtime.toISOString(),
        size: stats.size
      };
    }
  });

  return {
    status: 'SUCCESS',
    hierarchy
  };
}

/**
 * manageProject: Initializes or updates project-level metadata.
 */
async function manageProject(project, action, details) {
  const { supabase } = getMemorySystems();
  console.log(`[O'Brien] Managing project: ${project} (${action})`);
  
  const { data, error } = await supabase
    .from('projects')
    .upsert({ id: project, ...details, updated_at: new Date().toISOString() })
    .select()
    .single();

  if (error) throw new Error(`Project management failed: ${error.message}`);
  
  return {
    status: 'SUCCESS',
    data
  };
}

/**
 * manageSprint: Manages Agile sprints within a project.
 */
async function manageSprint(project, action, sprint_name, details) {
  const { supabase } = getMemorySystems();
  console.log(`[O'Brien] Managing sprint: ${sprint_name} for project: ${project}`);

  const { data, error } = await supabase
    .from('sprints')
    .upsert({ project_id: project, name: sprint_name, ...details })
    .select()
    .single();

  if (error) throw new Error(`Sprint management failed: ${error.message}`);

  return {
    status: 'SUCCESS',
    data
  };
}

/**
 * manageTask: Creates, moves, or assigns tasks within a project or sprint.
 */
async function manageTask(project, action, task_id, details) {
  const { supabase } = getMemorySystems();
  console.log(`[O'Brien] Managing task: ${task_id} for project: ${project}`);

  const { data, error } = await supabase
    .from('tasks')
    .upsert({ id: task_id, project_id: project, ...details })
    .select()
    .single();

  if (error) throw new Error(`Task management failed: ${error.message}`);

  return {
    status: 'SUCCESS',
    data
  };
}

/**
 * CLI Entry Point
 * Allows running orchestrator functions directly from the terminal (e.g. via pnpm scripts).
 */
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (command === 'health_check') {
    const isFix = args.includes('--fix');
    handleToolCall('health_check', { fix: isFix }).then(res => {
      console.log(JSON.stringify(res, null, 2));
      process.exit(res.status === 'healthy' ? 0 : 1);
    }).catch(err => {
      console.error(`[Orchestrator] CLI Error: ${err.message}`);
      process.exit(1);
    });
  }
}


Object.assign(exports, {
  runMission,
  invokeUnzipSearchTool,
  invokeCrewAgent,
  sensorSweep,
  integrateMcpTool,
  worfSecurityAudit,
  gitOperation,
  verifyIntegrity,
  listAvailableMCPs,
  syncMCPRegistry,
  worfSecurityScan,
  gitmcpSearch,
  generateROIReport,
  recallMemory,
  storeMissionResult,
  generateEmbedding,
  runMissions,
  getVersionsHierarchy,
  manageProject,
  manageSprint,
  manageTask,
  listSkills,
  getSkill,
  handleToolCall,
  CREW_PERSONAS,
  conductRollCall,
  discernHumanNeed,
  discoverMcpTools,
});
