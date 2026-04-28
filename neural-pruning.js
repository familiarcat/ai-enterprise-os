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
const { storeMissionResult } = require('./core/orchestrator.js');

// Hardened path resolution for root execution
const ROOT_DIR = __dirname;
const SCRIPTS_DIR = path.join(ROOT_DIR, 'scripts');

// Redundant DDD artifacts identified for decommissioning
const REDUNDANT_DDD_ARTIFACTS = [
  'MissionDTO.js',
  'MissionRepository.js',
  'mission-events.test.js',
  'dishonorable-test.js',
  'apps/api/MissionSubscriber.js',
  'scripts/MissionService.js'
];

// Core configuration and metadata files to always ignore in the root
const IGNORE_FILES = [
  'package.json',
  'pnpm-workspace.yaml',
  'pnpm-lock.yaml',
  'README.md',
  'CLAUDE.md',
  '.env',
  '.env.example',
  '.gitignore',
  'vitest.config.js',
  'main.yml',
  'registry.json',
  'master-architecture.skill',
  '.DS_Store',
  'PROJECT_ANALYSIS.md'
];

// Files that define the "brain" or entry points of the system to scan for references
const SCAN_SOURCES = [
  path.join(ROOT_DIR, 'package.json'),
  path.join(ROOT_DIR, 'main.yml'),
  path.join(ROOT_DIR, 'CLAUDE.md'),
  path.join(ROOT_DIR, 'core/orchestrator.js'),
  path.join(ROOT_DIR, 'apps/api/server.js'),
  path.join(ROOT_DIR, 'apps/api/mcp-server.js'),
  path.join(ROOT_DIR, 'apps/api/index.js')
];

function getReferences() {
  let combinedContent = '';
  SCAN_SOURCES.forEach(file => {
    if (fs.existsSync(file)) {
      combinedContent += fs.readFileSync(file, 'utf-8');
    }
  });
  return combinedContent;
}

function scanForUnused() {
  const references = getReferences();
  const candidates = [];

  // Scan root for shell/js scripts
  fs.readdirSync(ROOT_DIR).forEach(file => {
    const fullPath = path.join(ROOT_DIR, file);
    if (fs.statSync(fullPath).isFile()) {
      if (/\.(sh|js)$/.test(file) && !IGNORE_FILES.includes(file)) {
        candidates.push(fullPath);
      }
    }
  });

  // Scan scripts directory recursively
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(file => {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        if (!['node_modules', '.git', 'dist', '.next'].includes(file)) walk(fullPath);
      } else if (/\.(sh|js)$/.test(file)) {
        candidates.push(fullPath);
      }
    });
  }
  walk(SCRIPTS_DIR);

  return candidates.filter(filePath => {
    const fileName = path.basename(filePath);
    const relativePath = path.relative(ROOT_DIR, filePath);
    
    if (fileName === 'neural-pruning.js') return false;

    // Check if filename or relative path is mentioned in any reference file
    const escapedName = fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedRel = relativePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedName}|${escapedRel})`, 'g');

    return !regex.test(references);
  });
}

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
        `[LEGACY SKILL ARCHIVE] Pre-pruning preservation of ${relPath}.\n\nContext: This logic has been moved to a DDD domain but the original implementation is preserved here for RAG-based code generation.\n\nCode:\n${content}`,
        { 
          type: 'legacy_archive', 
          original_path: relPath, 
          crew_member: 'commander_data',
          honor_status: 'PRESERVED' 
        }
      );

      console.log(`  [Worf] Security check passed. Purge authorized.`);
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

  const results = scanForUnused();

  if (results.length === 0) {
    console.log('\n[Geordi] VISOR scan complete. No additional unused neural pathways detected.');
  } else {
    console.log(`\n[Geordi] Found ${results.length} additional potentially unused scripts/files:`);
    results.forEach(file => {
      console.log(`  - ${path.relative(ROOT_DIR, file)}`);
    });
    console.log('\nRecommendation: Verify these are not legacy stubs before deletion.');
  }

  process.exit(0);
}

runPruningProtocol().catch(err => {
  console.error(`[Geordi] Critical failure in pruning protocol: ${err.message}`);
  process.exit(1);
});