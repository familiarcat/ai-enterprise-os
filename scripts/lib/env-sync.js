#!/usr/bin/env node
/**
 * env-sync.js — Unify ~/.zshrc credentials → project .env
 *
 * Reads every needed credential from process.env (which inherits the user's
 * shell environment, including ~/.zshrc exports) and writes missing or stale
 * values into the project .env file.  Also patches PYTHON_BIN in ~/.zshrc.
 *
 * Safe to run repeatedly — only writes values that are missing or different.
 */

const fs   = require('fs');
const path = require('path');
const os   = require('os');

const ROOT     = path.resolve(__dirname, '../..');
const ENV_FILE = path.join(ROOT, '.env');
const ZSHRC    = path.join(os.homedir(), '.zshrc');
const PYTHON_BIN_TARGET = path.join(ROOT, '.venv313/bin/python3.13');

// ── Helpers ──────────────────────────────────────────────────────────────────

function readEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs.readFileSync(file, 'utf8')
      .split('\n')
      .filter(l => l && !l.startsWith('#') && l.includes('='))
      .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
  );
}

function writeEnvVar(file, key, value) {
  const content = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const lines   = content.split('\n');
  const idx     = lines.findIndex(l => l.startsWith(`${key}=`));
  const entry   = `${key}=${value}`;
  if (idx >= 0) {
    lines[idx] = entry;
  } else {
    // Append under a section comment if the file has content
    lines.push(entry);
  }
  fs.writeFileSync(file, lines.join('\n'));
}

function writeZshrcVar(key, value) {
  const content = fs.readFileSync(ZSHRC, 'utf8');
  const lines   = content.split('\n');
  const idx     = lines.findIndex(l => l.match(new RegExp(`^export\\s+${key}=`)));
  const entry   = `export ${key}="${value}"`;
  if (idx >= 0) {
    lines[idx] = entry;
  } else {
    lines.push(`\n# AI Enterprise OS\n${entry}`);
  }
  fs.writeFileSync(ZSHRC, lines.join('\n'));
}

function syncToEnv(key, value, current, label) {
  if (!value) { console.log(`  -  ${key} — not in shell env, skipping`); return; }
  if (current[key] === value) { console.log(`  ·  ${key} unchanged`); return; }
  writeEnvVar(ENV_FILE, key, value);
  const display = value.length > 24 ? value.slice(0, 12) + '…' + value.slice(-6) : value;
  console.log(`  ✔  ${key} → updated  (${display})`);
}

function syncToZshrc(key, value) {
  if (!value) return;
  const content = fs.readFileSync(ZSHRC, 'utf8');
  const match   = content.match(new RegExp(`^export\\s+${key}=["']?([^"'\\n]+)["']?`, 'm'));
  const current = match ? match[1] : '';
  if (current === value) { console.log(`  ·  ${key} (zshrc) unchanged`); return; }
  writeZshrcVar(key, value);
  console.log(`  ✔  ${key} → .zshrc updated`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

const env = process.env;                 // all .zshrc exports are already here
const current = readEnvFile(ENV_FILE);  // current .env values

console.log('\n══════════════════════════════════════════════════════════════════');
console.log('  Sovereign Factory — Credential Unification');
console.log(`  Source: ~/.zshrc → Target: ${ENV_FILE}`);
console.log('══════════════════════════════════════════════════════════════════\n');

// ── Core ─────────────────────────────────────────────────────────────────────
console.log('── Core');
syncToEnv('OPENROUTER_API_KEY',  env.OPENROUTER_API_KEY,  current);
syncToEnv('OPENROUTER_REFERER',  env.OPENROUTER_REFERER,  current);
syncToEnv('AI_APP_NAME',         env.AI_APP_NAME,         current);
syncToEnv('REDIS_URL',           env.REDIS_URL,           current);

// ── Supabase — cloud URL in .env wins; key pulled from resolved SERVICE_ROLE ─
console.log('\n── Supabase');
if (!current.SUPABASE_URL) {
  syncToEnv('SUPABASE_URL', env.SUPABASE_URL, current);
} else {
  console.log('  ·  SUPABASE_URL preserved (cloud URL takes precedence over local .zshrc value)');
}
// SUPABASE_KEY: use SUPABASE_SERVICE_ROLE_KEY (the full JWT in .zshrc)
const supaKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_KEY;
syncToEnv('SUPABASE_KEY',              supaKey,                         current);
syncToEnv('SUPABASE_SERVICE_ROLE_KEY', env.SUPABASE_SERVICE_ROLE_KEY,  current);
syncToEnv('SUPABASE_PUBLIC_KEY',       env.SUPABASE_PUBLIC_KEY,        current);

// ── Python — always use working venv313 ──────────────────────────────────────
console.log('\n── Python');
syncToEnv('PYTHON_BIN', PYTHON_BIN_TARGET, current);
syncToZshrc('PYTHON_BIN', PYTHON_BIN_TARGET);

// ── Vercel ───────────────────────────────────────────────────────────────────
console.log('\n── Vercel');
syncToEnv('VERCEL_TOKEN',      env.VERCEL_TOKEN,      current);
syncToEnv('VERCEL_ORG_ID',     env.VERCEL_ORG_ID,     current);
syncToEnv('VERCEL_PROJECT_ID', env.VERCEL_PROJECT_ID, current);

// ── n8n Core ─────────────────────────────────────────────────────────────────
console.log('\n── n8n Core');
syncToEnv('N8N_URL',                         env.N8N_PROD_URL,                      current);
syncToEnv('N8N_BASE_URL',                    env.N8N_BASE_URL,                      current);
syncToEnv('N8N_PROD_API_KEY',                env.N8N_PROD_API_KEY,                  current);
syncToEnv('N8N_EMAIL',                       env.N8N_EMAIL,                         current);
syncToEnv('N8N_WEBHOOK_SECRET',              env.N8N_WEBHOOK_SECRET,                current);
syncToEnv('N8N_OBSERVATION_LOUNGE_WEBHOOK',  env.N8N_OBSERVATION_LOUNGE_WEBHOOK,    current);
syncToEnv('N8N_FEDERATION_MISSION_WEBHOOK',  env.N8N_FEDERATION_MISSION_WEBHOOK,    current);
syncToEnv('N8N_ANTI_HALLUCINATION_WEBHOOK',  env.N8N_ANTI_HALLUCINATION_WEBHOOK,    current);
syncToEnv('N8N_ALEX_AI_UNIFIED_CREW_WEBHOOK',env.N8N_ALEX_AI_UNIFIED_CREW_WEBHOOK,  current);
syncToEnv('N8N_LLAMA_COLLABORATION_WEBHOOK', env.N8N_LLAMA_COLLABORATION_WEBHOOK,   current);

// ── n8n Crew Webhooks ─────────────────────────────────────────────────────────
console.log('\n── n8n Crew Webhooks');
syncToEnv('N8N_CREW_CAPTAIN_PICARD_WEBHOOK',   env.N8N_CREW_CAPTAIN_PICARD_WEBHOOK,   current);
syncToEnv('N8N_CREW_COMMANDER_RIKER_WEBHOOK',  env.N8N_CREW_COMMANDER_RIKER_WEBHOOK,  current);
syncToEnv('N8N_CREW_COMMANDER_DATA_WEBHOOK',   env.N8N_CREW_COMMANDER_DATA_WEBHOOK,   current);
syncToEnv('N8N_CREW_GEORDI_LA_FORGE_WEBHOOK',  env.N8N_CREW_GEORDI_LA_FORGE_WEBHOOK,  current);
syncToEnv('N8N_CREW_WORF_WEBHOOK',             env.N8N_CREW_WORF_WEBHOOK,             current);
syncToEnv('N8N_CREW_DR_CRUSHER_WEBHOOK',       env.N8N_CREW_DR_CRUSHER_WEBHOOK,       current);
syncToEnv('N8N_CREW_COUNSELOR_TROI_WEBHOOK',   env.N8N_CREW_COUNSELOR_TROI_WEBHOOK,   current);
syncToEnv('N8N_CREW_QUARK_WEBHOOK',            env.N8N_CREW_QUARK_WEBHOOK,            current);
syncToEnv('N8N_CREW_CHIEF_OBRIEN_WEBHOOK',     env.N8N_CREW_CHIEF_OBRIEN_WEBHOOK,     current);
syncToEnv('N8N_CREW_UHURA_WEBHOOK',            env.N8N_CREW_UHURA_WEBHOOK,            current);

// ── AI / LLM ─────────────────────────────────────────────────────────────────
console.log('\n── AI / LLM');
syncToEnv('LANGCHAIN_OPENAI_API_KEY', env.LANGCHAIN_OPENAI_API_KEY, current);
syncToEnv('GEMINI_MODEL',             env.GEMINI_MODEL,             current);

// ── Budget ────────────────────────────────────────────────────────────────────
console.log('\n── Budget');
syncToEnv('DAILY_BUDGET_USD',   env.DAILY_BUDGET_USD,   current);
syncToEnv('MONTHLY_BUDGET_USD', env.MONTHLY_BUDGET_USD, current);

// ── AWS ───────────────────────────────────────────────────────────────────────
console.log('\n── AWS');
syncToEnv('AWS_REGION',  env.AWS_REGION,  current);
syncToEnv('AWS_PROFILE', env.AWS_PROFILE, current);

// ── Auth ──────────────────────────────────────────────────────────────────────
console.log('\n── Auth');
syncToEnv('AUTHORIZED_USERS', env.AUTHORIZED_USERS, current);

// ── Summary ───────────────────────────────────────────────────────────────────
const finalEnv = readEnvFile(ENV_FILE);
const total    = Object.keys(finalEnv).length;
console.log(`\n══════════════════════════════════════════════════════════════════`);
console.log(`  Sync complete — ${total} vars in .env`);
console.log(`══════════════════════════════════════════════════════════════════\n`);
