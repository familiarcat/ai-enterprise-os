#!/usr/bin/env node

/**
 * @generated_by SovereignFactory
 * @domain security
 * @layer application
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '../../'); // ai-enterprise-os root
const DOMAINS_DIR = path.join(ROOT_DIR, 'domains');

/**
 * Lt. Worf's DDD Layer Integrity Audit
 * Checks staged files in the domains directory to ensure domain layers 
 * do not import from infrastructure layers.
 */
function auditFile(filePath, content) {
  const isDomainFile = filePath.includes(path.join('domains', path.sep));
  const isCoreFile = filePath.includes(path.join('core', path.sep));

  const infraImportRegex = /from\s+['"].*(\/infrastructure\/|\.\.\/infrastructure).*['"]/g;
  const infraRequireRegex = /require\(['"].*(\/infrastructure\/|\.\.\/infrastructure).*['"]\)/g;

  const appImportRegex = /from\s+['"].*(\/application\/|\.\.\/application).*['"]/g;
  const appRequireRegex = /require\(['"].*(\/application\/|\.\.\/application).*['"]\)/g;

  const domainsImportRegex = /from\s+['"].*\/domains\/.*['"]/g;
  const domainsRequireRegex = /require\(['"].*\/domains\/.*['"]\)/g;

  let violations = [];

  // 1. DDD Layer Integrity (Infrastructure should not leak into Domain)
  if (isDomainFile) {
    const relativePath = path.relative(DOMAINS_DIR, filePath);
    const parts = relativePath.split(path.sep);
    
    // parts[0] is domain name, parts[1] is layer name (e.g., 'domain')
    if (parts.length >= 2 && parts[1] === 'domain') {
    let match;
    let infraViolations = [];
    let appViolations = [];

    // Domain should not import Infra or App
    while ((match = infraImportRegex.exec(content)) !== null) infraViolations.push(match[0]);
    while ((match = infraRequireRegex.exec(content)) !== null) infraViolations.push(match[0]);

    while ((match = appImportRegex.exec(content)) !== null) appViolations.push(match[0]);
    while ((match = appRequireRegex.exec(content)) !== null) appViolations.push(match[0]);

    if (infraViolations.length > 0 || appViolations.length > 0) {
      console.error(`\n[Worf Audit] DISHONOURABLE IMPORT in: ${filePath}`);
      if (infraViolations.length > 0) {
        console.error(`The "domain" layer must never depend on the "infrastructure" layer.`);
        infraViolations.forEach(v => console.error(`  ❌ Violation: ${v}`));
      }
      if (appViolations.length > 0) {
        console.error(`The "domain" layer must never depend on the "application" layer.`);
        appViolations.forEach(v => console.error(`  ❌ Violation: ${v}`));
      }
      process.exit(1);
    }
    }

    // 1.1 Application Layer Audit (Should not depend on Infrastructure)
    if (parts.length >= 2 && parts[1] === 'application') {
      let match;
      let violations = [];
      while ((match = infraImportRegex.exec(content)) !== null) violations.push(match[0]);
      while ((match = infraRequireRegex.exec(content)) !== null) violations.push(match[0]);

      if (violations.length > 0) {
        console.error(`\n[Worf Audit] DISHONOURABLE IMPORT in application layer: ${filePath}`);
        console.error(`The "application" layer should not directly import from "infrastructure". Use dependency injection or interfaces.`);
        violations.forEach(v => console.error(`  ❌ Violation: ${v}`));
        process.exit(1);
      }
    }
  }

  // 2. Core/Domain Circular Dependency Audit
  if (isCoreFile) {
    let match;
    while ((match = domainsImportRegex.exec(content)) !== null) violations.push(match[0]);
    while ((match = domainsRequireRegex.exec(content)) !== null) violations.push(match[0]);

    if (violations.length > 0) {
      console.error(`\n[Worf Audit] DISHONOURABLE CORE DEPENDENCY in: ${filePath}`);
      console.error(`The "core" layer must remain pure and never depend on the "domains" layer.`);
      violations.forEach(v => console.error(`  ❌ Violation: ${v}`));
      process.exit(1);
    }
  }
}

const { spawnSync } = require('child_process');

let gitArgs = ['diff', '--cached', '--name-only', '--diff-filter=ACM'];

// In CI environments (like GitHub Actions), identify changed files between branch and target
if (process.env.CI) {
  gitArgs = ['diff', '--name-only', 'HEAD~1..HEAD'];
  if (process.env.GITHUB_BASE_REF) {
    // Check changes between current feature branch and the PR target branch (e.g., main)
    gitArgs = ['diff', '--name-only', `origin/${process.env.GITHUB_BASE_REF}...HEAD`];
  }
}

const git = spawnSync('git', gitArgs);

if (git.status === 0) {
  const files = git.stdout.toString().trim().split('\n').filter(Boolean);
  files.forEach(file => {
    const fullPath = path.resolve(ROOT_DIR, file);
    if (fs.existsSync(fullPath) && fullPath.match(/\.(js|ts|tsx|mjs)$/)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      auditFile(fullPath, content);
    }
  });
}

console.log('Lt. Worf: DDD Layer Integrity scan complete. Honour is intact.');
process.exit(0);