const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell, dialog, Notification } = require('electron');
const path = require('path');
const { initDatabase, registerDatabaseHandlers, getDb } = require('./database');
const { registerCoinGeckoHandlers } = require('./coingecko');
const { registerKeychainHandlers } = require('./keychain');
const { registerLicenseHandlers } = require('./license');

let mainWindow = null;
let tray = null;
let isQuitting = false;

const isDev = !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    transparent: false,
    backgroundColor: '#0b0f19',
    icon: path.join(__dirname, '../../build/icon.ico'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:1420');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  // Window control IPC
  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('window:close', () => mainWindow?.hide());
  ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false);

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window:maximized-changed', true);
  });
  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window:maximized-changed', false);
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '../../build/icon.ico');
  let icon;
  try {
    icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) {
      icon = nativeImage.createEmpty();
    }
  } catch {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip('CryptoReportKit');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open CryptoReportKit',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    { type: 'separator' },
    {
      label: 'Dashboard',
      click: () => {
        mainWindow?.show();
        mainWindow?.webContents.send('navigate', '/');
      },
    },
    {
      label: 'Portfolio',
      click: () => {
        mainWindow?.show();
        mainWindow?.webContents.send('navigate', '/portfolio');
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  // Update tray tooltip with prices every 60s
  updateTrayPrices();
  setInterval(updateTrayPrices, 60000);
}

async function updateTrayPrices() {
  try {
    // Read tray_coins from settings (default: bitcoin,ethereum)
    let coinIds = 'bitcoin,ethereum';
    const db = getDb();
    if (db) {
      const row = db.prepare("SELECT value FROM settings WHERE key = 'tray_coins'").get();
      if (row?.value) coinIds = row.value;
    }

    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd&include_24hr_change=true`
    );
    const data = await res.json();
    const parts = [];
    for (const id of coinIds.split(',')) {
      const coin = data[id.trim()];
      if (!coin) continue;
      const label = id.trim().charAt(0).toUpperCase() + id.trim().slice(1);
      const price = Math.round(coin.usd).toLocaleString();
      const change = coin.usd_24h_change?.toFixed(1) ?? '0';
      parts.push(`${label}: $${price} (${change}%)`);
    }
    if (parts.length) tray?.setToolTip(parts.join(' | '));
  } catch {
    // Silently fail
  }
}

// Background alert checking — every 2 minutes
async function checkPriceAlerts() {
  try {
    const db = getDb();
    if (!db) return;
    const alerts = db.prepare('SELECT * FROM price_alerts WHERE active = 1').all();
    if (alerts.length === 0) return;

    const coinIds = [...new Set(alerts.map((a) => a.coin_id))].join(',');
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd`
    );
    const prices = await res.json();

    for (const alert of alerts) {
      const currentPrice = prices[alert.coin_id]?.usd;
      if (currentPrice == null) continue;

      const triggered =
        (alert.direction === 'above' && currentPrice >= alert.target_price) ||
        (alert.direction === 'below' && currentPrice <= alert.target_price);

      if (triggered) {
        const displayName = alert.name || alert.coin_id.replace(/-/g, ' ');
        const dir = alert.direction === 'above' ? 'above' : 'below';
        new Notification({
          title: `Price Alert: ${displayName}`,
          body: `${displayName} is now $${currentPrice.toLocaleString()} — ${dir} your target of $${alert.target_price.toLocaleString()}`,
          icon: path.join(__dirname, '../../build/icon.ico'),
        }).show();

        // Deactivate triggered alert
        db.prepare('UPDATE price_alerts SET active = 0 WHERE id = ?').run(alert.id);

        // Notify renderer to refresh
        mainWindow?.webContents.send('alert:triggered', alert.id);
      }
    }
  } catch {
    // Silently fail — will retry next cycle
  }
}

// Single instance lock
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(async () => {
  // Initialize database
  initDatabase();

  // Register IPC handlers
  registerDatabaseHandlers();
  registerCoinGeckoHandlers();
  registerKeychainHandlers();
  registerLicenseHandlers();

  // Shell open handler
  ipcMain.handle('shell:openExternal', (_event, url) => {
    return shell.openExternal(url);
  });

  createWindow();
  createTray();

  // Start background alert checking (every 2 minutes)
  checkPriceAlerts();
  setInterval(checkPriceAlerts, 120000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else {
    mainWindow?.show();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});
