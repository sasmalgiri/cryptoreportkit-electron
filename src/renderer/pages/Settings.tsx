import { useState, useEffect } from 'react';
import {
  Key,
  Shield,
  Check,
  X,
  AlertCircle,
  Award,
} from 'lucide-react';
import {
  getApiKey,
  setApiKey,
  deleteApiKey,
  hasApiKey,
  getSettings,
  updateSettings,
  validateLicense,
  getLicenseStatus,
} from '../hooks/useElectron';
import type { AppSettings, LicenseStatus } from '../types';

export default function Settings() {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeyStored, setApiKeyStored] = useState(false);
  const [licenseInput, setLicenseInput] = useState('');
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      const [hasKey, settingsData, license] = await Promise.all([
        hasApiKey(),
        getSettings(),
        getLicenseStatus(),
      ]);
      setApiKeyStored(hasKey);
      setSettings(settingsData);
      setLicenseStatus(license);

      if (hasKey) {
        const key = await getApiKey();
        if (key) {
          setApiKeyInput(key.slice(0, 6) + '...' + key.slice(-4));
        }
      }
    }
    load();
  }, []);

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.includes('...')) {
      setSaving(true);
      try {
        await setApiKey(apiKeyInput.trim());
        setApiKeyStored(true);
        setMessage({ type: 'success', text: 'API key saved to OS keychain' });
        const masked = apiKeyInput.trim();
        setApiKeyInput(masked.slice(0, 6) + '...' + masked.slice(-4));
      } catch (err) {
        setMessage({ type: 'error', text: String(err) });
      }
      setSaving(false);
    }
  };

  const handleDeleteApiKey = async () => {
    await deleteApiKey();
    setApiKeyStored(false);
    setApiKeyInput('');
    setMessage({ type: 'success', text: 'API key removed from keychain' });
  };

  const handleValidateLicense = async () => {
    setSaving(true);
    try {
      const result = await validateLicense(licenseInput.trim());
      setMessage({
        type: result.valid ? 'success' : 'error',
        text: result.message,
      });
      if (result.valid) {
        setLicenseStatus({
          has_license: true,
          tier: result.tier,
          key_preview: licenseInput.trim().slice(0, 4) + '...' + licenseInput.trim().slice(-4),
        });
        setLicenseInput('');
      }
    } catch (err) {
      setMessage({ type: 'error', text: String(err) });
    }
    setSaving(false);
  };

  const handleUpdateSettings = async (updates: Partial<AppSettings>) => {
    await updateSettings(updates);
    if (settings) {
      setSettings({ ...settings, ...updates });
    }
    setMessage({ type: 'success', text: 'Settings saved' });
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 text-sm mt-1">
          Configure your desktop app preferences
        </p>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}
        >
          {message.type === 'success' ? (
            <Check className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          {message.text}
          <button
            onClick={() => setMessage(null)}
            className="ml-auto text-gray-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* API Key Section */}
      <section className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Key className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="font-semibold text-white">CoinGecko API Key</h2>
            <p className="text-xs text-gray-500">
              Stored securely in your OS keychain
            </p>
          </div>
          <Shield className="w-4 h-4 text-emerald-400 ml-auto" />
        </div>

        <div className="flex gap-2">
          <input
            type={apiKeyStored ? 'text' : 'password'}
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="CG-xxxxxxxxxxxxxxxxxxxxxxxx"
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50"
            onFocus={() => {
              if (apiKeyInput.includes('...')) setApiKeyInput('');
            }}
          />
          <button
            onClick={handleSaveApiKey}
            disabled={saving || !apiKeyInput || apiKeyInput.includes('...')}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-medium transition"
          >
            Save
          </button>
          {apiKeyStored && (
            <button
              onClick={handleDeleteApiKey}
              className="px-3 py-2 text-red-400 hover:bg-red-400/10 rounded-lg text-sm transition"
            >
              Remove
            </button>
          )}
        </div>

        <p className="text-xs text-gray-600 mt-3">
          Get a free key at{' '}
          <button type="button" onClick={() => window.electronAPI?.openExternal('https://www.coingecko.com/en/api')} className="text-emerald-400 hover:underline">coingecko.com/en/api</button>. Pro
          keys (CG-*) unlock higher rate limits.
        </p>
      </section>

      {/* License Section */}
      <section className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-500/10 rounded-lg">
            <Award className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="font-semibold text-white">License Key</h2>
            <p className="text-xs text-gray-500">
              {licenseStatus?.has_license
                ? `Pro license active (${licenseStatus.key_preview})`
                : 'Free tier - enter a license to unlock Pro features'}
            </p>
          </div>
          {licenseStatus?.has_license && (
            <span className="ml-auto px-2 py-0.5 bg-amber-500/10 text-amber-400 text-xs rounded-full font-medium">
              PRO
            </span>
          )}
        </div>

        {!licenseStatus?.has_license && (
          <div className="flex gap-2">
            <input
              type="text"
              value={licenseInput}
              onChange={(e) => setLicenseInput(e.target.value)}
              placeholder="CRK-XXXX-XXXX-XXXX"
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-amber-500/50"
            />
            <button
              onClick={handleValidateLicense}
              disabled={saving || !licenseInput.trim()}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-medium transition"
            >
              Activate
            </button>
          </div>
        )}
      </section>

      {/* Preferences */}
      <section className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-6">
        <h2 className="font-semibold text-white mb-4">Preferences</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white">Currency</div>
              <div className="text-xs text-gray-500">
                Display prices in your preferred currency
              </div>
            </div>
            <select
              value={settings?.currency ?? 'usd'}
              onChange={(e) => handleUpdateSettings({ currency: e.target.value })}
              className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
            >
              <option value="usd">USD ($)</option>
              <option value="eur">EUR (&euro;)</option>
              <option value="gbp">GBP (&pound;)</option>
              <option value="jpy">JPY (&yen;)</option>
              <option value="btc">BTC</option>
              <option value="eth">ETH</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white">Auto-refresh interval</div>
              <div className="text-xs text-gray-500">
                How often to refresh market data
              </div>
            </div>
            <select
              value={settings?.refresh_interval ?? 60}
              onChange={(e) =>
                handleUpdateSettings({ refresh_interval: Number(e.target.value) })
              }
              className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
            >
              <option value={30}>30 seconds</option>
              <option value={60}>1 minute</option>
              <option value={300}>5 minutes</option>
              <option value={600}>10 minutes</option>
            </select>
          </div>
        </div>
      </section>

      {/* Privacy Notice */}
      <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-emerald-300 font-medium mb-1">
              Your data stays on your device
            </p>
            <p className="text-xs text-gray-500 leading-relaxed">
              API keys are stored in your operating system's secure keychain
              (Windows Credential Manager / macOS Keychain / Linux Secret
              Service). Portfolio data lives in a local SQLite database. Market
              data is fetched directly from CoinGecko using your own API key.
              Nothing is sent to our servers except optional license validation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
