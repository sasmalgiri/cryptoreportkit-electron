const { ipcMain } = require('electron');
const { invalidateApiKeyCache } = require('./coingecko');

const SERVICE = 'cryptoreportkit';
const ACCOUNT_API = 'coingecko-api-key';
const ACCOUNT_LICENSE = 'license-key';

let keytar = null;

function getKeytar() {
  if (!keytar) {
    try {
      keytar = require('keytar');
    } catch (err) {
      console.error('keytar not available, falling back to electron-store:', err.message);
      // Fallback to electron-store if keytar fails (common on some Windows setups)
      const Store = require('electron-store');
      const store = new Store({ name: 'crk-keys', encryptionKey: 'crk-local-enc-key' });
      keytar = {
        setPassword: async (service, account, password) => store.set(`${service}.${account}`, password),
        getPassword: async (service, account) => store.get(`${service}.${account}`) || null,
        deletePassword: async (service, account) => { store.delete(`${service}.${account}`); return true; },
      };
    }
  }
  return keytar;
}

function registerKeychainHandlers() {
  ipcMain.handle('keychain:setApiKey', async (_event, key) => {
    await getKeytar().setPassword(SERVICE, ACCOUNT_API, key);
    invalidateApiKeyCache();
    return { success: true };
  });

  ipcMain.handle('keychain:getApiKey', async () => {
    const key = await getKeytar().getPassword(SERVICE, ACCOUNT_API);
    return key || null;
  });

  ipcMain.handle('keychain:deleteApiKey', async () => {
    await getKeytar().deletePassword(SERVICE, ACCOUNT_API);
    invalidateApiKeyCache();
    return { success: true };
  });

  ipcMain.handle('keychain:hasApiKey', async () => {
    const key = await getKeytar().getPassword(SERVICE, ACCOUNT_API);
    return !!key;
  });

  // License key helpers (used by license.js)
  ipcMain.handle('keychain:setLicenseKey', async (_event, key) => {
    await getKeytar().setPassword(SERVICE, ACCOUNT_LICENSE, key);
    return { success: true };
  });

  ipcMain.handle('keychain:getLicenseKey', async () => {
    return await getKeytar().getPassword(SERVICE, ACCOUNT_LICENSE);
  });
}

// Export for use by license.js
async function getLicenseKeyFromKeychain() {
  return await getKeytar().getPassword(SERVICE, ACCOUNT_LICENSE);
}

async function setLicenseKeyInKeychain(key) {
  return await getKeytar().setPassword(SERVICE, ACCOUNT_LICENSE, key);
}

module.exports = { registerKeychainHandlers, getLicenseKeyFromKeychain, setLicenseKeyInKeychain };
