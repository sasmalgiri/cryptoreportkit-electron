import { useState, useEffect, useRef } from 'react';
import { Scale, X, Search, Download } from 'lucide-react';
import { searchCoins, getCoinMarketChart, getMarkets } from '../hooks/useElectron';
import type { CoinMarket } from '../types';
import { formatCompact, formatPercent, formatNumber, downloadCsv } from '../utils/export';

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#ec4899'];

interface SelectedCoin { id: string; name: string; symbol: string; }

export default function Compare() {
  const [selected, setSelected] = useState<SelectedCoin[]>([{ id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC' }, { id: 'ethereum', name: 'Ethereum', symbol: 'ETH' }]);
  const [markets, setMarkets] = useState<CoinMarket[]>([]);
  const [chartData, setChartData] = useState<Record<string, [number, number][]>>({});
  const [days, setDays] = useState(30);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ id: string; name: string; symbol: string; thumb: string | null }[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    (async () => {
      try { const m = await getMarkets('usd', 1, 250); setMarkets(m); } catch { /* */ }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (selected.length === 0) return;
    (async () => {
      const results = await Promise.allSettled(
        selected.map(c => getCoinMarketChart(c.id, 'usd', days).then(chart => ({ id: c.id, prices: chart.prices })))
      );
      const data: Record<string, [number, number][]> = {};
      for (const r of results) {
        if (r.status === 'fulfilled') data[r.value.id] = r.value.prices;
      }
      setChartData(data);
    })();
  }, [selected, days]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try { const r = await searchCoins(query); setResults(r.coins.slice(0, 6)); setShowSearch(true); } catch { setResults([]); }
    }, 300);
  }, [query]);

  const addCoin = (c: { id: string; name: string; symbol: string }) => {
    if (selected.length >= 5 || selected.find(s => s.id === c.id)) return;
    setSelected([...selected, c]);
    setQuery(''); setShowSearch(false);
  };

  const removeCoin = (id: string) => setSelected(selected.filter(s => s.id !== id));

  const coinData = selected.map(s => markets.find(m => m.id === s.id)).filter(Boolean) as CoinMarket[];

  // Normalize chart data for comparison (% change from start)
  const normalizedData: Record<string, { x: number; y: number }[]> = {};
  for (const [id, prices] of Object.entries(chartData)) {
    if (prices.length === 0) continue;
    const start = prices[0][1];
    normalizedData[id] = prices.map(([t, p]) => ({ x: t, y: ((p - start) / start) * 100 }));
  }

  // SVG chart
  const chartW = 600, chartH = 200;
  const allYs = Object.values(normalizedData).flat().map(d => d.y);
  const minY = Math.min(0, ...(allYs.length ? allYs : [0]));
  const maxY = Math.max(0, ...(allYs.length ? allYs : [0]));
  const yRange = maxY - minY || 1;
  const allXs = Object.values(normalizedData).flat().map(d => d.x);
  const minX = Math.min(...(allXs.length ? allXs : [0]));
  const maxX = Math.max(...(allXs.length ? allXs : [1]));
  const xRange = maxX - minX || 1;

  const exportCsv = () => {
    downloadCsv('coin-comparison.csv',
      ['Coin', 'Symbol', 'Price', 'Market Cap', '24h Change', '7d Change', 'Volume', 'ATH', 'ATH Distance'],
      coinData.map(c => [c.name, c.symbol.toUpperCase(), c.current_price, c.market_cap, c.price_change_percentage_24h, c.price_change_percentage_7d_in_currency, c.total_volume, c.ath, c.ath_change_percentage]));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Scale className="w-6 h-6 text-emerald-400" />
          <h1 className="text-2xl font-bold">Compare Coins</h1>
        </div>
        <button type="button" onClick={exportCsv} className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg text-sm text-gray-300 hover:text-white transition">
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      {/* Coin selector */}
      <div className="flex flex-wrap items-center gap-2">
        {selected.map((c, i) => (
          <span key={c.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium" style={{ backgroundColor: `${COLORS[i]}20`, color: COLORS[i], border: `1px solid ${COLORS[i]}40` }}>
            {c.symbol.toUpperCase()}
            <button type="button" onClick={() => removeCoin(c.id)} className="hover:opacity-70"><X className="w-3 h-3" /></button>
          </span>
        ))}
        {selected.length < 5 && (
          <div className="relative" ref={searchContainerRef}>
            <div className="flex items-center bg-gray-800 border border-gray-700 rounded-full px-3 py-1.5">
              <Search className="w-3.5 h-3.5 text-gray-500 mr-1.5" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Add coin..." className="bg-transparent text-sm focus:outline-none w-24" />
            </div>
            {showSearch && results.length > 0 && (
              <div className="absolute top-full mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
                {results.map(c => (
                  <button key={c.id} type="button" onClick={() => addCoin({ id: c.id, name: c.name, symbol: c.symbol })}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-700/50 text-left text-sm">
                    {c.thumb && <img src={c.thumb} className="w-4 h-4 rounded-full" alt="" />}
                    <span>{c.name}</span>
                    <span className="text-gray-500 ml-auto text-xs">{c.symbol.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm text-gray-400">Normalized Performance (% change)</h3>
          <div className="flex gap-1">
            {[{ d: 7, l: '7D' }, { d: 30, l: '30D' }, { d: 90, l: '90D' }].map(t => (
              <button key={t.d} type="button" onClick={() => setDays(t.d)}
                className={`px-3 py-1 rounded text-xs transition ${days === t.d ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-500 hover:text-white'}`}>{t.l}</button>
            ))}
          </div>
        </div>
        <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-52">
          {/* Zero line */}
          <line x1="0" y1={chartH - ((0 - minY) / yRange) * chartH} x2={chartW} y2={chartH - ((0 - minY) / yRange) * chartH} stroke="#374151" strokeWidth="0.5" strokeDasharray="4" />
          {/* Lines */}
          {selected.map((c, idx) => {
            const data = normalizedData[c.id];
            if (!data || data.length < 2) return null;
            const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${((d.x - minX) / xRange) * chartW} ${chartH - ((d.y - minY) / yRange) * chartH}`).join(' ');
            return <path key={c.id} d={path} fill="none" stroke={COLORS[idx]} strokeWidth="2" />;
          })}
        </svg>
        {/* Legend */}
        <div className="flex gap-4 mt-2">
          {selected.map((c, i) => (
            <div key={c.id} className="flex items-center gap-1.5 text-xs">
              <span className="w-3 h-1 rounded" style={{ backgroundColor: COLORS[i] }} />
              {c.symbol.toUpperCase()}
            </div>
          ))}
        </div>
      </div>

      {/* Comparison Table */}
      {!loading && coinData.length > 0 && (
        <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-700/50 text-gray-400">
              <th className="text-left px-4 py-3">Metric</th>
              {coinData.map((c, i) => <th key={c.id} className="text-right px-4 py-3" style={{ color: COLORS[i] }}>{c.symbol.toUpperCase()}</th>)}
            </tr></thead>
            <tbody>
              {[
                { label: 'Price', fn: (c: CoinMarket) => `$${formatNumber(c.current_price ?? 0)}` },
                { label: '24h Change', fn: (c: CoinMarket) => formatPercent(c.price_change_percentage_24h) },
                { label: '7d Change', fn: (c: CoinMarket) => formatPercent(c.price_change_percentage_7d_in_currency) },
                { label: 'Market Cap', fn: (c: CoinMarket) => formatCompact(c.market_cap) },
                { label: 'Volume', fn: (c: CoinMarket) => formatCompact(c.total_volume) },
                { label: 'Circulating', fn: (c: CoinMarket) => c.circulating_supply ? `${(c.circulating_supply / 1e6).toFixed(1)}M` : '-' },
                { label: 'ATH', fn: (c: CoinMarket) => `$${formatNumber(c.ath ?? 0)}` },
                { label: 'From ATH', fn: (c: CoinMarket) => formatPercent(c.ath_change_percentage) },
              ].map(row => (
                <tr key={row.label} className="border-b border-gray-800/50">
                  <td className="px-4 py-2 text-gray-400">{row.label}</td>
                  {coinData.map(c => <td key={c.id} className="px-4 py-2 text-right">{row.fn(c)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
