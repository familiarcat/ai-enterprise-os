/**
 * test-memory-retrieval.js
 * 
 * Verifies that the Orchestrator can retrieve seeded missions from Supabase.
 * Handles environment loading and tests both the abstract recallMemory function
 * and direct database connectivity.
 */
require('dotenv').config();
const { recallMemory, getMemorySystems } = require('../core/orchestrator');

async function runDiagnostics() {
  console.log("🚀 Initializing Memory Retrieval Test...\n");

  const { supabase } = getMemorySystems();

  // 1. Check Table Population
  console.log("--- Step 1: Checking Database Population ---");
  const { data: countData, error: countError, count } = await supabase
    .from('missions')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error("❌ Error accessing 'missions' table:", countError.message);
    process.exit(1);
  }
  console.log(`✅ Success: Found ${count} missions in the database.\n`);

  // 2. Test RPC match_missions directly (Bypassing LLM Embedding)
  // This confirms the PostgreSQL vector math and RPC are configured correctly.
  console.log("--- Step 2: Testing Vector Similarity RPC (Direct) ---");
  const dummyQueryVector = Array(1536).fill(0.01); // Matches the 'infrastructure' seed mission
  
  const { data: rpcMatches, error: rpcError } = await supabase.rpc('match_missions', {
    query_embedding: dummyQueryVector,
    match_threshold: 0.9, // High threshold because it's an exact match
    match_count: 1
  });

  if (rpcError) {
    console.error("❌ RPC match_missions failed:", rpcError.message);
  } else if (rpcMatches && rpcMatches.length > 0) {
    console.log(`✅ Success: Retrieved seeded mission via vector match: "${rpcMatches[0].content.substring(0, 50)}..."`);
  } else {
    console.log("⚠️ RPC returned 0 matches for the dummy vector.");
  }
  console.log("");

  // 3. Test Orchestrator recallMemory (Full Integration)
  console.log("--- Step 3: Testing Orchestrator recallMemory (Full Integration) ---");
  const objective = "infrastructure setup and docker connectivity";
  console.log(`Searching for: "${objective}"`);
  
  try {
    const memoryResult = await recallMemory(objective);
    console.log("Orchestrator Output:");
    console.log(memoryResult);
    console.log("\n✅ Integration test complete.");
  } catch (err) {
    console.error("❌ Orchestrator recall failed:", err.message);
  }
}

runDiagnostics().catch(err => console.error("Fatal test error:", err));