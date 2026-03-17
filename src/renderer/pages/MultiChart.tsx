import { useState, useEffect } from 'react';
import { Grid3x3 } from 'lucide-react';
import { getMarkets, getCoinMarketChart } from '../hooks/useElectron';
import type { CoinMarket } from '../types';
import { formatNumber, formatPercent } from '../utils/export';

const LAYOUTS = [
  { label: '2x1', cols: 2, rows: 1, count: 2 },
  { label: '2x2', cols: 2, rows: 2, count: 4 },
  { label: '3x2', cols: 3, rows: 2, count: 6 },
];

const DEFAULTS = ['bitcoin', 'ethereum', 'solana', 'binancecoin', 'ripple', 'cardano'];

export default function MultiChart() {
  const [layout, setLayout] = useState(LAYOUTS[1]);
  const [coins, setCoins] = useState<CoinMarket[]>([]);
  const [selections, setSelections] = useState<string[]>(DEFAULTS.slice(0, 4));
  const [chartData, setChartData] = useState<Record<string, [number, number][]>>({});
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { const m = await getMarkets('usd', 1, 50); setCoins(m); } catch { /* */ }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const active = selections.slice(0, layout.count);
    (async () => {
      const data: Record<string, [number, number][]> = {};
      for (const id of active) {
        if (!id) continue;
        try {
          const chart = await getCoinMarketChart(id, 'usd', days);
          data[id] = chart.prices;
        } catch { /* */ }
      }
      setChartData(data);
    })();
  }, [selections, days, layout.count]);

  const updateSelection = (idx: number, coinId: string) => {
    const next = [...selections];
    next[idx] = coinId;
    setSelections(next);
  };

  const changeLayout = (l: typeof LAYOUTS[number]) => {
    setLayout(l);
    const next = [...selections];
    while (next.length < l.count) {
      const unused = DEFAULTS.find(d => !next.includes(d));
      next.push(unused || DEFAULTS[0]);
    }
    setSelections(next);
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Grid3x3 className="w-6 h-6 text-emerald-400" />
          <h1 className="text-2xl font-bold">Multi-Chart</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {[{ d: 7, l: '7D' }, { d: 30, l: '30D' }, { d: 90, l: '90D' }].map(t => (
              <button key={t.d} type="button" onClick={() => setDays(t.d)}
                className={`px-3 py-1.5 rounded text-xs transition ${days === t.d ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-500 hover:text-white'}`}>{t.l}</button>
            ))}
          </div>
          <div className="flex gap-1 bg-gray-800 rounded-lg p-0.5">
            {LAYOUTS.map(l => (
              <button key={l.label} type="button" onClick={() => changeLayout(l)}
                className={`px-3 py-1.5 rounded text-xs transition ${layout.label === l.label ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-500 hover:text-white'}`}>{l.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${layout.cols}, 1fr)` }}>
        {Array.from({ length: layout.count }).map((_, idx) => {
          const coinId = selections[idx] || DEFAULTS[0];
          const coin = coins.find(c => c.id === coinId);
          const prices = chartData[coinId] || [];
          const change = coin?.price_change_percentage_24h ?? 0;

          return (
            <div key={idx} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
              <div className="flex items-center justify-between mb-3">
                <select value={coinId} onChange={e => updateSelection(idx, e.target.value)}
                  className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-emerald-500/50 max-w-[140px]">
                  {coins.map(c => <option key={c.id} value={c.id}>{c.symbol.toUpperCase()}</option>)}
                </select>
                <span className={`text-xs font-medium ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatPercent(change)}
                </span>
              </div>

              {/* Mini Chart */}
              <MiniChart prices={prices} positive={change >= 0} />

              <div className="mt-2 flex justify-between items-baseline">
                <span className="text-lg font-bold">${formatNumber(coin?.current_price ?? 0)}</span>
                <span className="text-xs text-gray-500">{coin?.name}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MiniChart({ prices, positive }: { prices: [number, number][]; positive: boolean }) {
  if (prices.length < 2) return <div className="h-24 flex items-center justify-center text-gray-600 text-xs">Loading chart...</div>;

  const vals = prices.map(p => p[1]);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const w = 300, h = 80;

  const path = vals.map((v, i) => `${(i / (vals.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  const fillPath = `M 0,${h} L ${path} L ${w},${h} Z`;
  const color = positive ? '#10b981' : '#ef4444';

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24">
      <defs>
        <linearGradient id={`grad-${positive}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#grad-${positive})`} />
      <polyline points={path} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}
