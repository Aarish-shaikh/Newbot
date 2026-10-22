const fs = require('fs');
const path = require('path');

// Load environment variables from .env
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

function readSanitized(filename) {
  const filePath = path.join(__dirname, 'sanitized', filename);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function main() {
  console.log('====================================================');
  console.log('   Evolution API Config Replay (Safe & Idempotent)  ');
  console.log('====================================================\n');

  const env = loadEnv();
  const targetServerUrl = (env.SERVER_URL || 'http://localhost:8080').replace(/\/+$/, '');
  const targetApiKey = env.AUTHENTICATION_API_KEY;
  const instanceName = env.MY_INSTANCE_NAME || 'newbot';
  const webhookUrl = env.MY_WEBHOOK_URL || '';

  // Chatwoot settings from .env
  const chatwootUrl = env.CHATWOOT_URL || '';
  const chatwootAccountId = env.CHATWOOT_ACCOUNT_ID || '';
  const chatwootToken = env.CHATWOOT_TOKEN || '';

  if (!targetApiKey) {
    throw new Error('AUTHENTICATION_API_KEY is not defined in .env');
  }

  const headers = {
    'apikey': targetApiKey,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  async function apiRequest(endpoint, method = 'GET', body = null) {
    const url = `${targetServerUrl}${endpoint}`;
    const options = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }
    const res = await fetch(url, options);
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
    return { status: res.status, ok: res.ok, data: json };
  }

  console.log(`Target Server: ${targetServerUrl}`);
  console.log(`Target Instance: ${instanceName}\n`);

  // Step 1: Check if instance exists
  console.log('[Step 1/5] Checking target instance status...');
  const instanceCheck = await apiRequest(`/instance/fetchInstances?instanceName=${encodeURIComponent(instanceName)}`);
  let instanceExists = false;
  if (instanceCheck.ok && Array.isArray(instanceCheck.data)) {
    instanceExists = instanceCheck.data.some(i => (i.instance?.instanceName || i.name || i.instanceName) === instanceName);
  } else if (instanceCheck.ok && instanceCheck.data) {
    instanceExists = (instanceCheck.data.name || instanceCheck.data.instanceName) === instanceName;
  }

  if (!instanceExists) {
    console.log(`Instance "${instanceName}" does not exist yet.`);
    console.log(`Attempting to initialize instance "${instanceName}"...`);
    const createRes = await apiRequest('/instance/create', 'POST', {
      instanceName: instanceName,
      integration: 'WHATSAPP-BAILEYS',
      qrcode: true
    });
    if (!createRes.ok) {
      console.warn(`[WARN] Could not auto-create instance (${createRes.status}):`, createRes.data);
      console.warn('Please make sure you create the instance in Evolution Manager UI first.');
    } else {
      console.log(`✓ Instance "${instanceName}" successfully initialized.`);
    }
  } else {
    console.log(`✓ Target instance "${instanceName}" found and verified.`);
  }

  // Step 2: Apply Instance Settings
  console.log('\n[Step 2/5] Applying Instance Settings...');
  const settingsData = readSanitized('settings.json');
  if (settingsData) {
    const setSettingsRes = await apiRequest(`/settings/set/${encodeURIComponent(instanceName)}`, 'POST', settingsData);
    if (setSettingsRes.ok) {
      console.log('✓ Instance settings applied successfully.');
    } else {
      console.warn(`[WARN] Failed to apply settings (${setSettingsRes.status}):`, setSettingsRes.data);
    }
  }

  // Step 3: Apply Webhook Config (Core bot logic connection)
  console.log('\n[Step 3/5] Applying Webhook Configuration...');
  const webhookConfig = readSanitized('webhook.json');
  if (webhookConfig) {
    const finalUrl = webhookUrl || webhookConfig.url;
    // Evolution API expects wrapped payload { webhook: { ... } }
    const webhookPayload = {
      webhook: {
        enabled: true,
        url: finalUrl,
        webhookByEvents: Boolean(webhookConfig.webhookByEvents),
        events: webhookConfig.events || ['MESSAGES_UPSERT'],
        webhookBase64: Boolean(webhookConfig.webhookBase64)
      }
    };
    const setWebhookRes = await apiRequest(`/webhook/set/${encodeURIComponent(instanceName)}`, 'POST', webhookPayload);
    if (setWebhookRes.ok) {
      console.log('✓ Webhook configuration applied successfully.');
      console.log(`  Webhook URL: ${finalUrl}`);
      console.log(`  Events: ${JSON.stringify(webhookPayload.webhook.events)}`);
    } else {
      console.warn(`[WARN] Failed to apply webhook (${setWebhookRes.status}):`, setWebhookRes.data);
    }
  }

  // Step 4: Apply Chatwoot (if configured)
  console.log('\n[Step 4/5] Checking Chatwoot Integration...');
  const chatwootConfig = readSanitized('chatwoot.json');
  if (chatwootUrl && chatwootToken && chatwootConfig) {
    chatwootConfig.url = chatwootUrl;
    chatwootConfig.token = chatwootToken;
    chatwootConfig.accountId = chatwootAccountId || '1';
    chatwootConfig.enabled = true;

    console.log(`Configuring Chatwoot integration for URL: ${chatwootUrl}`);
    const setChatwootRes = await apiRequest(`/chatwoot/set/${encodeURIComponent(instanceName)}`, 'POST', chatwootConfig);
    if (setChatwootRes.ok) {
      console.log('✓ Chatwoot integration configured successfully.');
    } else {
      console.warn(`[WARN] Failed to configure Chatwoot (${setChatwootRes.status}):`, setChatwootRes.data);
    }
  } else {
    console.log('ℹ Chatwoot not configured in .env (CHATWOOT_URL / CHATWOOT_TOKEN empty). Skipping.');
  }

  // Step 5: Apply Evolution Bot Global Settings
  console.log('\n[Step 5/5] Applying Evolution Bot Global Settings...');
  const botSettings = readSanitized('evolutionBot_settings.json');
  if (botSettings) {
    const payload = {
      expire: botSettings.expire || 300,
      keywordFinish: botSettings.keywordFinish || 'bye',
      delayMessage: botSettings.delayMessage || 1000,
      unknownMessage: botSettings.unknownMessage || 'Sorry, I dont understand',
      listeningFromMe: Boolean(botSettings.listeningFromMe),
      stopBotFromMe: Boolean(botSettings.stopBotFromMe),
      keepOpen: Boolean(botSettings.keepOpen),
      debounceTime: botSettings.debounceTime || 1,
      ignoreJids: botSettings.ignoreJids || [],
      splitMessages: Boolean(botSettings.splitMessages),
      timePerChar: botSettings.timePerChar || 0
    };
    const setBotSettingsRes = await apiRequest(`/evolutionBot/settings/${encodeURIComponent(instanceName)}`, 'POST', payload);
    if (setBotSettingsRes.ok) {
      console.log('✓ Evolution Bot global settings applied successfully.');
    } else {
      console.warn(`[WARN] Failed to apply bot settings (${setBotSettingsRes.status}):`, setBotSettingsRes.data);
    }
  }

  // Live Verification
  console.log('\n====================================================');
  console.log('             VERIFICATION & STATUS                   ');
  console.log('====================================================\n');

  console.log('Fetching live instance configuration...');
  const [liveSettings, liveWebhook, liveBotSettings] = await Promise.all([
    apiRequest(`/settings/find/${encodeURIComponent(instanceName)}`),
    apiRequest(`/webhook/find/${encodeURIComponent(instanceName)}`),
    apiRequest(`/evolutionBot/fetchSettings/${encodeURIComponent(instanceName)}`)
  ]);

  console.log('--- 1. Live Settings ---');
  if (liveSettings.ok) {
    console.log('✓ Settings active:');
    console.log(`  rejectCall: ${liveSettings.data.rejectCall}, groupsIgnore: ${liveSettings.data.groupsIgnore}, alwaysOnline: ${liveSettings.data.alwaysOnline}`);
  } else {
    console.log('Status:', liveSettings.status);
  }

  console.log('\n--- 2. Live Webhook ---');
  if (liveWebhook.ok && liveWebhook.data) {
    const wh = liveWebhook.data.webhook || liveWebhook.data;
    console.log('✓ Webhook active:');
    console.log(`  URL: ${wh.url || 'Not set'}`);
    console.log(`  Enabled: ${wh.enabled}`);
    console.log(`  Events: ${JSON.stringify(wh.events)}`);
  } else {
    console.log('Webhook Status:', liveWebhook.status, liveWebhook.data);
  }

  console.log('\n--- 3. Evolution Bot Global Timings ---');
  if (liveBotSettings.ok && liveBotSettings.data) {
    console.log('✓ Bot timings active:');
    console.log(`  expire: ${liveBotSettings.data.expire}s, delayMessage: ${liveBotSettings.data.delayMessage}ms, keywordFinish: "${liveBotSettings.data.keywordFinish}"`);
  } else {
    console.log('Bot Settings Status:', liveBotSettings.status);
  }

  console.log('\n====================================================');
  console.log('           ✓ ALL SETTINGS REPLAYED SUCCESSFULLY!    ');
  console.log('====================================================\n');
}

main().catch(err => {
  console.error('[FATAL ERROR]', err.message);
  process.exit(1);
});
