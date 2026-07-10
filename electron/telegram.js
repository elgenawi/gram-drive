const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Api } = require('telegram/tl');
const { computeCheck } = require('telegram/Password');
const path = require('path');
const fs = require('fs');
const log = require('./logger');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config.json'), 'utf-8'));
const API_ID = config.apiId;
const API_HASH = config.apiHash;
const SESSION_FILE = 'gram-drive-session';

let client = null;
let phoneNumber = null;
let phoneCodeHash = null;

function getSessionPath(app) {
  return path.join(app.getPath('userData'), `${SESSION_FILE}.json`);
}

function loadSession(app) {
  const p = getSessionPath(app);
  try {
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
      log.info('Telegram', 'Session loaded from', p);
      return data.session || '';
    }
  } catch (e) {
    log.warn('Telegram', 'Failed to load session:', e.message);
  }
  log.info('Telegram', 'No saved session found');
  return '';
}

function saveSession(app, sessionStr) {
  const p = getSessionPath(app);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify({ session: sessionStr }), 'utf-8');
  log.info('Telegram', 'Session saved');
}

function clearSession(app) {
  const p = getSessionPath(app);
  try { fs.unlinkSync(p); log.info('Telegram', 'Session cleared'); } catch {}
}

async function initClient(app) {
  const savedSession = loadSession(app);
  const stringSession = new StringSession(savedSession);
  client = new TelegramClient(stringSession, API_ID, API_HASH, {
    connectionRetries: 2,
    useWSS: true,
    autoReconnect: false,
  });
  log.info('Telegram', 'Connecting...');
  await client.connect();
  const isAuthorized = await client.isUserAuthorized();
  log.info('Telegram', isAuthorized ? 'Already authorized' : 'Not authorized');
  if (isAuthorized) {
    saveSession(app, client.session.save());
  }
  return isAuthorized;
}

async function sendCode(app, phone) {
  if (!client) {
    log.info('Telegram', 'No client, initializing...');
    await initClient(app);
  }
  if (!client.connected) {
    log.info('Telegram', 'Reconnecting...');
    await client.connect();
  }
  phoneNumber = phone;
  log.info('Telegram', 'Sending code to', phone);
  const result = await client.invoke(new Api.auth.SendCode({
    phoneNumber: phone,
    apiId: API_ID,
    apiHash: API_HASH,
    settings: new Api.CodeSettings({ allowFlashcall: false }),
  }));
  phoneCodeHash = result.phoneCodeHash;
  log.info('Telegram', 'Code sent, hash:', result.phoneCodeHash);
  return { phoneCodeHash: result.phoneCodeHash };
}

async function verifyCode(app, code) {
  if (!client) throw new Error('Client not initialized');
  log.info('Telegram', 'Verifying code...');
  try {
    await client.invoke(new Api.auth.SignIn({
      phoneNumber,
      phoneCodeHash,
      phoneCode: code,
    }));
    const sessionStr = client.session.save();
    saveSession(app, sessionStr);
    log.info('Telegram', 'Code verified, signed in');
    return { success: true, session: sessionStr };
  } catch (err) {
    if (err.errorMessage === 'SESSION_PASSWORD_NEEDED') {
      log.info('Telegram', '2FA password needed');
      return { passwordNeeded: true };
    }
    log.error('Telegram', 'Sign-in failed:', err.message);
    throw err;
  }
}

async function checkPassword(app, password) {
  if (!client) throw new Error('Client not initialized');
  log.info('Telegram', 'Checking 2FA password...');
  const passwordSrpResult = await client.invoke(new Api.account.GetPassword());
  const passwordSrpCheck = await computeCheck(passwordSrpResult, password);
  await client.invoke(new Api.auth.CheckPassword({
    password: passwordSrpCheck,
  }));
  const sessionStr = client.session.save();
  saveSession(app, sessionStr);
  log.info('Telegram', '2FA password accepted');
  return { success: true, session: sessionStr };
}

async function signOut(app) {
  log.info('Telegram', 'Signing out...');
  if (client) {
    try {
      await client.invoke(new Api.auth.LogOut());
      log.info('Telegram', 'Logged out from server');
    } catch {}
    client.destroy();
    client = null;
  }
  clearSession(app);
  phoneNumber = null;
  phoneCodeHash = null;
  return { success: true };
}

function destroy() {
  if (client) {
    log.info('Telegram', 'Destroying client');
    try { client.disconnect(); } catch {}
    try { client.destroy(); } catch {}
    client = null;
  }
}

function getClient() {
  return client;
}

module.exports = { initClient, sendCode, verifyCode, checkPassword, signOut, destroy, loadSession, saveSession, getClient };
