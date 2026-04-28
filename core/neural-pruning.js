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
const SCRIPTS_DIR = path.join(ROOT_DIR, 'scripts');

// Redundant DDD artifacts identified for decommissioning
const REDUNDANT_DDD_ARTIFACTS = [
  'MissionDTO.js',
  'MissionRepository.js',
  'mission-events.test.js',
  'dishonorable-test.js',
  'apps/api/MissionSubscriber.js',
  'scripts/MissionService.js',
  'scripts/MissionSubscriber.js',
  'scripts/MissionRepository.js',
  'core/MissionSubscriber.js',
  'core/MissionRepository.js',
  'core/MissionService.js',
  'core/MissionDTO.js'
];

async function runPruningProtocol() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Geordi La Forge — Neural Pruning Protocol');
  console.log('  Objective: Identify, Archive, and Purge Artifacts');
  console.log('═══════════════════════════════════════════════════');

  console.log('\n[Geordi] Consulting crew for synaptic memory registration...');
  let prunedCount = 0;

  for (const relPath of REDUNDANT_DDD_ARTIFACTS) {
    const fullPath = path.join(ROOT_DIR, relPath);
    if (fs.existsSync(fullPath)) {
      console.log(`\n--- Processing: ${relPath} ---`);
      const content = fs.readFileSync(fullPath, 'utf-8');

      // Synaptic Archiving: Register the logic in Supabase RAG before deletion
      console.log(`  [Data] Registering legacy skill in Supabase...`);
      await storeMissionResult(
        `[LEGACY SKILL ARCHIVE] Pre-pruning preservation of ${relPath}.\n\nCode:\n${content}`,
        { 
          type: 'legacy_archive', 
          original_path: relPath, 
          crew_member: 'commander_data'
        }
      );

      try {
        fs.unlinkSync(fullPath);
        console.log(`  [Geordi] Pruned: ${relPath}`);
        prunedCount++;
      } catch (err) {
        console.error(`  ❌ Failed to prune ${relPath}: ${err.message}`);
      }
    }
  }

  if (prunedCount > 0) {
    console.log(`\n[Geordi] Successfully archived and purged ${prunedCount} redundant DDD artifacts.`);
  }
  process.exit(0);
}

runPruningProtocol().catch(err => {
  console.error(`[Geordi] Critical failure in pruning protocol: ${err.message}`);
  process.exit(1);
});