const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  telegram: {
    checkAuth: () => ipcRenderer.invoke('telegram:check-auth'),
    sendCode: (phone) => ipcRenderer.invoke('telegram:send-code', phone),
    verifyCode: (code) => ipcRenderer.invoke('telegram:verify-code', code),
    checkPassword: (password) => ipcRenderer.invoke('telegram:check-password', password),
    signOut: () => ipcRenderer.invoke('telegram:sign-out'),
  },
});
