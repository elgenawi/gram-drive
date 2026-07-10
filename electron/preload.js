const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  focus: () => ipcRenderer.send('app:focus'),
  telegram: {
    checkAuth: () => ipcRenderer.invoke('telegram:check-auth'),
    sendCode: (phone) => ipcRenderer.invoke('telegram:send-code', phone),
    verifyCode: (code) => ipcRenderer.invoke('telegram:verify-code', code),
    checkPassword: (password) => ipcRenderer.invoke('telegram:check-password', password),
    signOut: () => ipcRenderer.invoke('telegram:sign-out'),
  },
  db: {
    init: () => ipcRenderer.invoke('db:init'),
    getItems: (parentId) => ipcRenderer.invoke('db:get-items', parentId),
    getItem: (id) => ipcRenderer.invoke('db:get-item', id),
    getAll: () => ipcRenderer.invoke('db:get-all'),
  },
  sync: {
    upload: () => ipcRenderer.invoke('sync:upload'),
    download: () => ipcRenderer.invoke('sync:download'),
    indexTelegram: () => ipcRenderer.invoke('sync:index-telegram'),
    startAutoIndex: () => ipcRenderer.invoke('sync:start-auto-index'),
    stopAutoIndex: () => ipcRenderer.invoke('sync:stop-auto-index'),
    status: () => ipcRenderer.invoke('sync:status'),
  },
  folder: {
    create: (parentId, name) => ipcRenderer.invoke('folder:create', parentId, name),
    rename: (id, name) => ipcRenderer.invoke('folder:rename', id, name),
    move: (id, newParentId) => ipcRenderer.invoke('folder:move', id, newParentId),
    delete: (id) => ipcRenderer.invoke('folder:delete', id),
  },
  icon: {
    get: (name) => ipcRenderer.invoke('icon:get', name),
    getFolder: () => ipcRenderer.invoke('icon:get-folder'),
  },
  file: {
    upload: (parentId) => ipcRenderer.invoke('file:upload', parentId),
    download: (itemId) => ipcRenderer.invoke('file:download', itemId),
    preview: (item) => ipcRenderer.invoke('file:preview', item),
  },
});
