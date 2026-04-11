const { execSync } = require('child_process');
const path = require('path');

/**
 * Bridge to invoke the Python-based UnzipSearchTool.
 * Allows JS agents to search through codebases and archives.
 * 
 * @param {Object} options - Tool parameters (path, function_name, item_type, etc.)
 * @returns {string} The found code block or search results.
 */
function invokeUnzipSearchTool(options) {
  const scriptPath = path.resolve(__dirname, '../tools/unzip_search_tool.py');
  const jsonArgs = JSON.stringify(options);
  
  try {
    // Execute the Python script and capture output
    const result = execSync(`python3 "${scriptPath}" '${jsonArgs.replace(/'/g, "'\\''")}'`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large code blocks
    });
    return result;
  } catch (error) {
    throw new Error(`Failed to run UnzipSearchTool: ${error.stderr || error.message}`);
  }
}

async function runMission(project, objective){
  const plan = "Plan for " + objective
  const execution = "Executed: " + plan
  const validation = "Validated: " + execution
  const decision = "Approved: " + validation

  return { plan, execution, validation, decision }
}

module.exports = { runMission, invokeUnzipSearchTool }
