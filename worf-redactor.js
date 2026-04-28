#!/usr/bin/env node

/**
 * @generated_by SovereignFactory
 * @domain security
 * @layer application
 */

const fs = require('fs');
const path = require('path');

// Unified patterns for detecting dishonorable secrets
const SECRET_PATTERNS = [
  { name: 'OpenRouter Key', pattern: /sk-or-v1-[a-zA-Z0-9]{48}/g },
  { name: 'Anthropic Key', pattern: /sk-ant-api03-[a-zA-Z0-9-_]{93}/g },
  { name: 'JWT/Supabase Key', pattern: /eyJ[a-zA-Z0-9._-]{20,}/g },
  { name: 'Database URL', pattern: /[a-z]+:\/\/[^:]+:[^@]+@[^/]+/g }
];

// Hardened path resolution to target the project root
const ROOT_DIR = path.resolve(__dirname);

/**
 * Scans a file for secrets and replaces them with a redacted placeholder.
 * @param {string} filePath 
 */
function redactSecretsInFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  SECRET_PATTERNS.forEach(({ name, pattern }) => {
    if (pattern.test(content)) {
      console.log(`[Lt. Worf] Dishonorable ${name} detected in ${path.relative(ROOT_DIR, filePath)}. Redacting...`);
      content = content.replace(pattern, '[REDACTED_FOR_HONOR]');
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`[Lt. Worf] File ${path.relative(ROOT_DIR, filePath)} has been purified.`);
  }
}

/**
 * Recursively crawls the directory to find files to audit.
 */
function walk(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      // Skip dishonorable or heavy directories
      if (!['node_modules', '.git', 'dist', '.next'].includes(file)) {
        walk(fullPath);
      }
    } else if (/\.(js|ts|tsx|md|json|sh|env|example)$/.test(file)) {
      redactSecretsInFile(fullPath);
    }
  });
}

console.log('═══════════════════════════════════════════════════');
console.log('  Lt. Worf — Automated Redaction Mission Engaged');
console.log('  Objective: Purify the codebase of exposed secrets');
console.log('═══════════════════════════════════════════════════');

try {
  walk(ROOT_DIR);
  console.log('\n[Lt. Worf] Mission accomplished. Codebase is now secure.');
} catch (error) {
  console.error(`[Lt. Worf] Tactical error during scan: ${error.message}`);
  process.exit(1);
}

process.exit(0);