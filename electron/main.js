const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const database = require('./database');
const telegram = require('./telegram');
const { registerHandlers } = require('./ipc');
const log = require('./logger');
const { Api } = require('telegram/tl');
const bigInt = require('big-integer');

function getClient() { return require('./telegram').getClient(); }

const isDev = !app.isPackaged;
const previewCacheDir = path.join(app.getPath('userData'), 'preview-cache');
const CHUNK_SIZE = 512 * 1024;
let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    resizable: true,
    frame: false,
    show: false,
    backgroundColor: '#1a1a1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  ipcMain.on('window-minimize', () => win.minimize());
  ipcMain.on('window-maximize', () => {
    win.isMaximized() ? win.unmaximize() : win.maximize();
  });
  ipcMain.on('window-close', () => win.close());

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  win.once('ready-to-show', () => {
    win.show();
    win.maximize();
    log.info('App', 'Window ready');
  });

    ipcMain.on('app:focus', () => {
    if (win && !win.isDestroyed()) { win.show(); win.focus(); win.moveTop(); }
  });

  registerHandlers(win, app, previewCacheDir, () => streamServerPort);
  log.info('App', 'IPC handlers registered');
}

let streamServerPort = 0;
const streamServer = http.createServer();

async function handleStreamRequest(req, res) {
  let aborted = false;
  req.on('close', () => { aborted = true; });

  try {
    const m = req.url.match(/^\/stream\/(\d+)$/);
    if (!m) { res.writeHead(404); res.end(); return; }

    const msgId = parseInt(m[1], 10);
    const range = req.headers.range;
    log.debug('Stream', 'HTTP server request:', req.url, 'Range:', range);

    const client = getClient();
    if (!client || !client.connected) {
      res.writeHead(503); res.end('Telegram not connected');
      return;
    }

    const msgs = await client.invoke(new Api.messages.GetMessages({ id: [msgId] }));
    const msg = msgs.messages?.[0];
    if (!msg || !msg.media) { res.writeHead(404); res.end('Not found'); return; }

    let fileSize, mimeType, location;
    if (msg.media?.document) {
      const doc = msg.media.document;
      fileSize = Number(doc.size);
      mimeType = doc.mimeType || 'video/mp4';
      location = new Api.InputDocumentFileLocation({
        id: doc.id, accessHash: doc.accessHash, fileReference: doc.fileReference, thumbSize: '',
      });
    } else if (msg.media?.photo) {
      const sizes = (msg.media.photo.sizes || []).filter(s => s.size);
      const largest = sizes.sort((a, b) => (b.size || 0) - (a.size || 0))[0];
      if (!largest) { res.writeHead(404); res.end(); return; }
      fileSize = largest.size || 0;
      mimeType = 'image/jpeg';
      location = new Api.InputPhotoFileLocation({
        id: msg.media.photo.id, accessHash: msg.media.photo.accessHash,
        fileReference: msg.media.photo.fileReference, thumbSize: largest.type,
      });
    } else {
      res.writeHead(400); res.end(); return;
    }

    let start = 0, end = fileSize - 1;
    if (range) {
      const rm = range.match(/bytes=(\d+)-(\d*)/);
      if (rm) { start = parseInt(rm[1], 10); if (rm[2]) end = parseInt(rm[2], 10); }
    }
    const contentLen = end - start + 1;
    log.debug('Stream', 'Serving bytes', start, '-', end, 'of', fileSize, 'type:', mimeType);

    const headers = {
      'Content-Type': mimeType,
      'Content-Length': String(contentLen),
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
    };
    if (range) headers['Content-Range'] = `bytes ${start}-${end}/${fileSize}`;
    res.writeHead(range ? 206 : 200, headers);

    const { iterDownload } = require('telegram/client/downloads');
    const total = end - start + 1;
    let served = 0;
    const iter = iterDownload(client, {
      file: location,
      offset: bigInt(start),
      requestSize: CHUNK_SIZE,
      fileSize: bigInt(fileSize),
    });

    for await (const chunk of iter) {
      if (aborted || res.destroyed) break;
      const need = total - served;
      if (chunk.length > need) {
        res.write(chunk.slice(0, need));
        served += need;
      } else {
        res.write(chunk);
        served += chunk.length;
      }
      if (served >= total) break;
    }
    if (!res.writableEnded) res.end();
  } catch (e) {
    if (e.message?.includes('write') || e.code === 'ERR_STREAM_DESTROYED') return;
    log.error('Stream', 'HTTP server error:', e);
    if (!res.headersSent) res.writeHead(500);
    if (!res.writableEnded) res.end();
  }
}

function startStreamServer() {
  streamServer.on('request', handleStreamRequest);
  streamServer.listen(0, () => {
    streamServerPort = streamServer.address().port;
    log.info('Stream', `Local HTTP server on port ${streamServerPort}`);
  });
}

app.whenReady().then(() => {
  log.info('App', 'Starting Gram Drive...');
  startStreamServer();

  if (fs.existsSync(previewCacheDir)) {
    for (const f of fs.readdirSync(previewCacheDir)) {
      try { fs.unlinkSync(path.join(previewCacheDir, f)); } catch {}
    }
  }
  fs.mkdirSync(previewCacheDir, { recursive: true });

  createWindow();
});

app.on('window-all-closed', () => {
  database.close();
  telegram.destroy();
  streamServer.close();
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  database.close();
  telegram.destroy();
  streamServer.close();
});
