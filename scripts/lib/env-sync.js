/**
 * env-sync.js
 * Synchronizes variables between ~/.zshrc and the local project .env file.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const root = path.resolve(__dirname, '../..');
const envPath = path.join(root, '.env');
const zshrcPath = path.join(os.homedir(), '.zshrc');

const KEYS = [
  'OPENROUTER_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_KEY',
  'REDIS_URL',
  'GITHUB_TOKEN',
  'GITHUB_REPO'
];

function getZshrcVars() {
  if (!fs.existsSync(zshrcPath)) return {};
  const content = fs.readFileSync(zshrcPath, 'utf8');
  const vars = {};
  KEYS.forEach(key => {
    const match = content.match(new RegExp(`^export ${key}=['"]?([^'"]+)['"]?`, 'm'));
    if (match) vars[key] = match[1];
  });
  return vars;
}

function sync() {
  const zshVars = getZshrcVars();
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

  let updated = false;
  KEYS.forEach(key => {
    const val = zshVars[key] || process.env[key];
    if (val) {
      const regex = new RegExp(`^${key}=.*`, 'm');
      if (envContent.match(regex)) {
        envContent = envContent.replace(regex, `${key}=${val}`);
      } else {
        envContent += `\n${key}=${val}`;
      }
      updated = true;
    }
  });

  if (updated) fs.writeFileSync(envPath, envContent.trim() + '\n');
}
sync();