const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  onMaximizedChanged: (callback) => {
    ipcRenderer.on('window:maximized-changed', (_event, value) => callback(value));
  },

  // Navigation from tray
  onNavigate: (callback) => {
    ipcRenderer.on('navigate', (_event, route) => callback(route));
  },

  // CoinGecko
  getMarkets: (params) => ipcRenderer.invoke('coingecko:getMarkets', params),
  getCoinDetail: (id) => ipcRenderer.invoke('coingecko:getCoinDetail', id),
  getOhlc: (id, days) => ipcRenderer.invoke('coingecko:getOhlc', id, days),
  getGlobalData: () => ipcRenderer.invoke('coingecko:getGlobalData'),
  searchCoins: (query) => ipcRenderer.invoke('coingecko:searchCoins', query),
  getTrending: () => ipcRenderer.invoke('coingecko:getTrending'),
  getFearGreed: () => ipcRenderer.invoke('coingecko:getFearGreed'),
  getCoinMarketChart: (id, days) => ipcRenderer.invoke('coingecko:getCoinMarketChart', id, days),
  getSimplePrice: (ids, currencies) => ipcRenderer.invoke('coingecko:getSimplePrice', ids, currencies),

  // Portfolio
  addPortfolioEntry: (entry) => ipcRenderer.invoke('db:addPortfolioEntry', entry),
  getPortfolio: () => ipcRenderer.invoke('db:getPortfolio'),
  updatePortfolioEntry: (id, entry) => ipcRenderer.invoke('db:updatePortfolioEntry', id, entry),
  deletePortfolioEntry: (id) => ipcRenderer.invoke('db:deletePortfolioEntry', id),
  getPortfolioValue: () => ipcRenderer.invoke('db:getPortfolioValue'),

  // Watchlist
  addToWatchlist: (coin) => ipcRenderer.invoke('db:addToWatchlist', coin),
  removeFromWatchlist: (coinId) => ipcRenderer.invoke('db:removeFromWatchlist', coinId),
  getWatchlist: () => ipcRenderer.invoke('db:getWatchlist'),

  // Alerts
  addPriceAlert: (alert) => ipcRenderer.invoke('db:addPriceAlert', alert),
  getPriceAlerts: () => ipcRenderer.invoke('db:getPriceAlerts'),
  deletePriceAlert: (id) => ipcRenderer.invoke('db:deletePriceAlert', id),
  togglePriceAlert: (id) => ipcRenderer.invoke('db:togglePriceAlert', id),

  // Settings
  getSettings: () => ipcRenderer.invoke('db:getSettings'),
  updateSettings: (key, value) => ipcRenderer.invoke('db:updateSettings', key, value),

  // Keychain
  setApiKey: (key) => ipcRenderer.invoke('keychain:setApiKey', key),
  getApiKey: () => ipcRenderer.invoke('keychain:getApiKey'),
  deleteApiKey: () => ipcRenderer.invoke('keychain:deleteApiKey'),
  hasApiKey: () => ipcRenderer.invoke('keychain:hasApiKey'),

  // License
  validateLicense: (key) => ipcRenderer.invoke('license:validate', key),
  getLicenseStatus: () => ipcRenderer.invoke('license:status'),

  // Shell
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
});
