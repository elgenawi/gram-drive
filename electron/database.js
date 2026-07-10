const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const log = require('./logger');

const DB_FILENAME = 'gram-drive-db.db';
const DB_CACHE_KEY = 'gram-drive-db-msg-id';

let db = null;
let app = null;

function getDbPath() {
  return path.join(app.getPath('userData'), DB_FILENAME);
}

function getCachePath() {
  return path.join(app.getPath('userData'), DB_CACHE_KEY);
}

function init(userApp) {
  app = userApp;
  const dbPath = getDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const exists = fs.existsSync(dbPath);
  log.info('DB', exists ? 'Opening existing database' : 'Creating new database', dbPath);

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  if (!exists) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS FSitems (
        "Id" TEXT PRIMARY KEY NOT NULL,
        "IdInMessage" INTEGER,
        "IsActive" INTEGER DEFAULT 1,
        "ParentId" TEXT DEFAULT '-1',
        "MimeType" TEXT,
        "Name" TEXT,
        "IsFolder" INTEGER DEFAULT 0,
        "TimeCreation" INTEGER,
        "TimeUpdate" INTEGER,
        "Size" INTEGER DEFAULT 0,
        "IsSelected" INTEGER DEFAULT 0,
        "Extention" TEXT,
        "MessageId" INTEGER,
        "LocalUrl" TEXT,
        "Icon" TEXT,
        "Type" TEXT,
        "ThumbnailUrl" TEXT,
        "RemoteId" TEXT,
        "RemoteUniqueId" TEXT,
        "Note" TEXT,
        "SizeNormal" TEXT,
        "DateNormal" TEXT,
        "ExtentionNormal" TEXT
      );
    `);
  }

  return db;
}

function getDb() {
  return db;
}

function close() {
  if (db) {
    log.debug('DB', 'Closing database');
    db.close();
    db = null;
  }
}

// == CRUD ==

function getItems(parentId) {
  return db.prepare('SELECT * FROM FSitems WHERE ParentId = ? ORDER BY IsFolder DESC, Name ASC').all(parentId || '-1');
}

function getItem(id) {
  return db.prepare('SELECT * FROM FSitems WHERE Id = ?').get(id);
}

function getRootFolders() {
  return db.prepare("SELECT * FROM FSitems WHERE ParentId = '-1' AND IsFolder = 1 ORDER BY Name ASC").all();
}

function getAllItems() {
  return db.prepare('SELECT * FROM FSitems ORDER BY IsFolder DESC, Name ASC').all();
}

function addItem(item) {
  log.debug('DB', 'Adding item:', item.Name || '(no name)');
  const stmt = db.prepare(`
    INSERT INTO FSitems (Id, IdInMessage, IsActive, ParentId, MimeType, Name, IsFolder,
      TimeCreation, TimeUpdate, Size, IsSelected, Extention, MessageId, LocalUrl, Icon,
      Type, ThumbnailUrl, RemoteId, RemoteUniqueId, Note, SizeNormal, DateNormal, ExtentionNormal)
    VALUES (@Id, @IdInMessage, @IsActive, @ParentId, @MimeType, @Name, @IsFolder,
      @TimeCreation, @TimeUpdate, @Size, @IsSelected, @Extention, @MessageId, @LocalUrl, @Icon,
      @Type, @ThumbnailUrl, @RemoteId, @RemoteUniqueId, @Note, @SizeNormal, @DateNormal, @ExtentionNormal)
  `);
  const safe = v => v ?? null;
  const safeNum = v => (v != null ? Number(v) : null);
  stmt.run({
    Id: safe(item.Id),
    IdInMessage: safeNum(item.IdInMessage),
    IsActive: safeNum(item.IsActive) ?? 1,
    ParentId: safe(item.ParentId) ?? '-1',
    MimeType: safe(item.MimeType),
    Name: safe(item.Name) ?? 'Untitled',
    IsFolder: safeNum(item.IsFolder) ?? 0,
    TimeCreation: safeNum(item.TimeCreation) ?? Math.floor(Date.now() / 1000),
    TimeUpdate: safeNum(item.TimeUpdate) ?? Math.floor(Date.now() / 1000),
    Size: safeNum(item.Size) ?? 0,
    IsSelected: safeNum(item.IsSelected) ?? 0,
    Extention: safe(item.Extention),
    MessageId: safeNum(item.MessageId),
    LocalUrl: safe(item.LocalUrl),
    Icon: safe(item.Icon),
    Type: safe(item.Type),
    ThumbnailUrl: safe(item.ThumbnailUrl),
    RemoteId: safe(item.RemoteId),
    RemoteUniqueId: safe(item.RemoteUniqueId),
    Note: safe(item.Note),
    SizeNormal: safe(item.SizeNormal),
    DateNormal: safe(item.DateNormal),
    ExtentionNormal: safe(item.ExtentionNormal),
  });
}

function updateItem(id, fields) {
  const sets = Object.keys(fields).map(k => `"${k}" = @${k}`).join(', ');
  fields.Id = id;
  db.prepare(`UPDATE FSitems SET ${sets} WHERE Id = @Id`).run(fields);
}

function deleteItem(id) {
  db.prepare('DELETE FROM FSitems WHERE Id = ?').run(id);
}

function getItemCount() {
  return db.prepare('SELECT COUNT(*) as count FROM FSitems').get().count;
}

function getAllItemMessageIds() {
  const rows = db.prepare('SELECT MessageId FROM FSitems WHERE MessageId IS NOT NULL').all();
  return new Set(rows.map(r => r.MessageId));
}

function getItemByMessageId(msgId) {
  return db.prepare('SELECT * FROM FSitems WHERE MessageId = ?').get(msgId);
}

// == Sync metadata ==

function getDbMessageId() {
  try {
    if (fs.existsSync(getCachePath())) {
      return parseInt(fs.readFileSync(getCachePath(), 'utf-8'), 10);
    }
  } catch {}
  return null;
}

function saveDbMessageId(msgId) {
  log.info('DB', 'Saving sync message ID:', msgId);
  fs.mkdirSync(path.dirname(getCachePath()), { recursive: true });
  fs.writeFileSync(getCachePath(), String(msgId), 'utf-8');
}

function clearDbMessageId() {
  log.info('DB', 'Clearing sync message ID');
  try { fs.unlinkSync(getCachePath()); } catch {}
}

// == Export/Import DB file ==

function exportDbToBuffer() {
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) {
    log.warn('DB', 'File not found in exportDbToBuffer, creating:', dbPath);
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.exec(`
      CREATE TABLE IF NOT EXISTS FSitems (
        "Id" TEXT PRIMARY KEY NOT NULL,
        "IdInMessage" INTEGER,
        "IsActive" INTEGER DEFAULT 1,
        "ParentId" TEXT DEFAULT '-1',
        "MimeType" TEXT,
        "Name" TEXT,
        "IsFolder" INTEGER DEFAULT 0,
        "TimeCreation" INTEGER,
        "TimeUpdate" INTEGER,
        "Size" INTEGER DEFAULT 0,
        "IsSelected" INTEGER DEFAULT 0,
        "Extention" TEXT,
        "MessageId" INTEGER,
        "LocalUrl" TEXT,
        "Icon" TEXT,
        "Type" TEXT,
        "ThumbnailUrl" TEXT,
        "RemoteId" TEXT,
        "RemoteUniqueId" TEXT,
        "Note" TEXT,
        "SizeNormal" TEXT,
        "DateNormal" TEXT,
        "ExtentionNormal" TEXT
      );
    `);
  }
  close();
  const buf = fs.readFileSync(dbPath);
  init(app);
  return buf;
}

function importDbFromBuffer(buf) {
  close();
  fs.writeFileSync(getDbPath(), buf);
  init(app);
}

module.exports = {
  init, getDb, close,
  getItems, getItem, getRootFolders, getAllItems,
  addItem, updateItem, deleteItem, getItemCount,
  getAllItemMessageIds, getItemByMessageId,
  getDbMessageId, saveDbMessageId, clearDbMessageId,
  exportDbToBuffer, importDbFromBuffer,
};
