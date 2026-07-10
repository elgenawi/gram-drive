const { CustomFile } = require('telegram/client/uploads');
const { Api } = require('telegram/tl');
const path = require('path');
const fs = require('fs');
const log = require('./logger');
const { downloadThumbnailDataUrl } = require('./sync');

function getClient() {
  return require('./telegram').getClient();
}

async function uploadFile(filePath, parentId) {
  const client = getClient();
  if (!client || !client.connected) throw new Error('Telegram not connected');

  const stats = fs.statSync(filePath);
  const fileName = path.basename(filePath);
  const ext = path.extname(fileName).replace('.', '') || 'bin';
  const mime = require('mime-types').lookup(fileName) || 'application/octet-stream';
  log.info('Files', 'Uploading:', fileName, `(${(stats.size / 1024).toFixed(1)} KB)`);

  const result = await client.sendFile('me', {
    file: filePath,
    forceDocument: true,
    workers: 1,
  });
  log.info('Files', 'Uploaded:', fileName, '-> message ID:', result.id);

  const doc = result.media?.document;
  const remoteId = doc ? String(doc.id) : null;
  const remoteUniqueId = doc ? String(doc.accessHash) : null;
  const size = Number(doc?.size) || stats.size;

  const uuid = require('crypto').randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const mimeType = mime.split('/')[0];
  let type = 'other';
  if (['image', 'video', 'audio'].includes(mimeType)) type = mimeType;
  else if (mime.includes('zip') || mime.includes('rar') || mime.includes('tar') || mime.includes('7z')) type = 'archive';

  let thumbnailUrl = null;
  if (type === 'image' || type === 'video') {
    try { thumbnailUrl = await downloadThumbnailDataUrl(result); }
    catch { log.error('Files', 'Thumbnail failed:', fileName); }
  }

  return {
    Id: uuid,
    ParentId: parentId || '-1',
    Name: fileName,
    IsFolder: 0,
    Size: size,
    MimeType: mime,
    Extention: ext,
    MessageId: Number(result.id),
    RemoteId: remoteId,
    RemoteUniqueId: remoteUniqueId,
    TimeCreation: now,
    TimeUpdate: now,
    IsActive: 1,
    Type: type,
    ThumbnailUrl: thumbnailUrl,
  };
}

async function downloadFile(item, savePath) {
  const client = getClient();
  if (!client || !client.connected) throw new Error('Telegram not connected');
  log.info('Files', 'Downloading:', item.Name, '(message:', item.MessageId + ')');

  const messages = await client.invoke(new Api.messages.GetMessages({ id: [item.MessageId] }));
  const msg = messages.messages?.[0];
  if (!msg) throw new Error('Message not found');

  await client.downloadMedia(msg, savePath);
  log.info('Files', 'Downloaded:', item.Name, '->', savePath);
  return savePath;
}

const downloading = new Set();

async function downloadToCache(item, cacheDir) {
  const client = getClient();
  if (!client || !client.connected) throw new Error('Telegram not connected');

  const ext = item.Extention || 'bin';
  const cachePath = path.join(cacheDir, `${item.Id}.${ext}`);

  if (fs.existsSync(cachePath)) return cachePath;
  if (downloading.has(item.Id)) {
    while (downloading.has(item.Id)) await new Promise(r => setTimeout(r, 200));
    if (fs.existsSync(cachePath)) return cachePath;
    throw new Error('Download failed');
  }

  downloading.add(item.Id);
  try {
    const messages = await client.invoke(new Api.messages.GetMessages({ id: [item.MessageId] }));
    const msg = messages.messages?.[0];
    if (!msg) throw new Error('Message not found');

    await client.downloadMedia(msg, cachePath);
    log.info('Files', 'Cached preview:', item.Name);
    return cachePath;
  } finally {
    downloading.delete(item.Id);
  }
}

module.exports = { uploadFile, downloadFile, downloadToCache };
