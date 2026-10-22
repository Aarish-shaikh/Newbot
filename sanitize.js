const fs = require('fs');
const path = require('path');

const exportsDir = path.join(__dirname, 'exports');
const sanitizedDir = path.join(__dirname, 'sanitized');

if (!fs.existsSync(sanitizedDir)) {
  fs.mkdirSync(sanitizedDir, { recursive: true });
}

function readJson(filename) {
  const filePath = path.join(exportsDir, filename);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filename, data) {
  const filePath = path.join(sanitizedDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

console.log('--- Starting Stage 3: Sanitization ---');

// 1. Sanitize instance.json
const rawInstance = readJson('instance.json');
if (rawInstance) {
  const sanitizedInstance = {
    instanceName: '{{MY_INSTANCE_NAME}}',
    integration: rawInstance.integration || 'WHATSAPP-BAILEYS',
    clientName: rawInstance.clientName || 'evolution'
  };
  writeJson('instance.json', sanitizedInstance);
  console.log('Sanitized instance.json created');
}

// 2. Sanitize settings.json
const rawSettings = readJson('settings.json');
if (rawSettings) {
  const sanitizedSettings = {
    rejectCall: Boolean(rawSettings.rejectCall),
    msgCall: rawSettings.msgCall || '',
    groupsIgnore: Boolean(rawSettings.groupsIgnore),
    alwaysOnline: Boolean(rawSettings.alwaysOnline),
    readMessages: Boolean(rawSettings.readMessages),
    readStatus: Boolean(rawSettings.readStatus),
    syncFullHistory: Boolean(rawSettings.syncFullHistory),
    wavoipToken: rawSettings.wavoipToken || ''
  };
  writeJson('settings.json', sanitizedSettings);
  console.log('Sanitized settings.json created');
}

// 3. Sanitize webhook.json
const rawWebhook = readJson('webhook.json');
if (rawWebhook) {
  const sanitizedWebhook = {
    enabled: Boolean(rawWebhook.enabled),
    url: '{{MY_WEBHOOK_URL}}',
    webhookByEvents: Boolean(rawWebhook.webhookByEvents),
    events: rawWebhook.events || ['MESSAGES_UPSERT'],
    webhookBase64: Boolean(rawWebhook.webhookBase64)
  };
  writeJson('webhook.json', sanitizedWebhook);
  console.log('Sanitized webhook.json created');
}

// 4. Sanitize evolutionBot.json
const rawBots = readJson('evolutionBot.json');
let sanitizedBots = [];
if (Array.isArray(rawBots)) {
  sanitizedBots = rawBots.map(bot => {
    return {
      name: bot.name || 'bot',
      enabled: bot.enabled !== false,
      apiUrl: '{{MY_BOT_API_URL}}',
      apiKey: '{{MY_BOT_API_KEY}}',
      triggerType: bot.triggerType || 'all',
      triggerOperator: bot.triggerOperator || '',
      triggerValue: bot.triggerValue || '',
      expire: bot.expire ?? 0,
      keywordFinish: bot.keywordFinish || '',
      delayMessage: bot.delayMessage ?? 1000,
      unknownMessage: bot.unknownMessage || '',
      listeningFromMe: Boolean(bot.listeningFromMe),
      stopBotFromMe: Boolean(bot.stopBotFromMe),
      keepOpen: Boolean(bot.keepOpen),
      debounceTime: bot.debounceTime ?? 0
    };
  });
}
writeJson('evolutionBot.json', sanitizedBots);
console.log('Sanitized evolutionBot.json created');

// 5. Sanitize evolutionBot_settings.json
const rawBotSettings = readJson('evolutionBot_settings.json');
if (rawBotSettings) {
  const sanitizedBotSettings = {
    expire: rawBotSettings.expire ?? 300,
    keywordFinish: rawBotSettings.keywordFinish ?? 'bye',
    delayMessage: rawBotSettings.delayMessage ?? 1000,
    unknownMessage: rawBotSettings.unknownMessage ?? 'Sorry, I dont understand',
    listeningFromMe: Boolean(rawBotSettings.listeningFromMe),
    stopBotFromMe: Boolean(rawBotSettings.stopBotFromMe),
    keepOpen: Boolean(rawBotSettings.keepOpen),
    debounceTime: rawBotSettings.debounceTime ?? 1,
    ignoreJids: rawBotSettings.ignoreJids || [],
    splitMessages: Boolean(rawBotSettings.splitMessages),
    timePerChar: rawBotSettings.timePerChar ?? 0,
    fallbackId: '{{FALLBACK_BOT_ID}}'
  };
  writeJson('evolutionBot_settings.json', sanitizedBotSettings);
  console.log('Sanitized evolutionBot_settings.json created');
}

console.log('--- Sanitization complete ---');
