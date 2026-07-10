const path = require('path');
const fs = require('fs');
const log = require('./logger');

let assetsDir = null;

function getAssetsDir() {
  if (assetsDir) return assetsDir;
  const { app } = require('electron');
  if (app?.isPackaged) {
    assetsDir = path.join(process.resourcesPath, 'assets', 'Images', 'Files');
  } else {
    assetsDir = path.join(__dirname, '..', 'assets', 'Images', 'Files');
  }
  return assetsDir;
}

function resolveIconDataUrl(type, ext) {
  try {
    const dir = getAssetsDir();
    let filePath = null;

    if (ext) {
      const p = path.join(dir, 'Extensions', ext.toLowerCase() + '.png');
      if (fs.existsSync(p)) filePath = p;
    }

    if (!filePath && type) {
      const p = path.join(dir, 'Base', type.toLowerCase() + 'base.png');
      if (fs.existsSync(p)) filePath = p;
    }

    if (!filePath) {
      const p = path.join(dir, 'Base', 'base.png');
      if (fs.existsSync(p)) filePath = p;
    }

    if (!filePath) return null;

    const buf = fs.readFileSync(filePath);
    return `data:image/png;base64,${buf.toString('base64')}`;
  } catch (err) {
    log.error('Icons', 'resolveIconDataUrl error:', err.message);
    return null;
  }
}

function resolveFolderIconDataUrl() {
  try {
    const { app } = require('electron');
    let dir;
    if (app?.isPackaged) {
      dir = path.join(process.resourcesPath, 'assets', 'Images', 'Folders', 'All');
    } else {
      dir = path.join(__dirname, '..', 'assets', 'Images', 'Folders', 'All');
    }
    const p = path.join(dir, 'BaseDark1.png');
    if (fs.existsSync(p)) {
      const buf = fs.readFileSync(p);
      return `data:image/png;base64,${buf.toString('base64')}`;
    }
    return null;
  } catch (err) {
    log.error('Icons', 'resolveFolderIconDataUrl error:', err.message);
    return null;
  }
}

function resolveIconBySingleName(name) {
  if (!name) return null;
  return resolveIconDataUrl(name, name);
}

module.exports = { resolveIconDataUrl, resolveIconBySingleName, resolveFolderIconDataUrl };
