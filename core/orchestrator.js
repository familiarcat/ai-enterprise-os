const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * Lazy-load Memory Systems to allow structural tasks without DB drivers
 */
let _redis = null;
let _supabase = null;

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

function getMemorySystems() {
  if (!_redis) {
    const Redis = require('ioredis');
    const rawUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    const redisUrl = rawUrl.trim();
    
    // AWS ElastiCache Serverless requires TLS (rediss://) and the tls option object
    const useTls = redisUrl.toLowerCase().includes('rediss://') || redisUrl.toLowerCase().includes('cache.amazonaws.com');
    const connectionString = redisUrl.includes('://') ? redisUrl : `${useTls ? 'rediss' : 'redis'}://${redisUrl}`;
    const redisOptions = useTls ? { tls: {} } : {};

    _redis = new Redis(connectionString, redisOptions);
    // Handle connection errors to prevent process crashes from unhandled EventEmitter errors
    _redis.on('error', (err) => console.error('[Redis] Connection Error:', err.message));
  }
  if (!_supabase) {
    const { createClient } = require('@supabase/supabase-js');
    _supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_KEY || ''
    );
  }
  return { redis: _redis, supabase: _supabase };
}

/**
 * Verifies the integrity of external memory connections (Redis and Supabase).
 */
async function verifyIntegrity() {
  const { redis, supabase } = getMemorySystems();
  const report = { redis: 'checking', supabase: 'checking', openrouter: 'checking', env: 'checking' };

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

  return report;
}

/**
 * Agent Role Definitions
 */
const ROLES = {
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
  TIER_ANALYSIS:   process.env.MODEL_ANALYST      || 'google/gemini-flash-1.5',   // High context, low cost
  TIER_STRATEGIC:  process.env.MODEL_ARCHITECT    || 'anthropic/claude-3-haiku', // Fast reasoning
  TIER_PRODUCTION: process.env.MODEL_DEVELOPER    || 'anthropic/claude-3-5-sonnet', // Maximum coding accuracy
  TIER_CRITIQUE:   process.env.MODEL_QA_AUDITOR   || 'openai/gpt-4o-mini',       // High detail, low cost
  TIER_EMBEDDING:  process.env.MODEL_EMBEDDING    || 'openai/text-embedding-3-small',
  // Legacy mappings for backward compatibility
  ...Object.fromEntries(Object.entries({ ANALYST: 'TIER_ANALYSIS', ARCHITECT: 'TIER_STRATEGIC', DEVELOPER: 'TIER_PRODUCTION', CRITIC: 'TIER_CRITIQUE' }).map(([k, v]) => [k, process.env[`MODEL_${k}`] || '']))
};

/**
 * Internal helper to ensure the Python environment is available before execution.
 */
function getPythonBin() {
  const bin = process.env.PYTHON_BIN || 'python3';
  
  // If a specific path is provided but doesn't exist, fail early
  if (process.env.PYTHON_BIN && !fs.existsSync(process.env.PYTHON_BIN)) {
    throw new Error(
      `[Env Error] Configured PYTHON_BIN not found at: ${process.env.PYTHON_BIN}\n` +
      `Current WorkDir: ${process.cwd()}\n` +
      `Please run: python3 -m venv .venv && ./.venv/bin/pip install crewai langchain-openai`
    );
  }
  return bin;
}

/**
 * Internal helper to ensure the Python environment is available before execution.
 */
function verifyPythonEnv() {
  getPythonBin();
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
  return new Promise((resolve, reject) => {
    const commands = {
      commit: ['add', '.', '&&', 'git', 'commit', '-m', `"${message}"`],
      push: ['push', 'origin', 'main'],
      status: ['status']
    };

    const args = commands[action] || commands.status;
    const child = spawn('git', args, { shell: true, cwd: path.resolve(__dirname, '..') });

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

async function runMission(project, objective){
  const versionsPath = path.resolve(__dirname, '../versions');
  const projectPath = path.resolve(__dirname, '..');

  // 1. Analyst Phase: Concurrent data ingestion
  const [setupDocs, initScript, history, currentStructure, memory] = await Promise.all([
    invokeUnzipSearchTool({
      path: project,
      function_name: 'Setup',
      include_exts: ['.md', '.ts', '.tsx'],
      item_type: 'constant' // Look for setup constants or headers
    }),
    invokeUnzipSearchTool({
      path: project,
      function_name: 'init',
      include_exts: ['.sh']
    }),
    analyzeEvolution(versionsPath, projectPath),
    invokeUnzipSearchTool({ path: projectPath, function_name: 'root', return_tree: true }),
    recallMemory(objective) // New step for Supabase/Redis integration
  ]);

  // 2. Architect Phase: Validation and Planning
  // 2a. QA Audit: Review memory and history to provide scaffolding suggestions
  const suggestions = await auditPastMissions(objective, history, memory);

  const plan = "Plan for " + objective
  const execution = setupDocs.includes('--- Found') ? "Execution context extracted from documentation" : "Executed without specific documentation"
  const validation = initScript.includes('--- Found') ? "Operational scripts validated successfully" : "No operational scripts identified for validation"
  const decision = (setupDocs.includes('--- Found') || initScript.includes('--- Found') || history !== "No evolutionary data extracted.") 
    ? "Approved: Mission context verified via documentation, scripts, and evolutionary history (QA Audit Applied)" 
    : "Approved: Proceeding with default mission parameters"

  // 3. Developer Phase: Scaffolding and Implementation
  if (objective.toLowerCase().includes('create') || objective.toLowerCase().includes('new')) {
    const name = objective.split(' ').pop();
    const lockKey = `factory:lock:domain:${name.toLowerCase()}`;

    // If the objective is to initialize the dashboard, use specific backbone
    if (name.toLowerCase() === 'dashboard') {
      await enforceBackboneStructure(path.resolve(projectPath, 'apps/dashboard'), 'dashboard', 'Dashboard');
    }

    const { redis } = getMemorySystems();
    // Redis-based locking mechanism to prevent duplicate scaffolding
    const acquired = await redis.set(lockKey, 'locked', 'NX', 'EX', 60);
    
    if (acquired) {
      try {
        const content = await generateComponentContent(objective, history, suggestions);
        await scaffoldDDDComponent(name, content);
      } finally {
        // Release lock after completion or failure
        await redis.del(lockKey);
      }
    } else {
      console.warn(`[Lock] Domain ${name} is already being scaffolded by another mission.`);
    }
  }

  let result = { plan, execution, validation, decision, history };

  // 4. Observation Lounge: Post-mission reflection and meta-learning
  const observation = await conductObservationLounge(objective, result);
  result.observation = observation;

  // Persist the successful mission outcome to long-term vector memory
  await storeMissionResult(`Objective: ${objective}\nDecision: ${decision}\nReflection: ${observation.summary}`, {
    project,
    objective,
    score: observation.score
  });

  return result;
}

/**
 * Recalls historical data from both 'missions' and 'observations' tables.
 * Uses Redis as a primary cache to minimize OpenRouter embedding costs.
 * 
 * @param {string} objective - The mission objective to search for.
 */
async function recallMemory(objective) {
  const { redis, supabase } = getMemorySystems();
  
  // 1. Cost-Effective Check: Is this context already in Redis?
  // We use a hash of the objective to create a stable cache key
  const cacheKey = `memory:context:${Buffer.from(objective).toString('hex').substring(0, 32)}`;
  
  try {
    const cachedResult = await redis.get(cacheKey);
    if (cachedResult) {
      console.log(`[Memory] Cache Hit: Retrieved context from Redis for "${objective.substring(0, 20)}..."`);
      return cachedResult;
    }

    // 2. Generate embedding (Only if cache misses)
    const embedding = await generateEmbedding(objective);
    if (!embedding) return "Memory recall unavailable (embedding failed).";

    // 3. Concurrent Retrieval: Search both Experience (Missions) and Insights (Observations)
    const [missionRes, observationRes] = await Promise.all([
      supabase.rpc('match_missions', {
        query_embedding: embedding,
        match_threshold: 0.4,
        match_count: 3,
      }),
      supabase.rpc('match_observations', {
        query_embedding: embedding,
        match_threshold: 0.4,
        match_count: 3,
      })
    ]);

    let contextBlocks = [];

    if (missionRes.data?.length > 0) {
      contextBlocks.push(...missionRes.data.map(m => `[Historical Mission]: ${m.content}`));
    }

    if (observationRes.data?.length > 0) {
      contextBlocks.push(...observationRes.data.map(o => `[System Insight - ${o.crew_member}]: ${o.summary}\nKey Findings: ${o.key_findings?.join(', ')}`));
    }

    const finalContext = contextBlocks.length > 0 ? contextBlocks.join('\n\n') : "No relevant past memory found.";

    // 4. Cache the result for 1 hour to prevent redundant LLM/DB calls
    await redis.set(cacheKey, finalContext, 'EX', 3600);
    return finalContext;
  } catch (err) {
    console.error('[Memory] Error during dual-table recall:', err.message);
    return "Memory recall unavailable.";
  }
}

/**
 * QA Auditor reviews memory and history to suggest improvements for the current plan.
 */
async function auditPastMissions(objective, history, memory) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || (history === "No evolutionary data extracted." && memory === "No relevant past memory found in Supabase.")) {
    return "No specific QA suggestions based on history.";
  }

  const prompt = `
${ROLES.QA_AUDITOR}

Objective: ${objective}
Evolutionary Context: ${history}
Past Experiences: ${memory}

Based on these past results, provide 3-5 specific technical suggestions (e.g., naming conventions, specific patterns to avoid, or required dependencies) to optimize the new scaffolding. 
Keep suggestions concise.
`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL_CONFIG.QA_AUDITOR,
        response_format: { type: "text" },
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter QA Audit failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error("QA Audit failed:", error);
    return "Default QA standards applied.";
  }
}

/**
 * Observation Lounge: Conducts a post-mission critique to store meta-learning insights.
 */
async function conductObservationLounge(objective, missionResult) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return { summary: "Observation skipped: No API Key", score: 0 };

  const prompt = `
${ROLES.CRITIC}

Objective: ${objective}
Mission Plan: ${missionResult.plan}
Decision Rationale: ${missionResult.decision}

Review the mission execution above. Per v11 Architecture protocols, provide:
1. A performance score (1-10)
2. Critical weaknesses or technical debt introduced
3. Systemic improvements for future missions
4. A concise "stored_insight" for semantic memory

Return as a JSON object:
{
  "score": number,
  "weaknesses": string[],
  "improvements": string[],
  "summary": string
}
`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL_CONFIG.CRITIC,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) throw new Error(`Observation Lounge failed: ${response.status}`);

    const data = await response.json();
    const observation = JSON.parse(data.choices[0].message.content.trim());
    
    // Persist specifically to the observations table
    await storeObservation(objective, observation);
    
    return observation;
  } catch (error) {
    console.error("[Lounge] Failed to conduct observation:", error.message);
    return { summary: "Reflection failed during execution.", score: 0 };
  }
}

/**
 * Persists structured reflections to the Supabase 'observations' table.
 */
async function storeObservation(objective, observation) {
  try {
    const { supabase } = getMemorySystems();
    const content = `Insight for "${objective}": ${observation.summary}. Improvements: ${observation.improvements.join(', ')}`;
    const embedding = await generateEmbedding(content);
    
    if (!embedding) return;

    const { error } = await supabase
      .from('observations')
      .insert([{
        crew_member: 'System Critic',
        title: `Reflection: ${objective}`,
        summary: observation.summary,
        key_findings: observation.weaknesses,
        recommendations: observation.improvements,
        score: observation.score,
        embedding,
        metadata: { objective, timestamp: new Date().toISOString() }
      }]);

    if (error) throw error;
    console.log(`[Lounge] Insight stored for: ${objective}`);
  } catch (err) {
    // Non-fatal, don't crash the mission if logging the observation fails
    console.error('[Lounge] Persistence Error:', err.message);
  }
}

/**
 * Stores a mission result and its vector embedding in Supabase.
 * 
 * @param {string} content - The text content to vectorize and store.
 * @param {Object} metadata - Additional context for the mission.
 */
async function storeMissionResult(content, metadata = {}) {
  try {
    const { supabase } = getMemorySystems();
    const embedding = await generateEmbedding(content);
    if (!embedding) return;

    const { error } = await supabase
      .from('missions')
      .insert([{
        content,
        metadata,
        embedding
      }]);

    if (error) throw error;
  } catch (err) {
    console.error('[Memory] Failed to store mission result:', err.message);
  }
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
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL_CONFIG.EMBEDDING,
        input: text
      })
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Embedding API failed: ${response.status} - ${errText}`);
    }
    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error("Embedding generation failed:", error);
    return null;
  }
}

/**
 * Generates component content by passing history and objective to an LLM.
 */
async function generateComponentContent(objective, history, suggestions = "") {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn("OPENROUTER_API_KEY not set. Using default template.");
    return {};
  }

  const prompt = `
${ROLES.DEVELOPER}

Objective: ${objective}
Project Evolution Context:
${history}
QA Auditor Suggestions:
${suggestions}

Based on the objective and the project's history, generate high-quality source code for a new DDD business unit.
Return a JSON object with the following keys exactly:
- "domain": source code for model.js (Domain Logic)
- "application": source code for service.js (Application Service)
- "infrastructure": source code for repository.js (Persistence Layer)
- "ui": source code for the React component (.jsx)

Return ONLY the raw JSON object. Do not include markdown code blocks, explanations, or preamble.
`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "AI Enterprise OS",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL_CONFIG.DEVELOPER,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      throw new Error(`Developer LLM call failed: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();

    // More robust JSON extraction from potential markdown padding
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) content = jsonMatch[0];

    return JSON.parse(content);
  } catch (error) {
    console.error("OpenRouter API call failed:", error);
    return {};
  }
}

/**
 * Scaffolds a new DDD and React component structure based on the mission objective.
 */
async function scaffoldDDDComponent(name, generatedLayers = {}) {
  const targetPath = path.resolve(__dirname, `../domains/${name.toLowerCase()}`);

  // Apply the Universal Backbone Structure to the new domain
  await enforceBackboneStructure(targetPath, 'domain', name);

  // Define the full DDD layer structure
  const layers = {
    'domain': 'model.js',
    'application': 'service.js',
    'infrastructure': 'repository.js',
    'ui': `${name}.tsx`,
    'tests': `${name.toLowerCase()}.test.js`,
    'docs': 'architecture.md'
  };
  
  for (const [dir, fileName] of Object.entries(layers)) {
    const dirPath = path.join(targetPath, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const filePath = path.join(dirPath, fileName);
    if (!fs.existsSync(filePath)) {
      let fileContent = "";
      
      if (generatedLayers[dir]) {
        fileContent = generatedLayers[dir];
      } else if (dir === 'ui') {
        fileContent = `import React from 'react';\n\nexport const ${name}: React.FC = () => <div className="p-4 border">Generated ${name} UI Component</div>;`;
      } else {
        // Generate boilerplate for other layers
        fileContent = generateLayerBoilerplate(dir, name);
      }
      
      fs.writeFileSync(filePath, fileContent);
    }
  }
}

/**
 * Universal Backbone Enforcer
 * Organizes any path into a standardized project or domain structure.
 * Inspired by openrouter-crew-platform patterns.
 * 
 * @param {string} targetPath - The absolute path to organize.
 * @param {string} type - 'master' or 'domain'.
 * @param {string} name - The display name for the entity.
 */
async function enforceBackboneStructure(targetPath, type = 'domain', name = 'SovereignEntity') {
  const layouts = {
    master: {
      dirs: ['docs', 'scripts', 'packages/shared', 'packages/ui', 'core', 'tools', 'domains', 'apps/api', 'versions'],
      files: {
        'README.md': `# Sovereign Factory Master\nA self-building AI Enterprise OS inspired by OpenRouter Crew Platform.`,
        'pnpm-workspace.yaml': "packages:\n  - 'apps/*'\n  - 'domains/*'\n  - 'packages/*'\n  - 'core'",
        'requirements.txt': "crewai\nlangchain-openai\nlangchain\n",
        'apps/api/package.json': JSON.stringify({
          name: "@apps/api",
          version: "1.0.0",
          private: true,
          dependencies: {
            "express": "^4.18.2",
            "dotenv": "^16.4.5",
            "@sovereign/shared": "workspace:*",
            "@modelcontextprotocol/sdk": "^0.6.0"
          }
        }, null, 2),
        'packages/ui/package.json': JSON.stringify({
          name: "@sovereign/ui",
          version: "1.0.0",
          private: true,
          peerDependencies: {
            "next": "^14.0.0",
            "react": "^18.2.0"
          }
        }, null, 2),
        'packages/ui/index.ts': "export * from './src/VersionTree';",
        'packages/ui/src/VersionTree.tsx': `import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export const VersionTree = ({ hierarchy }: { hierarchy: any }) => {
  const router = useRouter();
  const { id: currentId } = router.query;
  const versions = Object.keys(hierarchy || {}).filter(k => !k.startsWith('.'));

  return (
    <nav className="space-y-2">
      {versions.map((v) => (
        <Link
          key={v}
          href={\`/project/\${v}\`}
          className={\`block px-3 py-2 text-sm font-medium rounded-md transition-all \${
            currentId === v 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }\`}
        >
          <div className="flex items-center justify-between">
            <span className="truncate">Version {v}</span>
            {currentId === v && <span className="w-2 h-2 bg-blue-300 rounded-full animate-pulse" />}
          </div>
        </Link>
      ))}
    </nav>
  );
};`
      }
    },
    dashboard: {
      dirs: ['src/components', 'src/pages', 'src/pages/project', 'src/hooks', 'src/styles', 'src/layouts', 'public'],
      files: {
        'next.config.js': "module.exports = { reactStrictMode: true };",
        'tailwind.config.js': "module.exports = { content: ['./src/**/*.{js,ts,jsx,tsx}'], theme: { extend: {} }, plugins: [] };",
        'tsconfig.json': JSON.stringify({
          compilerOptions: { target: "es5", lib: ["dom", "dom.iterable", "esnext"], allowJs: true, skipLibCheck: true, strict: true, forceConsistentCasingInFileNames: true, noEmit: true, esModuleInterop: true, module: "esnext", moduleResolution: "node", resolveJsonModule: true, isolatedModules: true, jsx: "preserve", incremental: true },
          include: ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
          exclude: ["node_modules"]
        }, null, 2),
        'package.json': JSON.stringify({
          name: "@apps/dashboard",
          version: "1.0.0",
          private: true,
          scripts: {
            "dev": "next dev"
          },
          dependencies: { "next": "^14.0.0", "react": "^18.2.0", "react-dom": "^18.2.0", "@sovereign/ui": "workspace:*" }
        }, null, 2),
        'src/layouts/AdminLayout.tsx': "import React from 'react';\nimport { VersionTree } from '@sovereign/ui';\n\ninterface AdminLayoutProps {\n  children: React.ReactNode;\n  hierarchy: any;\n}\n\nexport const AdminLayout: React.FC<AdminLayoutProps> = ({ children, hierarchy }) => {\n  return (\n    <div className='flex h-screen bg-slate-900 text-white'>\n      <aside className='w-64 border-r border-slate-800 p-4 overflow-y-auto'>\n        <h2 className='text-xl font-bold mb-4 text-blue-400'>Sovereign OS</h2>\n        <VersionTree hierarchy={hierarchy} />\n      </aside>\n      <main className='flex-1 overflow-auto p-8 bg-slate-50 text-slate-900'>\n        {children}\n      </main>\n    </div>\n  );\n};",
        'src/pages/index.tsx': `import React from 'react';
import { AdminLayout } from '../layouts/AdminLayout';

export default function Home({ hierarchy }) {
  return (
    <AdminLayout hierarchy={hierarchy}>
      <h1 className="text-2xl font-bold">Sovereign Factory Dashboard</h1>
      <p className="mt-2 text-slate-600">Welcome to your AI Enterprise OS. Data managed via Server Side state.</p>
    </AdminLayout>
  );
}

export async function getServerSideProps() {
  try {
    const res = await fetch('http://localhost:3001/hierarchy');
    const hierarchy = await res.json();
    return { props: { hierarchy } };
  } catch (err) {
    console.error('Initial hierarchy fetch failed:', err);
    return { props: { hierarchy: {} } };
  }
}`,
        'src/pages/project/[id].tsx': `import React from 'react';
import { AdminLayout } from '../../layouts/AdminLayout';

export default function ProjectDashboard({ id, hierarchy }) {
  return (
    <AdminLayout hierarchy={hierarchy}>
      <h1 className="text-2xl font-bold">Project Dashboard: {id}</h1>
      <div className="mt-4 p-6 bg-white rounded shadow">
        <h2 className="text-lg font-semibold border-b pb-2">Evolutionary Status</h2>
        <p className="mt-2 text-slate-600">Viewing details for project version identified by: {id}</p>
      </div>
    </AdminLayout>
  );
}

export async function getServerSideProps(context) {
  const { id } = context.params;
  try {
    const res = await fetch('http://localhost:3001/hierarchy');
    const hierarchy = await res.json();
    return { props: { id, hierarchy } };
  } catch (err) {
    console.error('Project fetch failed:', err);
    return { props: { id, hierarchy: {} } };
  }
}`
      }
    },
    domain: {
      dirs: ['domain', 'application', 'infrastructure', 'ui', 'tests', 'docs', 'tools'],
      files: {
        'README.md': `# ${name} Domain\nAutonomous business unit generated by the Sovereign Factory.`,
        'package.json': JSON.stringify({
          name: `@domains/${name.toLowerCase()}`,
          version: "1.0.0",
          private: true,
          dependencies: { "@sovereign/shared": "workspace:*" }
        }, null, 2),
        '.gitignore': "node_modules\n/dist\n.env\n.DS_Store",
        'vitest.config.js': "import { defineConfig } from 'vitest/config';\n\nexport default defineConfig({\n  test: {\n    environment: 'node',\n    globals: true,\n  },\n});"
      }
    }
  };

  const layout = layouts[type] || layouts.domain;

  // 1. Ensure Directory Structure
  layout.dirs.forEach(dir => {
    const dirPath = path.join(targetPath, dir);
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
  });

  // 2. Ensure Vital Backbone Files
  Object.entries(layout.files).forEach(([file, content]) => {
    const filePath = path.join(targetPath, file);
    let shouldWrite = !fs.existsSync(filePath);
    if (!shouldWrite) {
      const existing = fs.readFileSync(filePath, 'utf-8').trim();
      if (existing === "" || existing === "{}") shouldWrite = true;
    }
    if (shouldWrite) fs.writeFileSync(filePath, content);
  });
}

function generateLayerBoilerplate(layer, name) {
  const pascalName = name.charAt(0).toUpperCase() + name.slice(1);

  const templates = {
    domain: `/**
 * ${pascalName} Domain Entity
 * Encapsulates core business logic and state for the ${name} domain.
 */
export class ${pascalName} {
  constructor({ id, createdAt = new Date(), ...data }) {
    this.id = id || Math.random().toString(36).substr(2, 9);
    this.createdAt = createdAt;
    this.state = 'initial';
    this.data = data;
  }

  /**
   * Primary business logic for ${pascalName}
   */
  process() {
    console.log(\`Processing logic for ${pascalName} entity: \${this.id}\`);
    this.state = 'processed';
    return this;
  }

  validate() {
    if (!this.id) throw new Error("${pascalName} must have a valid identifier.");
    return true;
  }

  toJSON() {
    return { id: this.id, state: this.state, ...this.data };
  }
}`,
    application: `/**
 * ${pascalName} Application Service
 * Orchestrates use cases for the ${name} domain.
 */
export const handle${pascalName}Request = async (requestData) => {
  console.log(\`Received application request for ${name}\`);
  
  // Note: Business logic should be performed by the domain entity
  return {
    success: true,
    timestamp: new Date().toISOString()
  };
};`,
    infrastructure: `/**
 * ${pascalName} Infrastructure Repository
 * Handles persistence and external data mapping for ${name}.
 */
export const save${pascalName} = async (entity) => {
  console.log(\`Persisting ${pascalName} entity \${entity.id} to storage...\`);
  
  return new Promise((resolve) => {
    setTimeout(() => resolve(true), 150);
  });
};`,
    tests: `import { describe, it, expect } from 'vitest';
import { ${pascalName} } from '../domain/model';

describe('${pascalName} Domain', () => {
  it('should initialize correctly', () => {
    const entity = new ${pascalName}({ id: 'test-123' });
    expect(entity.id).toBe('test-123');
    expect(entity.state).toBe('initial');
  });

  it('should process logic', () => {
    const entity = new ${pascalName}({ id: 'test-123' });
    entity.process();
    expect(entity.state).toBe('processed');
  });
});`,
    docs: `# ${pascalName} Domain Documentation

This document describes the architectural decisions and implementation details for the ${name} business unit.

## Responsibilities
- Encapsulates ${name} business rules within the Domain Entity.
- Provides a unified API via the Application Service.
- Manages persistence and external integrations through the Infrastructure Repository.
`
  };
  return templates[layer] || "";
}

/**
 * Executes multiple missions with a concurrency limit.
 * 
 * @param {Array<{project: string, objective: string}>} missions - Array of mission parameters.
 * @param {number} limit - Maximum number of concurrent missions (default is 5).
 * @param {Function} onProgress - Optional callback triggered after each mission completes.
 * @returns {Promise<Array>} The results of all missions.
 */
async function runMissions(missions, limit = 5, onProgress = null) {
  const results = new Array(missions.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < missions.length) {
      const i = currentIndex++;
      const { project, objective } = missions[i];
      results[i] = await runMission(project, objective);
      if (onProgress) {
        onProgress({ index: i, total: missions.length, project, objective });
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, missions.length) }, worker);
  await Promise.all(workers);

  // Leverage pnpm recursive commands to batch test all domains after mission completion
  try {
    const testSummary = await runBatchTests();
    return {
      missions: results,
      testSummary
    };
  } catch (error) {
    return {
      missions: results,
      testError: error.message
    };
  }
}

/**
 * Runs pnpm recursive test command filtered to the domains directory.
 * 
 * @returns {Promise<string>} Standard output from the test runner.
 */
function runBatchTests() {
  return new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['-r', 'test', '--filter', './domains/**']);

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => stdout += data.toString());
    child.stderr.on('data', (data) => stderr += data.toString());

    child.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr || `pnpm recursive test failed with code ${code}`));
    });

    child.on('error', (err) => reject(new Error(`Failed to initiate pnpm: ${err.message}`)));
  });
}

/**
 * Analyzes the evolution of the project by reviewing decisions in previous versions.
 * 
 * @param {string} versionsFolder - Path to the folder containing project versions.
 * @param {string} rootPath - Path to the project root to save the summary.md file.
 * @returns {Promise<string>} A summary of the extracted evolutionary data.
 */
async function analyzeEvolution(versionsFolder, rootPath) {
  if (!fs.existsSync(versionsFolder)) return "No evolutionary data extracted.";
  
  // Use localeCompare with numeric: true for natural sorting (v1, v2, v10)
  const versions = fs.readdirSync(versionsFolder)
    .filter(f => !f.startsWith('.'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  const summaries = [];

  for (const version of versions) {
    const versionPath = path.join(versionsFolder, version);
    // Get both the decisions and the structural layout of the version
    const [context, tree, observations] = await Promise.all([
      invokeUnzipSearchTool({
        path: versionPath,
        function_name: 'Decisions',
        include_exts: ['.md'],
        max_lines: 100
      }),
      invokeUnzipSearchTool({
        path: versionPath,
        function_name: 'root',
        return_tree: true
      }),
      // Hydrate the evolution with previous Critic observations if available
      recallMemory(`Evolutionary critique for version ${version}`)
    ]);

    if (context.includes('--- Found') || tree.includes('--- Scanned')) {
      summaries.push(`--- Evolution Step: ${version} ---\n[STRUCTURE]\n${tree}\n[DECISIONS]\n${context}\n[CRITIQUE]\n${observations}`);
    }
  }

  const evolutionContent = summaries.length > 0 ? summaries.join('\n\n') : "No evolutionary data extracted.";

  if (rootPath) {
    const summaryFile = path.join(rootPath, 'summary.md');
    const header = `# Project Evolution Summary\n\nGenerated: ${new Date().toISOString()}\n\n`;
    fs.writeFileSync(summaryFile, header + evolutionContent);
  }

  return evolutionContent;
}

/**
 * Extracts a structured hierarchy of all project versions in the /versions folder.
 * Used to build a dashboard UI for analyzing project evolution.
 * 
 * @returns {Promise<Object>} A JSON object mapping version names to their directory trees.
 */
async function getVersionsHierarchy() {
  const versionsPath = path.resolve(__dirname, '../versions');
  if (!fs.existsSync(versionsPath)) return { error: "Versions folder not found" };

  const versions = fs.readdirSync(versionsPath)
    .filter(f => !f.startsWith('.'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  const hierarchy = {};
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'factory-hierarchy-'));

  try {
    for (const version of versions) {
      const versionPath = path.join(versionsPath, version);
      const jsonPath = path.join(tmpDir, `${version}.json`);

      await invokeUnzipSearchTool({
        path: versionPath,
        function_name: 'root',
        return_tree: true,
        tree_json_path: jsonPath
      });

      if (fs.existsSync(jsonPath)) {
        hierarchy[version] = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      }
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  return hierarchy;
}

/**
 * Project Management: Manage Project Context
 */
async function manageProject(project, action, details = {}) {
  const objective = `${action} project context for "${project}" with details: ${JSON.stringify(details)}`;
  return await runMission(project, objective);
}

/**
 * Project Management: Manage Agile Sprint
 */
async function manageSprint(project, action, sprintName, details = {}) {
  const objective = `${action} sprint "${sprintName}" for project "${project}"`;
  return await runMission(project, objective);
}

/**
 * Project Management: Manage Task
 */
async function manageTask(project, action, taskId, details = {}) {
  const identifier = taskId || "new task";
  const objective = `${action} task "${identifier}" for project "${project}" with details: ${JSON.stringify(details)}`;
  return await runMission(project, objective);
}

module.exports = { 
  runMission, invokeUnzipSearchTool, invokeCrewAgent, runMissions, 
  analyzeEvolution, scaffoldDDDComponent, storeMissionResult, 
  getVersionsHierarchy, recallMemory, auditPastMissions, 
  enforceBackboneStructure, getMemorySystems, resetMemorySystems,
  manageProject, manageSprint, manageTask,
  gitOperation, verifyIntegrity
}
