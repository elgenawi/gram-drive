const path = require('path');
const { Api } = require('telegram/tl');
const { CustomFile } = require('telegram/client/uploads');
const database = require('./database');
const log = require('./logger');

const DB_NAME = 'gram-drive-db.db';

function getClient() {
  return require('./telegram').getClient();
}

async function ensurePeer() {
  const client = getClient();
  if (!client || !client.connected) throw new Error('Telegram not connected');
  return client.getInputEntity('me');
}

async function uploadDb() {
  const client = getClient();
  if (!client || !client.connected) throw new Error('Telegram not connected');

  const dbBuf = database.exportDbToBuffer();
  const oldMsgId = database.getDbMessageId();
  const peer = await ensurePeer();

  if (oldMsgId) {
    try {
      await client.invoke(new Api.messages.DeleteMessages({ id: [oldMsgId], revoke: true }));
    } catch {}
  }

  const result = await client.sendFile(peer, {
    file: new CustomFile(DB_NAME, dbBuf.length, '', dbBuf),
    forceDocument: true,
  });

  if (!result || !result.id) throw new Error('Upload returned no message ID');

  const msgId = result.id;
  database.saveDbMessageId(msgId);
  log.info('Sync', 'DB uploaded, message ID:', msgId);

  return { messageId: msgId };
}

async function downloadDb() {
  const client = getClient();
  if (!client || !client.connected) throw new Error('Telegram not connected');

  let msgId = database.getDbMessageId();

  if (!msgId) {
    const found = await findDbMessage(client);
    if (!found) return { found: false };
    msgId = found.id;
    database.saveDbMessageId(msgId);
  }

  const peer = await ensurePeer();
  const messages = await client.invoke(new Api.messages.GetMessages({ id: [msgId] }));

  const msg = messages.messages?.[0];
  if (!msg) {
    database.clearDbMessageId();
    return { found: false };
  }

  const buf = await client.downloadMedia(msg);
  if (!buf) throw new Error('Failed to download DB');

  database.importDbFromBuffer(Buffer.from(buf));
  return { found: true, messageId: msgId };
}

async function findDbMessage(client) {
  const peer = await client.getInputEntity('me');
  const result = await client.invoke(new Api.messages.Search({
    peer,
    q: DB_NAME,
    filter: new Api.InputMessagesFilterDocument(),
    limit: 50,
  }));

  if (!result.messages?.length) return null;

  for (const msg of result.messages) {
    if (msg.media?.document) {
      for (const attr of msg.media.document.attributes || []) {
        if (attr.fileName === DB_NAME) {
          return { id: msg.id };
        }
      }
    }
  }

  return null;
}

function mimeType(mime) {
  if (!mime) return 'other';
  const t = mime.split('/')[0];
  if (['image', 'video', 'audio'].includes(t)) return t;
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('tar') || mime.includes('7z') || mime.includes('gzip')) return 'archive';
  return 'other';
}

function buildItemFromMessage(msg) {
  if (!msg || !msg.media) return null;
  if (database.getItemByMessageId(msg.id)) return null;

  const ts = Math.floor(Date.now() / 1000);
  const uuid = require('crypto').randomUUID();

  if (msg.media.document) {
    const doc = msg.media.document;
    let fileName = null;
    for (const attr of doc.attributes || []) {
      if (attr.fileName) { fileName = attr.fileName; break; }
    }
    if (fileName === DB_NAME) return null;

    if (!fileName) {
      const mime = doc.mimeType || 'bin';
      const ext = (mime.split('/')[1] || 'bin').replace(/[^a-z0-9]/gi, '');
      fileName = `media_${ts}.${ext}`;
    }
    const ext = path.extname(fileName).replace('.', '') || 'bin';
    const mime = doc.mimeType || 'application/octet-stream';

    return {
      Id: uuid, ParentId: '-1', Name: fileName, IsFolder: 0,
      Size: Number(doc.size) || 0, MimeType: mime,
      Extention: ext, MessageId: Number(msg.id),
      RemoteId: String(doc.id), RemoteUniqueId: String(doc.accessHash),
      TimeCreation: ts, TimeUpdate: ts, IsActive: 1,
      Type: mimeType(mime),
    };
  }

  if (msg.media.photo) {
    const photo = msg.media.photo;
    const largest = photo.sizes?.reduce?.((a, b) => (a.size || 0) > (b.size || 0) ? a : b);
    const size = largest?.size || 0;
    return {
      Id: uuid, ParentId: '-1', Name: `photo_${ts}.jpg`, IsFolder: 0,
      Size: size, MimeType: 'image/jpeg', Extention: 'jpg',
      MessageId: Number(msg.id),
      RemoteId: String(photo.id), RemoteUniqueId: String(photo.accessHash),
      TimeCreation: ts, TimeUpdate: ts, IsActive: 1,
      Type: 'image',
    };
  }

  return null;
}

async function syncFromTelegram() {
  const client = getClient();
  if (!client || !client.connected) throw new Error('Telegram not connected');

  const peer = await client.getInputEntity('me');
  const existingIds = database.getAllItemMessageIds();
  let indexed = 0;
  const thumbQueue = [];

  const filters = [
    { filter: new Api.InputMessagesFilterDocument(), name: 'documents' },
    { filter: new Api.InputMessagesFilterPhotoVideo(), name: 'media' },
  ];

  for (const { filter } of filters) {
    let offsetId = 0;
    while (true) {
      const result = await client.invoke(new Api.messages.Search({
        peer, q: '', filter, limit: 100,
        offset_id: offsetId, max_id: 0, min_id: 0, add_offset: 0,
      }));
      const msgs = result.messages || [];
      if (!msgs.length) break;
      for (const msg of msgs) {
        if (existingIds.has(msg.id)) continue;
        const item = buildItemFromMessage(msg);
        if (!item) continue;
        database.addItem(item);
        existingIds.add(msg.id);
        indexed++;
        if (item.Type === 'image' || item.Type === 'video') {
          thumbQueue.push({ id: item.Id, msg });
        }
      }
      if (msgs.length < 100) break;
      offsetId = msgs[msgs.length - 1].id;
    }
  }

  for (const { id, msg } of thumbQueue) {
    const dataUrl = await downloadThumbnailDataUrl(msg);
    if (dataUrl) database.updateItem(id, { ThumbnailUrl: dataUrl });
  }
  if (thumbQueue.length) log.info('Sync', 'Thumbnails saved:', thumbQueue.length);

  const isPreviewable = (f) => f.Type === 'image' || f.Type === 'video' || f.MimeType?.startsWith('image/') || f.MimeType?.startsWith('video/');
  const missing = (database.getAllItems() || []).filter(f => !f.IsFolder && isPreviewable(f) && !f.ThumbnailUrl && f.MessageId);
  if (missing.length) {
    log.info('Sync', 'Backfilling', missing.length, 'thumbnails...');
    for (const item of missing.slice(0, 50)) {
      try {
        const msgs = await client.invoke(new Api.messages.GetMessages({ id: [item.MessageId] }));
        const msg = msgs.messages?.[0];
        if (msg) {
          const dataUrl = await downloadThumbnailDataUrl(msg);
          if (dataUrl) database.updateItem(item.Id, { ThumbnailUrl: dataUrl });
        }
      } catch {}
    }
    log.info('Sync', 'Thumbnail backfill done');
  }

  log.info('Sync', 'Indexed', indexed, 'new files from Telegram');
  return indexed;
}

let autoIndexHandler = null;
let autoIndexStarted = false;
let pingInterval = null;

async function startAutoIndex() {
  if (autoIndexStarted) {
    log.debug('Auto-Index', 'Already running');
    return;
  }

  const client = getClient();
  if (!client || !client.connected) throw new Error('Telegram not connected');

  if (autoIndexHandler) {
    try { client.removeEventHandler(autoIndexHandler); } catch {}
    autoIndexHandler = null;
  }

  client.autoReconnect = true;
  try { client.session.setKeepAliveDC(true); } catch {}

  const { NewMessage } = require('telegram/events');

  autoIndexHandler = async (event) => {
    try {
      const msg = event.message;
      if (!msg || !msg.media) return;

      log.debug('Auto-Index', 'Msg:', msg.id, 'media:', msg.media._, 'out:', msg.out, 'private:', msg.isPrivate, 'chat:', msg.chatId);

      const item = buildItemFromMessage(msg);
      if (!item) return;

      database.addItem(item);
      if (item.Type === 'image' || item.Type === 'video') {
        const dataUrl = await downloadThumbnailDataUrl(msg);
        if (dataUrl) database.updateItem(item.Id, { ThumbnailUrl: dataUrl });
      }
      await uploadDb();
      log.info('Auto-Index', 'Indexed:', item.Name);
    } catch (err) {
      log.error('Auto-Index', err.message);
    }
  };

  client.addEventHandler(autoIndexHandler, new NewMessage({}));
  autoIndexStarted = true;
  log.info('Auto-Index', 'Listening for new documents...');

  if (pingInterval) clearInterval(pingInterval);
  pingInterval = setInterval(async () => {
    try {
      if (client.connected) {
        await client.invoke(new Api.PingDelayDisconnect({ pingId: Math.floor(Math.random() * 100000), disconnectDelay: 120 }));
      }
    } catch {}
  }, 55000);
}

function stopAutoIndex() {
  const client = getClient();
  if (pingInterval) { clearInterval(pingInterval); pingInterval = null; }
  if (client && autoIndexHandler) {
    try { client.removeEventHandler(autoIndexHandler); } catch {}
    autoIndexHandler = null;
  }
  autoIndexStarted = false;
  log.info('Auto-Index', 'Stopped');
}

async function downloadThumbnailDataUrl(msg) {
  if (!msg || !msg.media) return null;
  try {
    const client = getClient();
    if (!client || !client.connected) return null;

    if (msg.media.photo) {
      const fresh = await client.invoke(new Api.messages.GetMessages({ id: [msg.id] }));
      const photo = fresh.messages?.[0]?.media?.photo;
      if (!photo) return null;

      const thumbTypes = ['x', 'y', 'w', 'm', 's'];
      for (const t of thumbTypes) {
        const size = (photo.sizes || []).find(s => s.type === t);
        if (!size) continue;
        if (size._ === 'photoStrippedSize' || size._ === 'PhotoStrippedSize') continue;
        if (!size.size || size.size < 2000) continue;
        try {
          const loc = new Api.InputPhotoFileLocation({
            id: photo.id,
            accessHash: photo.accessHash,
            fileReference: photo.fileReference,
            thumbSize: t,
          });
          const buf = await client.downloadFile(loc, {});
          if (buf && Buffer.from(buf).length > 2000) {
            const base64 = Buffer.from(buf).toString('base64');
            log.debug('Thumb', 'Downloaded photo', t, 'bytes:', Buffer.from(buf).length);
            return `data:image/jpeg;base64,${base64}`;
          }
        } catch (err) {
          log.debug('Thumb', 'Failed', t, err.message);
        }
      }

      const stripped = (photo.sizes || []).find(s => s.bytes && Buffer.from(s.bytes).length > 50);
      if (stripped) {
        const base64 = Buffer.from(stripped.bytes).toString('base64');
        log.debug('Thumb', 'Fallback inline photo', Buffer.from(stripped.bytes).length);
        return `data:image/jpeg;base64,${base64}`;
      }
    }

    if (msg.media.document?.thumbs?.length) {
      const sizes = msg.media.document.thumbs;
      for (let i = sizes.length - 1; i >= 0; i--) {
        if (sizes[i].bytes && Buffer.from(sizes[i].bytes).length > 50) {
          const base64 = Buffer.from(sizes[i].bytes).toString('base64');
          return `data:image/jpeg;base64,${base64}`;
        }
        try {
          const buf = await client.downloadMedia(msg, { thumb: i });
          if (buf && Buffer.from(buf).length > 500) {
            const base64 = Buffer.from(buf).toString('base64');
            return `data:image/jpeg;base64,${base64}`;
          }
        } catch {}
      }
    }

    return null;
  } catch (err) {
    log.error('Thumb', 'Failed:', err.message);
    return null;
  }
}

module.exports = { uploadDb, downloadDb, findDbMessage, syncFromTelegram, startAutoIndex, stopAutoIndex, downloadThumbnailDataUrl };
