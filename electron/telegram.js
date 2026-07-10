const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Api } = require('telegram/tl');
const { computeCheck } = require('telegram/Password');
const path = require('path');
const fs = require('fs');

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
      return data.session || '';
    }
  } catch {}
  return '';
}

function saveSession(app, sessionStr) {
  const p = getSessionPath(app);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify({ session: sessionStr }), 'utf-8');
}

function clearSession(app) {
  const p = getSessionPath(app);
  try { fs.unlinkSync(p); } catch {}
}

async function initClient(app) {
  const savedSession = loadSession(app);
  const stringSession = new StringSession(savedSession);
  client = new TelegramClient(stringSession, API_ID, API_HASH, {
    connectionRetries: 5,
    useWSS: false,
  });
  await client.connect();
  const isAuthorized = await client.isUserAuthorized();
  if (isAuthorized) {
    saveSession(app, client.session.save());
  }
  return isAuthorized;
}

async function sendCode(app, phone) {
  if (!client) await initClient(app);
  if (!client.connected) await client.connect();
  phoneNumber = phone;
  const result = await client.invoke(new Api.auth.SendCode({
    phoneNumber: phone,
    apiId: API_ID,
    apiHash: API_HASH,
    settings: new Api.CodeSettings({ allowFlashcall: false }),
  }));
  phoneCodeHash = result.phoneCodeHash;
  return { phoneCodeHash: result.phoneCodeHash };
}

async function verifyCode(app, code) {
  if (!client) throw new Error('Client not initialized');
  try {
    await client.invoke(new Api.auth.SignIn({
      phoneNumber,
      phoneCodeHash,
      phoneCode: code,
    }));
    const sessionStr = client.session.save();
    saveSession(app, sessionStr);
    return { success: true, session: sessionStr };
  } catch (err) {
    if (err.errorMessage === 'SESSION_PASSWORD_NEEDED') {
      return { passwordNeeded: true };
    }
    throw err;
  }
}

async function checkPassword(app, password) {
  if (!client) throw new Error('Client not initialized');
  const passwordSrpResult = await client.invoke(new Api.account.GetPassword());
  const passwordSrpCheck = await computeCheck(passwordSrpResult, password);
  await client.invoke(new Api.auth.CheckPassword({
    password: passwordSrpCheck,
  }));
  const sessionStr = client.session.save();
  saveSession(app, sessionStr);
  return { success: true, session: sessionStr };
}

async function signOut(app) {
  if (client) {
    try {
      await client.invoke(new Api.auth.LogOut());
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
    try { client.disconnect(); } catch {}
    try { client.destroy(); } catch {}
    client = null;
  }
}

module.exports = { initClient, sendCode, verifyCode, checkPassword, signOut, destroy, loadSession, saveSession };
