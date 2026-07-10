const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const telegram = require('./telegram');

const isDev = !app.isPackaged;
let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    maximized: true,
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

  win.once('ready-to-show', () => {
    win.show();
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

ipcMain.handle('telegram:check-auth', async () => {
  try {
    const authed = await telegram.initClient(app);
    const session = telegram.loadSession(app);
    return { authenticated: authed, hasSession: !!session };
  } catch (err) {
    return { authenticated: false, hasSession: false, error: err.message };
  }
});

ipcMain.handle('telegram:send-code', async (_event, phone) => {
  try {
    const result = await telegram.sendCode(app, phone);
    return { success: true, ...result };
  } catch (err) {
    return { success: false, error: err.message || err.errorMessage };
  }
});

ipcMain.handle('telegram:verify-code', async (_event, code) => {
  try {
    const result = await telegram.verifyCode(app, code);
    return { success: true, ...result };
  } catch (err) {
    return { success: false, error: err.message || err.errorMessage };
  }
});

ipcMain.handle('telegram:check-password', async (_event, password) => {
  try {
    const result = await telegram.checkPassword(app, password);
    return { success: true, ...result };
  } catch (err) {
    return { success: false, error: err.message || err.errorMessage };
  }
});

ipcMain.handle('telegram:sign-out', async () => {
  try {
    const result = await telegram.signOut(app);
    return { success: true, ...result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  telegram.destroy();
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  telegram.destroy();
});
