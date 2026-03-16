const { ipcMain } = require('electron');
const { getLicenseKeyFromKeychain, setLicenseKeyInKeychain } = require('./keychain');

function registerLicenseHandlers() {
  ipcMain.handle('license:validate', async (_event, key) => {
    if (!key || !key.startsWith('CRK-') || key.length < 12) {
      return { valid: false, tier: 'free', message: 'Invalid license key format' };
    }

    // Store in keychain
    await setLicenseKeyInKeychain(key);

    // TODO: In production, validate against server
    // const res = await fetch('https://api.cryptoreportkit.com/api/license/validate', {
    //   method: 'POST', headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ key })
    // });

    return { valid: true, tier: 'pro', message: 'License activated successfully' };
  });

  ipcMain.handle('license:status', async () => {
    const key = await getLicenseKeyFromKeychain();
    if (!key) {
      return { has_license: false, tier: 'free', key_preview: null };
    }
    const preview = key.substring(0, 8) + '...' + key.substring(key.length - 4);
    return { has_license: true, tier: 'pro', key_preview: preview };
  });
}

module.exports = { registerLicenseHandlers };
