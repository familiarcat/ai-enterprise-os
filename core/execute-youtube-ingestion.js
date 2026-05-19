const { handleToolCall } = require('./orchestrator');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function runYoutubeBatchIngestion() {
  const urls = [
    "https://www.youtube.com/watch?v=EsTrWCV0Ph4",
    // Add more URLs here to activate batch processing
  ];
  const project = process.env.ACTIVE_PROJECT_ID || 'architecture-evolution';

  console.log("═══════════════════════════════════════════════════");
  console.log("  [Captain Picard] Initiating Batch Resource Ingestion...");
  console.log(`  Targets: ${urls.length} video(s)`);
  console.log("═══════════════════════════════════════════════════\n");

  const summaries = [];

  for (const url of urls) {
    try {
      console.log(`\n[Bridge] Processing: ${url}`);
      const result = await handleToolCall('ingest_youtube_deep', {
        url,
        project
      }, {
        notify: (m) => console.log(`  > ${m.data || m}`)
      });

      console.log(`  ✔ Ingestion Complete for ${url}`);
      summaries.push(result.summary);
    } catch (err) {
      console.error(`  ❌ Ingestion Failed for ${url}:`, err.message);
    }
  }

  if (summaries.length === 0) {
    console.log("\n[Captain Picard] No data ingested. Aborting ADR synthesis.");
    return;
  }

  // Phase 2: Observation Lounge Discussion
  console.log("\n[Captain Picard] Convening Observation Lounge for Synaptic Integration...");
  
  try {
    const loungeResult = await handleToolCall('conduct_observation_lounge', {
      context: summaries.join('\n\n---\n\n'),
      focus: "Integration of MCP standards into ai-enterprise-os file structure and tool discovery logic."
    }, {
      notify: (m) => console.log(`  > ${m.data || m}`)
    });

    console.log("\n═══════════════════════════════════════════════════");
    console.log("  OBSERVATION LOUNGE SESSION: MCP SYNAPTIC INTEGRATION");
    console.log("═══════════════════════════════════════════════════");
    console.log(loungeResult.debate);
  } catch (err) {
    console.error("\n❌ Lounge Session Failed:", err.message);
  }

  // Phase 3: ADR Generation
  console.log("\n[Bridge] Requesting Commander Data to codify results...");
  
  const adrObjective = `
    [ADR GENERATION MISSION]: 
    Based on the technical 'Conceptets' and 'Refactor Theory' extracted from the following YouTube ingestion summaries, 
    generate a formal Architectural Decision Record (ADR) in the /versions directory.
    
    INGESTION SUMMARIES:
    ${summaries.join('\n\n---\n\n')}
    
    ADR REQUIREMENTS:
    1. Document the "Warp Speed Protocol" (Standardized Context + Model Fluidity).
    2. Explain how MCP standardization allows for model arbitrage (Haiku/Flash for routing, Sonnet/Opus for synthesis).
    3. Detail the phased approach: Semantic Routing, Lightweight Evaluation, and Token Pruning.
    4. Propose specific refactor actions for core/orchestrator.js and core/memory.js.
  `;

  try {
    const adrResult = await handleToolCall('run_factory_mission', {
      sessionId: `adr-synthesis-${Date.now()}`,
      persona: 'commander_data',
      task: adrObjective,
      metadata: { project, domain: 'architecture-evolution' }
    }, {
      notify: (m) => console.log(`  > ${m.data || m}`)
    });

    console.log("\n[ADR Synthesis Complete]");
    console.log("Status:", adrResult.status);
    console.log("\n[Sovereign Factory ADR Recommendation]:\n", adrResult.content?.[0]?.text || "ADR content pending.");
  } catch (err) {
    console.error("\n❌ ADR Synthesis Failed:", err.message);
  }
}

runYoutubeBatchIngestion();