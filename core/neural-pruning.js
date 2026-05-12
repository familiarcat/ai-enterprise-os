#!/usr/bin/env node

/**
 * @generated_by SovereignFactory
 * @domain engineering
 * @layer application
 */

const fs = require('fs');
const path = require('path');

// Access the Shared Kernel and Orchestrator for synaptic memory registration
require('dotenv').config();
const { storeMissionResult } = require('../../core/orchestrator.js');

// Hardened path resolution for script location
const ROOT_DIR = path.resolve(__dirname, '../../');
const MEMORIES_ACTIVE_DIR = path.join(ROOT_DIR, 'crew-memories/active');
const MEMORIES_ARCHIVE_DIR = path.join(ROOT_DIR, 'crew-memories/archive');

async function runPruningProtocol() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Geordi La Forge — Neural Pruning Protocol');
  console.log('  Objective: Archive and Purge Active Memories');
  console.log('═══════════════════════════════════════════════════');

  if (!fs.existsSync(MEMORIES_ACTIVE_DIR)) {
    console.log(`[Geordi] No active neural pathways detected at ${MEMORIES_ACTIVE_DIR}.`);
    process.exit(0);
  }

  if (!fs.existsSync(MEMORIES_ARCHIVE_DIR)) fs.mkdirSync(MEMORIES_ARCHIVE_DIR, { recursive: true });

  console.log('\n[Geordi] Consulting crew for synaptic memory registration...');
  const files = fs.readdirSync(MEMORIES_ACTIVE_DIR).filter(f => f.endsWith('.json'));
  let prunedCount = 0;

  for (const filename of files) {
    const fullPath = path.join(MEMORIES_ACTIVE_DIR, filename);
    const stats = fs.statSync(fullPath);
    
    // Prune files older than 24 hours
    const isOld = (Date.now() - stats.mtimeMs) > 24 * 60 * 60 * 1000;

    if (isOld) {
      console.log(`\n--- Processing Memory: ${filename} ---`);
      const content = fs.readFileSync(fullPath, 'utf-8');
      const memory = JSON.parse(content);

      // Synaptic Archiving: Register the observation in Supabase RAG before deletion
      console.log(`  [Data] Registering active observation in Supabase...`);
      await storeMissionResult(
        `[AUTONOMOUS OBSERVATION ARCHIVE] ${memory.title || filename}\n\nSummary: ${memory.summary}\nContent: ${content}`,
        { 
          type: 'memory_archive', 
          crew_member: memory.crew_member || 'unknown',
          category: memory.category || 'general'
        }
      );

      try {
        fs.renameSync(fullPath, path.join(MEMORIES_ARCHIVE_DIR, filename));
        console.log(`  [Geordi] Archived: ${filename}`);
        prunedCount++;
      } catch (err) {
        console.error(`  ❌ Failed to archive ${filename}: ${err.message}`);
      }
    }
  }

  if (prunedCount > 0) {
    console.log(`\n[Geordi] Successfully archived ${prunedCount} active memories.`);
  }
  process.exit(0);
}

runPruningProtocol().catch(err => {
  console.error(`[Geordi] Critical failure in pruning protocol: ${err.message}`);
  process.exit(1);
});