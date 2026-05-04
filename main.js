const { app, BrowserWindow, ipcMain, Notification, Tray, Menu, nativeImage, dialog } = require('electron');
const path = require('path');
const Store = require('electron-store');

const store = new Store({
  defaults: {
    activeTab: 'editor',
    notes: [],
    activeNoteId: null,
    kanban: {
      todo: [],
      doing: [],
      done: []
    },
    reminders: [],
    settings: {
      theme: 'dark',
      opacity: 1.0,
      alwaysOnTop: false,
      ghostMode: true,
      autoStart: false
    },
    windowBounds: { x: undefined, y: undefined, width: 1000, height: 700 }
  }
});

let mainWindow;
let tray;
let reminderTimers = [];

function createWindow() {
  const bounds = store.get('windowBounds');
  const settings = store.get('settings');

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: 600,
    minHeight: 450,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    icon: path.join(__dirname, 'src', 'assets', 'icons', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  // Apply stored settings
  mainWindow.setAlwaysOnTop(settings.alwaysOnTop || false);
  mainWindow.setOpacity(settings.opacity || 1.0);

  // Ghost Mode — invisible during screen sharing
  mainWindow.setContentProtection(settings.ghostMode !== false);

  // Save window position/size on move/resize
  mainWindow.on('resize', () => saveWindowBounds());
  mainWindow.on('move', () => saveWindowBounds());

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open DevTools in dev mode
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

function saveWindowBounds() {
  if (mainWindow) {
    const bounds = mainWindow.getBounds();
    store.set('windowBounds', bounds);
  }
}

// ─── System Tray ──────────────────────────────────────────
function createTray() {
  const iconPath = path.join(__dirname, 'src', 'assets', 'icons', 'icon.ico');

  // Create a simple tray icon (16x16 colored square as fallback)
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
    if (trayIcon.isEmpty()) {
      trayIcon = nativeImage.createEmpty();
    }
  } catch (e) {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon.isEmpty() ? createDefaultIcon() : trayIcon.resize({ width: 16, height: 16 }));

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Abrir DevPad', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { label: '📝 Nota Rápida', click: () => {
      mainWindow?.show();
      mainWindow?.focus();
      mainWindow?.webContents.send('quick-note');
    }},
    { type: 'separator' },
    { label: 'Sempre no Topo', type: 'checkbox', checked: store.get('settings.alwaysOnTop'), click: (item) => {
      store.set('settings.alwaysOnTop', item.checked);
      mainWindow?.setAlwaysOnTop(item.checked);
      mainWindow?.webContents.send('settings-updated', store.get('settings'));
    }},
    { type: 'separator' },
    { label: 'Sair', click: () => app.quit() }
  ]);

  tray.setToolTip('DevPad');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus(); });
}

function createDefaultIcon() {
  return nativeImage.createFromBuffer(
    Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAKklEQVQ4T2P8z8BQz0BAwMjAwFDPQCRgYGCoZyASMDIw1DMQCRhGXQAAhqAJEafSqWQAAAAASUVORK5CYII=', 'base64')
  );
}

// ─── IPC Handlers ──────────────────────────────────────────

// Store operations
ipcMain.handle('store-get', (_, key) => store.get(key));
ipcMain.handle('store-set', (_, key, value) => { store.set(key, value); });
ipcMain.handle('store-get-all', () => store.store);

// Window controls
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on('window-close', () => mainWindow?.close());

// Opacity
ipcMain.on('set-opacity', (_, value) => {
  mainWindow?.setOpacity(value);
  store.set('settings.opacity', value);
});

// Always on Top
ipcMain.on('set-always-on-top', (_, value) => {
  mainWindow?.setAlwaysOnTop(value);
  store.set('settings.alwaysOnTop', value);
});

// Ghost Mode (Content Protection)
ipcMain.on('set-ghost-mode', (_, value) => {
  mainWindow?.setContentProtection(value);
  store.set('settings.ghostMode', value);
});

// Auto-start with system
ipcMain.on('set-auto-start', (_, value) => {
  app.setLoginItemSettings({ openAtLogin: value });
  store.set('settings.autoStart', value);
});

// Reminders / Notifications
ipcMain.on('show-notification', (_, { title, body }) => {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: title || 'DevPad',
      body: body || '',
      icon: path.join(__dirname, 'src', 'assets', 'icons', 'icon.png')
    });
    notification.show();
  }
});

ipcMain.on('schedule-reminder', (_, reminder) => {
  scheduleReminder(reminder);
});

ipcMain.on('cancel-reminder', (_, id) => {
  reminderTimers = reminderTimers.filter(t => {
    if (t.id === id) {
      clearTimeout(t.timer);
      return false;
    }
    return true;
  });
});

function scheduleReminder(reminder) {
  const now = Date.now();
  const target = new Date(reminder.datetime).getTime();
  const delay = target - now;

  if (delay > 0) {
    const timer = setTimeout(() => {
      if (Notification.isSupported()) {
        const notification = new Notification({
          title: '🔔 DevPad — Lembrete',
          body: reminder.title,
          icon: path.join(__dirname, 'src', 'assets', 'icons', 'icon.png')
        });
        notification.show();
        notification.on('click', () => mainWindow?.show());
      }
      mainWindow?.webContents.send('reminder-triggered', reminder.id);
    }, delay);

    reminderTimers.push({ id: reminder.id, timer });
  }
}

// File dialogs
ipcMain.handle('save-file-dialog', async (_, defaultName) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName || 'nota.md',
    filters: [
      { name: 'Markdown', extensions: ['md'] },
      { name: 'Text', extensions: ['txt'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return result;
});

// Write file to disk
const fs = require('fs');
ipcMain.handle('write-file', async (_, filePath, content) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Open file dialog (import)
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Text Files', extensions: ['md', 'txt', 'text'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (result.canceled) return { canceled: true, files: [] };
  const files = result.filePaths.map(fp => ({
    path: fp,
    name: path.basename(fp, path.extname(fp)),
    content: fs.readFileSync(fp, 'utf-8')
  }));
  return { canceled: false, files };
});

// ─── App Lifecycle ─────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  createTray();

  // Restore scheduled reminders
  const reminders = store.get('reminders') || [];
  reminders.forEach(r => {
    if (!r.completed && r.datetime) {
      scheduleReminder(r);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
