const { app, ipcMain } = require('electron');
const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

let db = null;

function getDbPath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'cryptoreportkit.db');
}

function initDatabase() {
  const dbPath = getDbPath();
  db = new Database(dbPath);

  // Enable WAL mode for better concurrent performance
  db.pragma('journal_mode = WAL');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS portfolio (
      id TEXT PRIMARY KEY,
      coin_id TEXT NOT NULL,
      symbol TEXT NOT NULL,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      buy_price REAL NOT NULL,
      buy_date TEXT,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS watchlist (
      coin_id TEXT PRIMARY KEY,
      symbol TEXT NOT NULL,
      name TEXT NOT NULL,
      added_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS price_alerts (
      id TEXT PRIMARY KEY,
      coin_id TEXT NOT NULL,
      symbol TEXT NOT NULL,
      name TEXT NOT NULL,
      target_price REAL NOT NULL,
      direction TEXT NOT NULL CHECK(direction IN ('above', 'below')),
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_portfolio_coin ON portfolio(coin_id);
    CREATE INDEX IF NOT EXISTS idx_alerts_active ON price_alerts(active, coin_id);
  `);
}

function registerDatabaseHandlers() {
  // Portfolio
  ipcMain.handle('db:addPortfolioEntry', (_event, entry) => {
    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO portfolio (id, coin_id, symbol, name, amount, buy_price, buy_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, entry.coin_id, entry.symbol, entry.name, entry.amount, entry.buy_price, entry.buy_date || null, entry.notes || '');
    return { id, ...entry };
  });

  ipcMain.handle('db:getPortfolio', () => {
    const stmt = db.prepare('SELECT * FROM portfolio ORDER BY created_at DESC');
    return stmt.all();
  });

  ipcMain.handle('db:updatePortfolioEntry', (_event, id, entry) => {
    const stmt = db.prepare(`
      UPDATE portfolio SET amount = ?, buy_price = ?, notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `);
    stmt.run(entry.amount, entry.buy_price, entry.notes || '', id);
    return { success: true };
  });

  ipcMain.handle('db:deletePortfolioEntry', (_event, id) => {
    const stmt = db.prepare('DELETE FROM portfolio WHERE id = ?');
    stmt.run(id);
    return { success: true };
  });

  ipcMain.handle('db:getPortfolioValue', async () => {
    const entries = db.prepare('SELECT * FROM portfolio').all();
    if (entries.length === 0) {
      return { entries: [], total_value: 0, total_cost: 0, total_pnl: 0, total_pnl_pct: 0 };
    }

    // Fetch current prices
    const coinIds = [...new Set(entries.map((e) => e.coin_id))].join(',');
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd`
      );
      const prices = await res.json();

      let totalValue = 0;
      let totalCost = 0;
      const enriched = entries.map((e) => {
        const currentPrice = prices[e.coin_id]?.usd ?? 0;
        const value = e.amount * currentPrice;
        const cost = e.amount * e.buy_price;
        const pnl = value - cost;
        const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
        totalValue += value;
        totalCost += cost;
        return { ...e, current_price: currentPrice, current_value: value, cost_basis: cost, pnl, pnl_pct: pnlPct };
      });

      return {
        entries: enriched,
        total_value: totalValue,
        total_cost: totalCost,
        total_pnl: totalValue - totalCost,
        total_pnl_pct: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
      };
    } catch {
      return { entries, total_value: 0, total_cost: 0, total_pnl: 0, total_pnl_pct: 0 };
    }
  });

  // Watchlist
  ipcMain.handle('db:addToWatchlist', (_event, coin) => {
    const stmt = db.prepare('INSERT OR REPLACE INTO watchlist (coin_id, symbol, name) VALUES (?, ?, ?)');
    stmt.run(coin.coin_id, coin.symbol, coin.name);
    return { success: true };
  });

  ipcMain.handle('db:removeFromWatchlist', (_event, coinId) => {
    const stmt = db.prepare('DELETE FROM watchlist WHERE coin_id = ?');
    stmt.run(coinId);
    return { success: true };
  });

  ipcMain.handle('db:getWatchlist', () => {
    return db.prepare('SELECT * FROM watchlist ORDER BY added_at DESC').all();
  });

  // Alerts
  ipcMain.handle('db:addPriceAlert', (_event, alert) => {
    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO price_alerts (id, coin_id, symbol, name, target_price, direction)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, alert.coin_id, alert.symbol, alert.name, alert.target_price, alert.direction);
    return { id, ...alert };
  });

  ipcMain.handle('db:getPriceAlerts', () => {
    return db.prepare('SELECT * FROM price_alerts ORDER BY created_at DESC').all();
  });

  ipcMain.handle('db:deletePriceAlert', (_event, id) => {
    db.prepare('DELETE FROM price_alerts WHERE id = ?').run(id);
    return { success: true };
  });

  ipcMain.handle('db:togglePriceAlert', (_event, id) => {
    db.prepare('UPDATE price_alerts SET active = CASE WHEN active = 1 THEN 0 ELSE 1 END WHERE id = ?').run(id);
    return { success: true };
  });

  // Settings
  ipcMain.handle('db:getSettings', () => {
    const rows = db.prepare('SELECT * FROM settings').all();
    const settings = {
      currency: 'usd',
      refresh_interval: '60',
      tray_coins: 'bitcoin,ethereum',
      theme: 'dark',
      notifications_enabled: 'true',
    };
    rows.forEach((row) => {
      settings[row.key] = row.value;
    });
    return settings;
  });

  ipcMain.handle('db:updateSettings', (_event, key, value) => {
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    stmt.run(key, typeof value === 'string' ? value : JSON.stringify(value));
    return { success: true };
  });
}

module.exports = { initDatabase, registerDatabaseHandlers };
