const { ipcMain, dialog } = require('electron');
const path = require('path');
const telegram = require('./telegram');
const database = require('./database');
const sync = require('./sync');
const files = require('./files');
const log = require('./logger');

function registerHandlers(win, app, previewCacheDir, getStreamPort) {

  // == Telegram auth ==

  ipcMain.handle('telegram:check-auth', async () => {
    try {
      const authed = await telegram.initClient(app);
      const session = telegram.loadSession(app);
      log.info('IPC', 'check-auth ->', authed ? 'authorized' : 'not authorized');
      return { authenticated: authed, hasSession: !!session };
    } catch (err) {
      log.error('IPC', 'check-auth error:', err.message);
      return { authenticated: false, hasSession: false, error: err.message };
    }
  });

  ipcMain.handle('telegram:send-code', async (_event, phone) => {
    try {
      const result = await telegram.sendCode(app, phone);
      log.info('IPC', 'send-code -> sent to', phone);
      return { success: true, ...result };
    } catch (err) {
      log.error('IPC', 'send-code error:', err.message);
      return { success: false, error: err.message || err.errorMessage };
    }
  });

  ipcMain.handle('telegram:verify-code', async (_event, code) => {
    try {
      const result = await telegram.verifyCode(app, code);
      log.info('IPC', 'verify-code ->', result.passwordNeeded ? 'password needed' : 'ok');
      return { success: true, ...result };
    } catch (err) {
      log.error('IPC', 'verify-code error:', err.message);
      return { success: false, error: err.message || err.errorMessage };
    }
  });

  ipcMain.handle('telegram:check-password', async (_event, password) => {
    try {
      const result = await telegram.checkPassword(app, password);
      log.info('IPC', 'check-password -> ok');
      return { success: true, ...result };
    } catch (err) {
      log.error('IPC', 'check-password error:', err.message);
      return { success: false, error: err.message || err.errorMessage };
    }
  });

  ipcMain.handle('telegram:sign-out', async () => {
    try {
      const result = await telegram.signOut(app);
      database.close();
      log.info('IPC', 'sign-out -> ok');
      return { success: true, ...result };
    } catch (err) {
      log.error('IPC', 'sign-out error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // == Database ==

  ipcMain.handle('db:init', async () => {
    try {
      database.init(app);
      log.info('IPC', 'db:init -> ok');
      return { success: true };
    } catch (err) {
      log.error('IPC', 'db:init error:', err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('db:get-items', async (_event, parentId) => {
    try {
      const items = database.getItems(parentId);
      return { success: true, items };
    } catch (err) {
      log.error('IPC', 'db:get-items error:', err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('db:get-item', async (_event, id) => {
    try {
      return { success: true, item: database.getItem(id) };
    } catch (err) {
      log.error('IPC', 'db:get-item error:', err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('db:get-all', async () => {
    try {
      return { success: true, items: database.getAllItems(), count: database.getItemCount() };
    } catch (err) {
      log.error('IPC', 'db:get-all error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // == Sync ==

  ipcMain.handle('sync:upload', async () => {
    try {
      const result = await sync.uploadDb(app);
      log.info('IPC', 'sync:upload -> message ID:', result.messageId);
      return { success: true, ...result };
    } catch (err) {
      log.error('IPC', 'sync:upload error:', err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('sync:download', async () => {
    try {
      const result = await sync.downloadDb(app);
      if (result.found) {
        log.info('IPC', 'sync:download -> found, indexing...');
        const indexed = await sync.syncFromTelegram();
        result.indexed = indexed;
        if (indexed > 0) {
          log.info('IPC', 'sync:download -> uploading updated DB with', indexed, 'new files');
          await sync.uploadDb(app);
        }
      } else {
        log.info('IPC', 'sync:download -> not found');
      }
      return { success: true, ...result };
    } catch (err) {
      log.error('IPC', 'sync:download error:', err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('sync:index-telegram', async () => {
    try {
      const indexed = await sync.syncFromTelegram();
      log.info('IPC', 'sync:index-telegram ->', indexed, 'new files');
      if (indexed > 0) {
        await sync.uploadDb(app);
      }
      return { success: true, indexed };
    } catch (err) {
      log.error('IPC', 'sync:index-telegram error:', err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('sync:status', async () => {
    try {
      const msgId = database.getDbMessageId();
      const count = database.getItemCount();
      return { success: true, synced: !!msgId, messageId: msgId, itemCount: count };
    } catch (err) {
      log.error('IPC', 'sync:status error:', err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('sync:start-auto-index', async () => {
    try {
      await sync.startAutoIndex();
      log.info('IPC', 'auto-index started');
      return { success: true };
    } catch (err) {
      log.error('IPC', 'auto-index start error:', err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('sync:stop-auto-index', async () => {
    sync.stopAutoIndex();
    log.info('IPC', 'auto-index stopped');
    return { success: true };
  });

  // == Folder CRUD (with auto-sync) ==

  ipcMain.handle('folder:create', async (_event, parentId, name) => {
    try {
      const uuid = require('crypto').randomUUID();
      const now = Math.floor(Date.now() / 1000);
      database.addItem({
        Id: uuid,
        ParentId: parentId || '-1',
        Name: name,
        IsFolder: 1,
        TimeCreation: now,
        TimeUpdate: now,
      });
      log.info('IPC', 'folder:create ->', name, '(' + uuid.slice(0, 8) + '...)');
      let synced = true;
      try { await sync.uploadDb(app); } catch { synced = false; }
      return { success: true, id: uuid, synced };
    } catch (err) {
      log.error('IPC', 'folder:create error:', err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('folder:rename', async (_event, id, name) => {
    try {
      database.updateItem(id, { Name: name, TimeUpdate: Math.floor(Date.now() / 1000) });
      log.info('IPC', 'folder:rename ->', id.slice(0, 8) + '... ->', name);
      let synced = true;
      try { await sync.uploadDb(app); } catch { synced = false; }
      return { success: true, synced };
    } catch (err) {
      log.error('IPC', 'folder:rename error:', err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('folder:move', async (_event, id, newParentId) => {
    try {
      database.updateItem(id, { ParentId: newParentId, TimeUpdate: Math.floor(Date.now() / 1000) });
      log.info('IPC', 'folder:move ->', id.slice(0, 8) + '...');
      let synced = true;
      try { await sync.uploadDb(app); } catch { synced = false; }
      return { success: true, synced };
    } catch (err) {
      log.error('IPC', 'folder:move error:', err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('folder:delete', async (_event, id) => {
    try {
      const recurseDelete = (parentId) => {
        const children = database.getItems(parentId);
        for (const child of children) {
          if (child.IsFolder) recurseDelete(child.Id);
          database.deleteItem(child.Id);
        }
      };
      recurseDelete(id);
      database.deleteItem(id);
      log.info('IPC', 'folder:delete ->', id.slice(0, 8) + '...');
      let synced = true;
      try { await sync.uploadDb(app); } catch { synced = false; }
      return { success: true, synced };
    } catch (err) {
      log.error('IPC', 'folder:delete error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // == File upload/download ==

  ipcMain.handle('file:upload', async (_event, parentId) => {
    try {
      const result = await dialog.showOpenDialog(win, {
        properties: ['openFile', 'multiSelections'],
      });
      if (result.canceled || !result.filePaths.length) {
        log.info('IPC', 'file:upload -> canceled');
        return { success: true, canceled: true };
      }

      const items = [];
      for (const fp of result.filePaths) {
        const item = await files.uploadFile(fp, parentId);
        database.addItem(item);
        items.push(item);
      }

      log.info('IPC', 'file:upload ->', items.length, 'files uploaded');
      let synced = true;
      try { await sync.uploadDb(app); } catch { synced = false; }
      return { success: true, items, synced };
    } catch (err) {
      log.error('IPC', 'file:upload error:', err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('file:download', async (_event, itemId) => {
    try {
      const item = database.getItem(itemId);
      if (!item) throw new Error('Item not found');
      if (item.IsFolder) throw new Error('Cannot download a folder');

      const result = await dialog.showSaveDialog(win, {
        defaultPath: item.Name,
      });
      if (result.canceled || !result.filePath) {
        log.info('IPC', 'file:download -> canceled');
        return { success: true, canceled: true };
      }

      await files.downloadFile(item, result.filePath);
      log.info('IPC', 'file:download ->', item.Name);
      return { success: true, path: result.filePath };
    } catch (err) {
      log.error('IPC', 'file:download error:', err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('icon:get', async (_event, name) => {
    try {
      const { resolveIconBySingleName } = require('./icons');
      const dataUrl = resolveIconBySingleName(name);
      if (!dataUrl) return { success: false };
      return { success: true, data: dataUrl.replace('data:image/png;base64,', '') };
    } catch (err) {
      log.error('IPC', 'icon:get error:', err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('icon:get-folder', async () => {
    try {
      const { resolveFolderIconDataUrl } = require('./icons');
      const dataUrl = resolveFolderIconDataUrl();
      if (!dataUrl) return { success: false };
      return { success: true, data: dataUrl.replace('data:image/png;base64,', '') };
    } catch (err) {
      log.error('IPC', 'icon:get-folder error:', err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('file:preview', async (_event, item) => {
    try {
      const type = item.Type || '';
      if (type === 'video') {
        const port = typeof getStreamPort === 'function' ? getStreamPort() : 0;
        const url = `http://localhost:${port}/stream/${item.MessageId}`;
        return { success: true, url, mimeType: item.MimeType || 'video/mp4', isStream: true };
      }
      const cachePath = await files.downloadToCache(item, previewCacheDir);
      const fs = require('fs');
      const buf = fs.readFileSync(cachePath);
      const base64 = buf.toString('base64');
      const mime = item.MimeType || 'image/jpeg';
      const url = `data:${mime};base64,${base64}`;
      return { success: true, url, mimeType: item.MimeType };
    } catch (err) {
      log.error('IPC', 'file:preview error:', err.message);
      return { success: false, error: err.message };
    }
  });

}

module.exports = { registerHandlers };
