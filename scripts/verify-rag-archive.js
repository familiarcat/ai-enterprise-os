/**
 * verify-rag-archive.js
 * @generated_by SovereignFactory
 * @domain engineering
 * @layer testing
 */

require('dotenv').config();
const { recallMemory } = require('../core/orchestrator.js');

/**
 * Commander Data's verification tool to ensure that the archived legacy skills 
 * are correctly indexed and searchable via the RAG system.
 */
async function verifyArchiveSearch() {
  console.log('🖖 [Commander Data] Initiating vector search query against the missions repository...');

  // Search query targeting the implementation details of the old MissionRepository.js
  const query = "MissionRepository saveMissionData implementation using Supabase handle from index.js";
  
  try {
    const memory = await recallMemory(query);
    
    if (memory && memory.includes('[LEGACY SKILL ARCHIVE]')) {
      console.log('\n✅ [Verification Successful]: The RAG system correctly identified the archived MissionRepository logic.');
      console.log('--- Synaptic Retrieval Fragment ---');
      const lines = memory.split('\n');
      console.log(lines.slice(0, 15).join('\n') + '\n...');
    } else {
      console.warn('\n⚠️ [Verification Alert]: Search returned results, but the specific legacy archive was not found.');
      console.log('Context retrieved fragment:', memory.substring(0, 300) + '...');
    }
  } catch (error) {
    console.error('\n❌ [Tactical Error]: Synaptic retrieval failed:', error.message);
  }
}

verifyArchiveSearch();