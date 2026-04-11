const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { createClient } = require('@supabase/supabase-js');
const Redis = require('ioredis');

// Initialize Memory Systems
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || ''
);

/**
 * Agent Role Definitions
 */
const ROLES = {
  ANALYST: "You are an Expert System Analyst. Your goal is to review project evolution and structure to identify patterns.",
  ARCHITECT: "You are a DDD Architect. Your goal is to validate mission objectives against historical constraints.",
  DEVELOPER: "You are a Senior Full-Stack Developer. Your goal is to generate clean, production-ready DDD code blocks.",
  QA_AUDITOR: "You are a Senior QA Auditor. Your goal is to review past mission outcomes and evolutionary history to provide specific technical suggestions for improving the current scaffolding plan."
};

/**
 * Bridge to invoke the Python-based UnzipSearchTool.
 * Allows JS agents to search through codebases and archives.
 * 
 * @param {Object} options - Tool parameters (path, function_name, item_type, etc.)
 * @returns {string} The found code block or search results.
 */
function invokeUnzipSearchTool(options) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(__dirname, '../tools/unzip_search_tool.py');
    const jsonArgs = JSON.stringify(options);

    const child = spawn('python3', [scriptPath]);

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

async function runMission(project, objective){
  const versionsPath = path.resolve(__dirname, '../versions');
  const projectPath = path.resolve(__dirname, '..');

  // 1. Analyst Phase: Concurrent data ingestion
  const [setupDocs, initScript, history, currentStructure, memory] = await Promise.all([
    invokeUnzipSearchTool({
      path: project,
      function_name: 'Setup',
      include_exts: ['.md'],
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

  const result = { plan, execution, validation, decision, history };

  // Persist the successful mission outcome to long-term vector memory
  await storeMissionResult(`Objective: ${objective}\nDecision: ${decision}`, {
    project,
    objective
  });

  return result;
}

/**
 * Recalls historical mission data from Supabase and checks Redis for active session cache.
 * @param {string} objective - The mission objective to search for.
 */
async function recallMemory(objective) {
  try {
    // 1. Generate an embedding for the current objective
    const embedding = await generateEmbedding(objective);
    if (!embedding) return "Memory recall unavailable (embedding failed).";

    // 2. Query Supabase using the vectorized embedding
    const { data: matches, error } = await supabase.rpc('match_missions', {
      query_embedding: embedding,
      match_threshold: 0.5,
      match_count: 3,
    });

    if (error || !matches || matches.length === 0) {
      return "No relevant past memory found in Supabase.";
    }

    return matches.map(m => `[Past Experience]: ${m.content}`).join('\n');
  } catch (err) {
    console.error('[Memory] Error recalling from Supabase:', err.message);
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
        model: "anthropic/claude-3-sonnet",
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error("QA Audit failed:", error);
    return "Default QA standards applied.";
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
        model: "openai/text-embedding-3-small",
        input: text
      })
    });
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
        model: "anthropic/claude-3-sonnet",
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();
    let content = data.choices[0].message.content.trim();

    // Clean up markdown code blocks if the LLM provided them
    content = content.replace(/^```json\n/i, "").replace(/^```\n/i, "").replace(/\n```$/g, "");

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
  const base = path.resolve(__dirname, `../domains/${name.toLowerCase()}`);
  
  // Create package.json for the domain to enable pnpm workspace integration
  if (!fs.existsSync(base)) {
    fs.mkdirSync(base, { recursive: true });
    const pkgJson = {
      name: `@domains/${name.toLowerCase()}`,
      version: "1.0.0",
      private: true,
      dependencies: {
        "@sovereign/shared": "workspace:*"
      }
    };
    fs.writeFileSync(path.join(base, 'package.json'), JSON.stringify(pkgJson, null, 2));
  }

  // Define the full DDD layer structure
  const layers = {
    'domain': 'model.js',
    'application': 'service.js',
    'infrastructure': 'repository.js',
    'ui': `${name}.jsx`
  };
  
  for (const [dir, fileName] of Object.entries(layers)) {
    const dirPath = path.join(base, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const filePath = path.join(dirPath, fileName);
    if (!fs.existsSync(filePath)) {
      let fileContent = "";
      
      if (generatedLayers[dir]) {
        fileContent = generatedLayers[dir];
      } else if (dir === 'ui') {
        fileContent = `export const ${name} = () => <div className="p-4 border">Generated ${name} UI Component</div>;`;
      } else {
        // Generate boilerplate for other layers
        fileContent = generateLayerBoilerplate(dir, name);
      }
      
      fs.writeFileSync(filePath, fileContent);
    }
  }
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
};`
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
    const [context, tree] = await Promise.all([
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
      })
    ]);

    if (context.includes('--- Found') || tree.includes('--- Scanned')) {
      summaries.push(`--- Evolution Step: ${version} ---\n[STRUCTURE]\n${tree}\n[DECISIONS]\n${context}`);
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

module.exports = { runMission, invokeUnzipSearchTool, runMissions, analyzeEvolution, scaffoldDDDComponent, storeMissionResult, getVersionsHierarchy }
