const { handleToolCall } = require('./core/orchestrator');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

async function runSweep() {
  console.log("[O'Brien] Initiating level 1 sensor sweep...");
  try {
    const result = await handleToolCall('sensor_sweep', {});
    console.log("\n[Sweep Report]:\n", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("[O'Brien] Sweep failed:", err.message);
  }
}

if (require.main === module) {
  runSweep();
}