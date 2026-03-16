import { useState, useEffect, useRef } from 'react';
import { Bell, Plus, Trash2, ArrowUp, ArrowDown, Search, ToggleLeft, ToggleRight } from 'lucide-react';
import { getPriceAlerts, addPriceAlert, deletePriceAlert, togglePriceAlert, searchCoins } from '../hooks/useElectron';
import type { PriceAlert } from '../types';
import { formatNumber } from '../utils/export';

export default function Alerts() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [coinId, setCoinId] = useState('');
  const [coinLabel, setCoinLabel] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [direction, setDirection] = useState<'above' | 'below'>('above');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ id: string; name: string; symbol: string; thumb: string | null }[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const load = async () => {
    try {
      const data = await getPriceAlerts();
      setAlerts(data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await searchCoins(query);
        setResults(r.coins.slice(0, 6));
        setShowSearch(true);
      } catch { setResults([]); }
    }, 300);
  }, [query]);

  const handleCreate = async () => {
    if (!coinId || !targetPrice) return;
    try {
      await addPriceAlert(coinId, parseFloat(targetPrice), direction);
      setCoinId(''); setCoinLabel(''); setTargetPrice(''); setQuery('');
      load();
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: string) => {
    try { await deletePriceAlert(id); load(); } catch { /* ignore */ }
  };

  const handleToggle = async (id: string) => {
    try { await togglePriceAlert(id); load(); } catch { /* ignore */ }
  };

  const active = alerts.filter(a => a.active);
  const inactive = alerts.filter(a => !a.active);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="w-6 h-6 text-emerald-400" />
        <h1 className="text-2xl font-bold">Price Alerts</h1>
      </div>

      {/* Create Alert */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
        <h2 className="text-lg font-semibold mb-4">Create Alert</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={coinLabel || query}
              onChange={e => { setQuery(e.target.value); setCoinId(''); setCoinLabel(''); }}
              placeholder="Search coin..."
              className="w-full bg-gray-900/50 border border-gray-700 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50"
            />
            {showSearch && results.length > 0 && (
              <div className="absolute top-full mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
                {results.map(c => (
                  <button key={c.id} type="button" onClick={() => { setCoinId(c.id); setCoinLabel(`${c.name} (${c.symbol.toUpperCase()})`); setShowSearch(false); setQuery(''); }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-700/50 text-left text-sm">
                    {c.thumb && <img src={c.thumb} className="w-4 h-4 rounded-full" alt="" />}
                    <span>{c.name}</span>
                    <span className="text-gray-500 ml-auto">{c.symbol.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <input type="number" value={targetPrice} onChange={e => setTargetPrice(e.target.value)}
            placeholder="Target price ($)" className="bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50" />
          <div className="flex gap-2">
            <button type="button" onClick={() => setDirection('above')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition ${direction === 'above' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-gray-900/50 text-gray-400 border border-gray-700'}`}>
              <ArrowUp className="w-4 h-4" /> Above
            </button>
            <button type="button" onClick={() => setDirection('below')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition ${direction === 'below' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-gray-900/50 text-gray-400 border border-gray-700'}`}>
              <ArrowDown className="w-4 h-4" /> Below
            </button>
          </div>
          <button type="button" onClick={handleCreate} disabled={!coinId || !targetPrice}
            className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-lg py-2.5 text-sm font-medium transition">
            <Plus className="w-4 h-4" /> Create Alert
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading alerts...</div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">No price alerts set</p>
          <p className="text-gray-500 text-sm mt-1">Create your first alert above to get notified</p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Active ({active.length})</h3>
              <div className="space-y-2">
                {active.map(a => (
                  <AlertCard key={a.id} alert={a} onToggle={handleToggle} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}
          {inactive.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Inactive ({inactive.length})</h3>
              <div className="space-y-2 opacity-60">
                {inactive.map(a => (
                  <AlertCard key={a.id} alert={a} onToggle={handleToggle} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AlertCard({ alert, onToggle, onDelete }: { alert: PriceAlert; onToggle: (id: string) => void; onDelete: (id: string) => void }) {
  const isAbove = alert.direction === 'above';
  return (
    <div className="flex items-center gap-4 bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
      <div className={`p-2 rounded-lg ${isAbove ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
        {isAbove ? <ArrowUp className="w-5 h-5" /> : <ArrowDown className="w-5 h-5" />}
      </div>
      <div className="flex-1">
        <div className="font-medium">{alert.coin_id}</div>
        <div className="text-sm text-gray-400">
          Alert when price goes {alert.direction} ${formatNumber(alert.target_price)}
        </div>
      </div>
      <button type="button" onClick={() => onToggle(alert.id)} className="text-gray-400 hover:text-white transition">
        {alert.active ? <ToggleRight className="w-6 h-6 text-emerald-400" /> : <ToggleLeft className="w-6 h-6" />}
      </button>
      <button type="button" onClick={() => onDelete(alert.id)} className="text-gray-500 hover:text-red-400 transition">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
