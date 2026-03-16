import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { getFearGreed, getMarkets } from '../hooks/useElectron';
import type { FearGreedEntry, CoinMarket } from '../types';
import { formatPercent } from '../utils/export';

export default function Sentiment() {
  const [fg, setFg] = useState<FearGreedEntry[]>([]);
  const [markets, setMarkets] = useState<CoinMarket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [fgRes, mkts] = await Promise.allSettled([getFearGreed(), getMarkets('usd', 1, 50)]);
      if (fgRes.status === 'fulfilled') setFg(fgRes.value.data || []);
      if (mkts.status === 'fulfilled') setMarkets(mkts.value);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading sentiment data...</div>;

  const current = fg[0];
  const val = current ? parseInt(current.value) : 50;
  const gainers = markets.filter(m => (m.price_change_percentage_24h ?? 0) > 0).sort((a, b) => (b.price_change_percentage_24h ?? 0) - (a.price_change_percentage_24h ?? 0));
  const losers = markets.filter(m => (m.price_change_percentage_24h ?? 0) < 0).sort((a, b) => (a.price_change_percentage_24h ?? 0) - (b.price_change_percentage_24h ?? 0));

  const getColor = (v: number) => {
    if (v <= 25) return '#ef4444';
    if (v <= 45) return '#f97316';
    if (v <= 55) return '#6b7280';
    if (v <= 75) return '#84cc16';
    return '#22c55e';
  };

  // Gauge angle: 0=left (fear), 180=right (greed)
  const angle = (val / 100) * 180;
  const needleX = 100 + 70 * Math.cos(((180 - angle) * Math.PI) / 180);
  const needleY = 100 - 70 * Math.sin(((180 - angle) * Math.PI) / 180);

  // BTC dominance from markets
  const totalMcap = markets.reduce((s, m) => s + (m.market_cap ?? 0), 0);
  const btcMcap = markets.find(m => m.id === 'bitcoin')?.market_cap ?? 0;
  const ethMcap = markets.find(m => m.id === 'ethereum')?.market_cap ?? 0;
  const btcDom = totalMcap > 0 ? (btcMcap / totalMcap) * 100 : 0;
  const ethDom = totalMcap > 0 ? (ethMcap / totalMcap) * 100 : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Market Sentiment</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fear & Greed Gauge */}
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
          <h2 className="text-lg font-semibold mb-4">Fear & Greed Index</h2>
          <div className="flex flex-col items-center">
            <svg viewBox="0 0 200 120" className="w-64 h-40">
              {/* Gauge arc segments */}
              <path d="M 15 100 A 85 85 0 0 1 57.5 30" fill="none" stroke="#ef4444" strokeWidth="12" strokeLinecap="round" />
              <path d="M 57.5 30 A 85 85 0 0 1 100 15" fill="none" stroke="#f97316" strokeWidth="12" />
              <path d="M 100 15 A 85 85 0 0 1 142.5 30" fill="none" stroke="#6b7280" strokeWidth="12" />
              <path d="M 142.5 30 A 85 85 0 0 1 170 65" fill="none" stroke="#84cc16" strokeWidth="12" />
              <path d="M 170 65 A 85 85 0 0 1 185 100" fill="none" stroke="#22c55e" strokeWidth="12" strokeLinecap="round" />
              {/* Needle */}
              <line x1="100" y1="100" x2={needleX} y2={needleY} stroke={getColor(val)} strokeWidth="3" strokeLinecap="round" />
              <circle cx="100" cy="100" r="5" fill={getColor(val)} />
              {/* Value */}
              <text x="100" y="90" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold">{val}</text>
              <text x="100" y="108" textAnchor="middle" fill={getColor(val)} fontSize="11">{current?.value_classification ?? 'N/A'}</text>
            </svg>

            {/* 7-day trend */}
            {fg.length >= 7 && (() => {
              const recent = parseInt(fg[0]?.value ?? '50');
              const weekAgo = parseInt(fg[6]?.value ?? '50');
              const improving = recent > weekAgo;
              return (
                <div className={`flex items-center gap-1 mt-2 text-sm ${improving ? 'text-emerald-400' : 'text-red-400'}`}>
                  {improving ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  7-day trend: {improving ? 'Improving' : 'Declining'} ({weekAgo} → {recent})
                </div>
              );
            })()}
          </div>

          {/* 30-day history */}
          <div className="mt-6">
            <h3 className="text-sm text-gray-400 mb-2">30-Day History</h3>
            <svg viewBox="0 0 400 80" className="w-full h-20">
              {fg.length > 1 && (() => {
                const pts = [...fg].reverse();
                const xStep = 400 / (pts.length - 1);
                const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * xStep} ${80 - (parseInt(p.value) / 100) * 80}`).join(' ');
                return (
                  <>
                    <rect x="0" y="0" width="400" height="20" fill="#22c55e" opacity="0.05" />
                    <rect x="0" y="20" width="400" height="20" fill="#84cc16" opacity="0.05" />
                    <rect x="0" y="40" width="400" height="20" fill="#f97316" opacity="0.05" />
                    <rect x="0" y="60" width="400" height="20" fill="#ef4444" opacity="0.05" />
                    <line x1="0" y1="40" x2="400" y2="40" stroke="#374151" strokeWidth="0.5" strokeDasharray="4" />
                    <polyline points={path} fill="none" stroke="#10b981" strokeWidth="2" />
                  </>
                );
              })()}
            </svg>
          </div>
        </div>

        {/* Market Sentiment */}
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
          <h2 className="text-lg font-semibold mb-4">Market Mood</h2>
          {/* Gainers vs Losers bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-emerald-400">{gainers.length} Gainers</span>
              <span className="text-red-400">{losers.length} Losers</span>
            </div>
            <div className="flex h-3 rounded-full overflow-hidden">
              <div className="bg-emerald-500" style={{ width: `${(gainers.length / markets.length) * 100}%` }} />
              <div className="bg-red-500" style={{ width: `${(losers.length / markets.length) * 100}%` }} />
            </div>
          </div>

          {/* Top 5 Gainers */}
          <h3 className="text-sm text-emerald-400 font-medium mb-2">Top 5 Gainers</h3>
          <div className="space-y-1.5 mb-4">
            {gainers.slice(0, 5).map(c => (
              <div key={c.id} className="flex items-center gap-2 text-sm">
                {c.image && <img src={c.image} className="w-4 h-4 rounded-full" alt="" />}
                <span className="text-gray-300 flex-1">{c.name}</span>
                <span className="text-emerald-400 font-medium">{formatPercent(c.price_change_percentage_24h)}</span>
              </div>
            ))}
          </div>

          {/* Top 5 Losers */}
          <h3 className="text-sm text-red-400 font-medium mb-2">Top 5 Losers</h3>
          <div className="space-y-1.5 mb-4">
            {losers.slice(0, 5).map(c => (
              <div key={c.id} className="flex items-center gap-2 text-sm">
                {c.image && <img src={c.image} className="w-4 h-4 rounded-full" alt="" />}
                <span className="text-gray-300 flex-1">{c.name}</span>
                <span className="text-red-400 font-medium">{formatPercent(c.price_change_percentage_24h)}</span>
              </div>
            ))}
          </div>

          {/* Dominance */}
          <h3 className="text-sm text-gray-400 font-medium mb-2">Market Dominance</h3>
          <div className="flex items-center gap-4">
            <svg viewBox="0 0 100 100" className="w-20 h-20">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#374151" strokeWidth="10" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="#f59e0b" strokeWidth="10"
                strokeDasharray={`${btcDom * 2.51} 251`} strokeDashoffset="0" transform="rotate(-90 50 50)" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="#6366f1" strokeWidth="10"
                strokeDasharray={`${ethDom * 2.51} 251`} strokeDashoffset={`${-btcDom * 2.51}`} transform="rotate(-90 50 50)" />
            </svg>
            <div className="text-sm space-y-1">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500" /> BTC {btcDom.toFixed(1)}%</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-indigo-500" /> ETH {ethDom.toFixed(1)}%</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-gray-600" /> Others {(100 - btcDom - ethDom).toFixed(1)}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
