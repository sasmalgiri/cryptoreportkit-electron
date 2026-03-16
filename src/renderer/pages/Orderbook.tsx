import { useState, useEffect, useCallback } from 'react';
import { BookOpen, RefreshCw } from 'lucide-react';
import { getMarkets } from '../hooks/useElectron';
import type { CoinMarket } from '../types';
import { formatNumber } from '../utils/export';

interface Level { price: number; amount: number; total: number; }

function generateOrderbook(midPrice: number, volume: number): { bids: Level[]; asks: Level[] } {
  const spread = midPrice * 0.001;
  const levels = 20;
  const bids: Level[] = [];
  const asks: Level[] = [];
  let bidTotal = 0, askTotal = 0;
  const seed = Math.floor(midPrice * 100) % 1000;

  for (let i = 0; i < levels; i++) {
    const bPrice = midPrice - spread * (i + 1) - (midPrice * 0.0002 * i);
    const aPrice = midPrice + spread * (i + 1) + (midPrice * 0.0002 * i);
    const baseAmt = (volume / midPrice / 500) * (1 + ((seed + i * 37) % 100) / 50);
    const bAmt = baseAmt * (1 + i * 0.1);
    const aAmt = baseAmt * (1 + i * 0.08);
    bidTotal += bAmt;
    askTotal += aAmt;
    bids.push({ price: bPrice, amount: bAmt, total: bidTotal });
    asks.push({ price: aPrice, amount: aAmt, total: askTotal });
  }
  return { bids, asks };
}

export default function Orderbook() {
  const [coins, setCoins] = useState<CoinMarket[]>([]);
  const [selected, setSelected] = useState('bitcoin');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    (async () => {
      try { const m = await getMarkets('usd', 1, 20); setCoins(m); } catch { /* */ }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(id);
  }, [autoRefresh]);

  const coin = coins.find(c => c.id === selected);
  const midPrice = coin?.current_price ?? 0;
  const volume = coin?.total_volume ?? 0;
  const change = coin?.price_change_percentage_24h ?? 0;

  const refresh = useCallback(() => setTick(t => t + 1), []);

  // Use tick in seed for slight variation
  const { bids, asks } = midPrice > 0 ? (() => {
    const ob = generateOrderbook(midPrice * (1 + (tick % 10) * 0.00001), volume);
    return ob;
  })() : { bids: [], asks: [] };

  const maxTotal = Math.max(bids[bids.length - 1]?.total ?? 1, asks[asks.length - 1]?.total ?? 1);
  const spreadAbs = asks[0] && bids[0] ? asks[0].price - bids[0].price : 0;
  const spreadPct = midPrice > 0 ? (spreadAbs / midPrice) * 100 : 0;

  // Depth chart
  const chartW = 400, chartH = 120;
  const bidPoints = bids.map((b, i) => `${chartW / 2 - (i + 1) * (chartW / 2 / 20)},${chartH - (b.total / maxTotal) * chartH}`).join(' ');
  const askPoints = asks.map((a, i) => `${chartW / 2 + (i + 1) * (chartW / 2 / 20)},${chartH - (a.total / maxTotal) * chartH}`).join(' ');

  if (loading) return <div className="text-center py-12 text-gray-500">Loading market data...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-emerald-400" />
          <h1 className="text-2xl font-bold">Orderbook</h1>
        </div>
        <div className="flex items-center gap-3">
          <select value={selected} onChange={e => setSelected(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none">
            {coins.map(c => <option key={c.id} value={c.id}>{c.name} ({c.symbol.toUpperCase()})</option>)}
          </select>
          <button type="button" onClick={refresh} className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded-lg text-sm transition ${autoRefresh ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-400'}`}>
            {autoRefresh ? 'Auto: ON' : 'Auto: OFF'}
          </button>
        </div>
      </div>

      {/* Price + Spread */}
      <div className="flex items-center gap-6">
        <div>
          <span className="text-3xl font-bold">${formatNumber(midPrice)}</span>
          <span className={`ml-3 text-sm ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {change >= 0 ? '+' : ''}{change.toFixed(2)}%
          </span>
        </div>
        <div className="text-sm text-gray-400">
          Spread: ${formatNumber(spreadAbs, 4)} ({spreadPct.toFixed(4)}%)
        </div>
      </div>

      {/* Depth Chart */}
      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
        <h3 className="text-sm text-gray-400 mb-2">Depth Chart</h3>
        <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-32">
          <line x1={chartW / 2} y1="0" x2={chartW / 2} y2={chartH} stroke="#374151" strokeWidth="1" strokeDasharray="4" />
          {bids.length > 0 && (
            <polygon points={`${chartW / 2},${chartH} ${bidPoints} ${chartW / 2 - 20 * (chartW / 2 / 20)},${chartH}`}
              fill="#10b981" fillOpacity="0.2" stroke="#10b981" strokeWidth="1.5" />
          )}
          {asks.length > 0 && (
            <polygon points={`${chartW / 2},${chartH} ${askPoints} ${chartW / 2 + 20 * (chartW / 2 / 20)},${chartH}`}
              fill="#ef4444" fillOpacity="0.2" stroke="#ef4444" strokeWidth="1.5" />
          )}
          <text x={chartW / 4} y="12" fill="#10b981" fontSize="10" textAnchor="middle">Bids</text>
          <text x={chartW * 3 / 4} y="12" fill="#ef4444" fontSize="10" textAnchor="middle">Asks</text>
        </svg>
      </div>

      {/* Orderbook Table */}
      <div className="grid grid-cols-2 gap-4">
        {/* Bids */}
        <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-700/50 text-emerald-400 text-sm font-medium">Bids</div>
          <table className="w-full text-xs">
            <thead><tr className="text-gray-500">
              <th className="text-left px-3 py-1.5">Price</th>
              <th className="text-right px-3 py-1.5">Amount</th>
              <th className="text-right px-3 py-1.5">Total</th>
            </tr></thead>
            <tbody>
              {bids.map((b, i) => (
                <tr key={i} className="relative">
                  <td className="px-3 py-1 text-emerald-400">${formatNumber(b.price)}</td>
                  <td className="px-3 py-1 text-right">{b.amount.toFixed(4)}</td>
                  <td className="px-3 py-1 text-right">{b.total.toFixed(4)}</td>
                  <td className="absolute inset-0 pointer-events-none">
                    <div className="h-full bg-emerald-500/5" style={{ width: `${(b.total / maxTotal) * 100}%` }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Asks */}
        <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-700/50 text-red-400 text-sm font-medium">Asks</div>
          <table className="w-full text-xs">
            <thead><tr className="text-gray-500">
              <th className="text-left px-3 py-1.5">Price</th>
              <th className="text-right px-3 py-1.5">Amount</th>
              <th className="text-right px-3 py-1.5">Total</th>
            </tr></thead>
            <tbody>
              {asks.map((a, i) => (
                <tr key={i} className="relative">
                  <td className="px-3 py-1 text-red-400">${formatNumber(a.price)}</td>
                  <td className="px-3 py-1 text-right">{a.amount.toFixed(4)}</td>
                  <td className="px-3 py-1 text-right">{a.total.toFixed(4)}</td>
                  <td className="absolute inset-0 pointer-events-none">
                    <div className="h-full bg-red-500/5 ml-auto" style={{ width: `${(a.total / maxTotal) * 100}%` }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-600 text-center">Simulated orderbook based on market data. For real-time depth, connect to an exchange API.</p>
    </div>
  );
}
