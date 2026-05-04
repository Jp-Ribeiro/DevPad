const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('devpad', {
  // Store
  getStore: (key) => ipcRenderer.invoke('store-get', key),
  setStore: (key, value) => ipcRenderer.invoke('store-set', key, value),
  getAllStore: () => ipcRenderer.invoke('store-get-all'),

  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Settings
  setOpacity: (value) => ipcRenderer.send('set-opacity', value),
  setAlwaysOnTop: (value) => ipcRenderer.send('set-always-on-top', value),
  setGhostMode: (value) => ipcRenderer.send('set-ghost-mode', value),
  setAutoStart: (value) => ipcRenderer.send('set-auto-start', value),

  // Notifications
  showNotification: (title, body) => ipcRenderer.send('show-notification', { title, body }),
  scheduleReminder: (reminder) => ipcRenderer.send('schedule-reminder', reminder),
  cancelReminder: (id) => ipcRenderer.send('cancel-reminder', id),

  // Events from main
  onSettingsUpdated: (callback) => ipcRenderer.on('settings-updated', (_, data) => callback(data)),
  onReminderTriggered: (callback) => ipcRenderer.on('reminder-triggered', (_, id) => callback(id)),
  onQuickNote: (callback) => ipcRenderer.on('quick-note', () => callback()),

  // File dialogs
  saveFileDialog: (defaultName) => ipcRenderer.invoke('save-file-dialog', defaultName),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
});
