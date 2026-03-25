import { useState } from 'react';
import {
  ArrowDownUp,
  Download,
  Loader2,
  Shield,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { downloadCsv, formatNumber } from '../utils/export';

type Exchange = 'binance' | 'coinbase' | 'kraken';

interface Transaction {
  id: string;
  date: string;
  pair: string;
  side: 'buy' | 'sell';
  price: number;
  quantity: number;
  total: number;
  fee: number;
  feeCurrency: string;
}

const EXCHANGES: { id: Exchange; name: string; color: string; desc: string }[] = [
  { id: 'binance', name: 'Binance', color: '#F0B90B', desc: 'Largest exchange by volume' },
  { id: 'coinbase', name: 'Coinbase', color: '#0052FF', desc: 'US-regulated exchange' },
  { id: 'kraken', name: 'Kraken', color: '#7B61FF', desc: 'Security-focused exchange' },
];

export default function ExchangeImport() {
  const [selectedExchange, setSelectedExchange] = useState<Exchange | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState(false);

  const handleImport = async () => {
    if (!selectedExchange || !apiKey || !apiSecret) return;
    setLoading(true);
    setError(null);

    try {
      // Desktop app calls the CRK API server
      const res = await fetch(
        `https://cryptoreportkit.com/api/v1/exchange/${selectedExchange}/transactions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey, apiSecret }),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Import failed: ${res.status}`);
      }

      const data = await res.json();
      setTransactions(data.transactions || []);
      setImported(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    const headers = ['Date', 'Pair', 'Side', 'Price', 'Quantity', 'Total', 'Fee', 'Fee Currency'];
    const rows = transactions.map((t) => [
      t.date, t.pair, t.side, t.price, t.quantity, t.total, t.fee, t.feeCurrency,
    ] as (string | number)[]);
    downloadCsv(`${selectedExchange}-transactions.csv`, headers, rows);
  };

  const totalBuys = transactions.filter((t) => t.side === 'buy').reduce((s, t) => s + t.total, 0);
  const totalSells = transactions.filter((t) => t.side === 'sell').reduce((s, t) => s + t.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ArrowDownUp className="w-6 h-6 text-emerald-400" />
        <div>
          <h1 className="text-2xl font-bold">Exchange Import</h1>
          <p className="text-gray-400 text-sm mt-0.5">Auto-import trade history from major exchanges</p>
        </div>
      </div>

      {/* Security */}
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-emerald-400 font-medium text-sm">Read-Only API Keys Only</p>
          <p className="text-gray-400 text-xs mt-1">
            Keys are sent to the CryptoReportKit server to fetch transactions, then discarded. Never enable withdrawal permissions.
            For maximum security, use API keys with read-only trade history permissions.
          </p>
        </div>
      </div>

      {/* Exchange Select */}
      <div className="grid grid-cols-3 gap-3">
        {EXCHANGES.map((ex) => (
          <button
            key={ex.id}
            type="button"
            onClick={() => setSelectedExchange(ex.id)}
            className={`p-4 rounded-xl border text-left transition ${
              selectedExchange === ex.id
                ? 'border-emerald-500/50 bg-emerald-500/10'
                : 'border-gray-700/50 bg-gray-800/40 hover:border-gray-600'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: ex.color + '20', color: ex.color }}>
                {ex.name[0]}
              </div>
              <span className="font-medium text-sm">{ex.name}</span>
              {selectedExchange === ex.id && <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto" />}
            </div>
            <p className="text-[11px] text-gray-500">{ex.desc}</p>
          </button>
        ))}
      </div>

      {/* API Keys */}
      {selectedExchange && (
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-5 space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">API Key</label>
            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste your read-only API key"
              className="w-full bg-gray-900/60 border border-gray-700/50 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">API Secret</label>
            <input type="password" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)}
              placeholder="Paste your API secret"
              className="w-full bg-gray-900/60 border border-gray-700/50 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50" />
          </div>
          <button type="button" onClick={handleImport} disabled={!apiKey || !apiSecret || loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-lg text-sm font-medium transition">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</> : <><RefreshCw className="w-4 h-4" /> Import</>}
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Results */}
      {imported && transactions.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
              <div className="text-xs text-gray-400">Transactions</div>
              <div className="text-lg font-bold mt-1">{transactions.length}</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
              <div className="text-xs text-gray-400">Total Bought</div>
              <div className="text-lg font-bold mt-1 text-green-400">${formatNumber(totalBuys)}</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
              <div className="text-xs text-gray-400">Total Sold</div>
              <div className="text-lg font-bold mt-1 text-red-400">${formatNumber(totalSells)}</div>
            </div>
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={exportCsv} className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>

          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-800">
                  <tr className="text-left text-gray-400 text-xs">
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Pair</th>
                    <th className="px-4 py-2">Side</th>
                    <th className="px-4 py-2 text-right">Price</th>
                    <th className="px-4 py-2 text-right">Qty</th>
                    <th className="px-4 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} className="border-t border-gray-700/30 hover:bg-gray-700/20">
                      <td className="px-4 py-2 text-gray-300">{new Date(t.date).toLocaleDateString()}</td>
                      <td className="px-4 py-2 font-medium">{t.pair}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${t.side === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {t.side.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">${t.price.toLocaleString(undefined, { maximumFractionDigits: 6 })}</td>
                      <td className="px-4 py-2 text-right text-gray-400">{t.quantity.toFixed(6)}</td>
                      <td className="px-4 py-2 text-right">${formatNumber(t.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {imported && transactions.length === 0 && (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-12 text-center">
          <ArrowDownUp className="w-10 h-10 mx-auto mb-3 text-gray-600" />
          <p className="text-gray-500">No transactions found</p>
        </div>
      )}
    </div>
  );
}
