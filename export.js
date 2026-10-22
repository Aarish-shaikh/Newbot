const fs = require('fs');
const path = require('path');

// 1. Read .env file without external dependencies
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env file not found at ' + envPath);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (match) {
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[match[1]] = val;
    }
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const serverUrl = (env.FRIEND_SERVER_URL || 'http://129.159.231.246:8080').replace(/\/+$/, '');
  const apiKey = env.FRIEND_API_KEY;
  const instanceName = env.FRIEND_INSTANCE_NAME || 'bot';

  if (!apiKey) {
    throw new Error('FRIEND_API_KEY is not defined in .env');
  }

  const exportsDir = path.join(__dirname, 'exports');
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
  }

  const headers = {
    'apikey': apiKey,
    'Accept': 'application/json',
    'User-Agent': 'Evolution-Cloner/1.0'
  };

  async function getJson(endpoint) {
    const url = `${serverUrl}${endpoint}`;
    console.log(`[GET] Fetching: ${endpoint}`);
    const res = await fetch(url, { method: 'GET', headers });
    if (!res.ok) {
      const text = await res.text();
      console.warn(`[WARN] ${endpoint} returned status ${res.status}: ${text.slice(0, 150)}`);
      return { status: res.status, error: text };
    }
    return await res.json();
  }

  console.log('--- Starting Stage 2 Export (Read-Only) ---');
  console.log(`Target Instance: ${instanceName}`);
  console.log(`Server URL: ${serverUrl}\n`);

  // 1. Instance Info
  console.log('1. Fetching Instance Info...');
  let instances = await getJson(`/instance/fetchInstances?instanceName=${encodeURIComponent(instanceName)}`);
  // If array or object, find target instance
  let instanceData = instances;
  if (Array.isArray(instances)) {
    const found = instances.find(i => (i.instance?.instanceName || i.name || i.instanceName) === instanceName);
    if (found) instanceData = found;
  }
  fs.writeFileSync(path.join(exportsDir, 'instance.json'), JSON.stringify(instanceData, null, 2), 'utf8');
  console.log('Saved to exports/instance.json');

  // 2. Settings
  console.log('\n2. Fetching Settings...');
  const settings = await getJson(`/settings/find/${encodeURIComponent(instanceName)}`);
  fs.writeFileSync(path.join(exportsDir, 'settings.json'), JSON.stringify(settings, null, 2), 'utf8');
  console.log('Saved to exports/settings.json');

  // 3. Webhook
  console.log('\n3. Fetching Webhook Config...');
  const webhook = await getJson(`/webhook/find/${encodeURIComponent(instanceName)}`);
  fs.writeFileSync(path.join(exportsDir, 'webhook.json'), JSON.stringify(webhook, null, 2), 'utf8');
  console.log('Saved to exports/webhook.json');

  // 4. Evolution Bot list
  console.log('\n4. Fetching Evolution Bot List...');
  const evolutionBots = await getJson(`/evolutionBot/find/${encodeURIComponent(instanceName)}`);
  fs.writeFileSync(path.join(exportsDir, 'evolutionBot.json'), JSON.stringify(evolutionBots, null, 2), 'utf8');
  console.log('Saved to exports/evolutionBot.json');

  // 5. Evolution Bot settings
  console.log('\n5. Fetching Evolution Bot Settings...');
  let botSettings = await getJson(`/evolutionBot/fetchSettings/${encodeURIComponent(instanceName)}`);
  if (botSettings?.status === 404 || botSettings?.error) {
    console.log('Trying alternate endpoint /evolutionBot/settings...');
    botSettings = await getJson(`/evolutionBot/settings/${encodeURIComponent(instanceName)}`);
  }
  fs.writeFileSync(path.join(exportsDir, 'evolutionBot_settings.json'), JSON.stringify(botSettings, null, 2), 'utf8');
  console.log('Saved to exports/evolutionBot_settings.json');

  console.log('\n--- Export Complete ---');
}

main().catch(err => {
  console.error('[ERROR]', err.message);
  process.exit(1);
});
