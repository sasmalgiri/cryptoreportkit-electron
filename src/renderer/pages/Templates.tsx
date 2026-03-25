import { useState, useEffect } from 'react';
import {
  Globe, Briefcase, ThermometerSun, TrendingUp, TrendingDown,
  BarChart3, PieChart, Target, Crown, ChevronUp, Loader2,
} from 'lucide-react';
import { getMarkets, getCoinMarketChart, getFearGreed } from '../hooks/useElectron';
import type { CoinMarket, FearGreedEntry } from '../types';
import { formatCompact, formatPercent, formatNumber } from '../utils/export';

interface TemplateCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const TEMPLATES: TemplateCard[] = [
  { id: 'market-overview', title: 'Market Overview', description: 'Top 10 coins table with sparklines', icon: <Globe className="w-6 h-6" /> },
  { id: 'portfolio-tracker', title: 'Portfolio Tracker', description: 'Quick portfolio summary with P&L', icon: <Briefcase className="w-6 h-6" /> },
  { id: 'fear-greed', title: 'Fear & Greed History', description: '30-day fear/greed chart', icon: <ThermometerSun className="w-6 h-6" /> },
  { id: 'gainers-losers', title: 'Top Gainers/Losers', description: 'Top 5 gainers and losers side by side', icon: <TrendingUp className="w-6 h-6" /> },
  { id: 'btc-vs-eth', title: 'BTC vs ETH', description: 'Bitcoin vs Ethereum comparison chart', icon: <BarChart3 className="w-6 h-6" /> },
  { id: 'volume-analysis', title: 'Volume Analysis', description: 'Top coins by 24h volume', icon: <BarChart3 className="w-6 h-6" /> },
  { id: 'supply-analysis', title: 'Supply Analysis', description: 'Circulating vs total supply comparison', icon: <PieChart className="w-6 h-6" /> },
  { id: 'ath-distance', title: 'ATH Distance', description: 'How far coins are from their ATH', icon: <Target className="w-6 h-6" /> },
  { id: 'dominance', title: 'Dominance Chart', description: 'BTC dominance gauge + market share pie', icon: <Crown className="w-6 h-6" /> },
];

// Mini sparkline SVG
function Sparkline({ data, color = '#10b981', width = 100, height = 28 }: { data: number[]; color?: string; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`);
  return <svg viewBox={`0 0 ${width} ${height}`} className="inline-block" style={{ width, height }}><polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={1.5} /></svg>;
}

// Template content components
function MarketOverviewContent() {
  const [markets, setMarkets] = useState<CoinMarket[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { getMarkets('usd', 1, 10).then(setMarkets).catch(() => {}).finally(() => setLoading(false)); }, []);
  if (loading) return <LoadingSpinner />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-gray-400 text-xs text-left"><th className="p-2">#</th><th className="p-2">Coin</th><th className="p-2 text-right">Price</th><th className="p-2 text-right">24h</th><th className="p-2 text-right">Market Cap</th><th className="p-2">7D</th></tr></thead>
        <tbody>
          {markets.map(c => (
            <tr key={c.id} className="border-t border-gray-700/30">
              <td className="p-2 text-gray-500">{c.market_cap_rank}</td>
              <td className="p-2 flex items-center gap-2">{c.image && <img src={c.image} alt="" className="w-5 h-5 rounded-full" />}{c.name} <span className="text-gray-500">{c.symbol.toUpperCase()}</span></td>
              <td className="p-2 text-right">${formatNumber(c.current_price)}</td>
              <td className={`p-2 text-right ${(c.price_change_percentage_24h ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatPercent(c.price_change_percentage_24h)}</td>
              <td className="p-2 text-right">{formatCompact(c.market_cap)}</td>
              <td className="p-2">{c.sparkline_in_7d?.price ? <Sparkline data={c.sparkline_in_7d.price} color={(c.price_change_percentage_24h ?? 0) >= 0 ? '#10b981' : '#ef4444'} /> : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PortfolioTrackerContent() {
  const [markets, setMarkets] = useState<CoinMarket[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { getMarkets('usd', 1, 5).then(setMarkets).catch(() => {}).finally(() => setLoading(false)); }, []);
  if (loading) return <LoadingSpinner />;
  // Simulate a portfolio with top 5 coins
  const simEntries = markets.map(c => ({ name: c.name, symbol: c.symbol, invested: 1000, current: 1000 * (1 + (c.price_change_percentage_24h ?? 0) / 100) }));
  const totalInv = simEntries.reduce((s, e) => s + e.invested, 0);
  const totalCur = simEntries.reduce((s, e) => s + e.current, 0);
  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-gray-700/30 rounded-lg p-3"><div className="text-xs text-gray-400">Invested</div><div className="text-lg font-semibold">${formatNumber(totalInv)}</div></div>
        <div className="bg-gray-700/30 rounded-lg p-3"><div className="text-xs text-gray-400">Current</div><div className="text-lg font-semibold">${formatNumber(totalCur)}</div></div>
        <div className="bg-gray-700/30 rounded-lg p-3"><div className="text-xs text-gray-400">P&L</div><div className={`text-lg font-semibold ${totalCur >= totalInv ? 'text-green-400' : 'text-red-400'}`}>{formatPercent(((totalCur - totalInv) / totalInv) * 100)}</div></div>
      </div>
      {simEntries.map(e => {
        const pnl = e.current - e.invested;
        return (
          <div key={e.symbol} className="flex justify-between py-1.5 border-t border-gray-700/30 text-sm">
            <span>{e.name} ({e.symbol.toUpperCase()})</span>
            <span className={pnl >= 0 ? 'text-green-400' : 'text-red-400'}>{pnl >= 0 ? '+' : ''}{formatNumber(pnl)}</span>
          </div>
        );
      })}
    </div>
  );
}

function FearGreedContent() {
  const [data, setData] = useState<FearGreedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { getFearGreed().then(r => setData(r.data.slice(0, 30))).catch(() => {}).finally(() => setLoading(false)); }, []);
  if (loading) return <LoadingSpinner />;
  if (data.length < 2) return <div className="text-gray-500 text-sm">No data available</div>;
  const values = data.map(d => parseInt(d.value)).reverse();
  const W = 400, H = 120;
  const max = 100, min = 0;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * W},${H - ((v - min) / (max - min)) * H}`);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full mb-3">
        <rect x={0} y={0} width={W} height={H * 0.3} fill="#ef444422" /><rect x={0} y={H * 0.3} width={W} height={H * 0.4} fill="#eab30822" /><rect x={0} y={H * 0.7} width={W} height={H * 0.3} fill="#10b98122" />
        <polyline points={pts.join(' ')} fill="none" stroke="#10b981" strokeWidth={2} />
      </svg>
      <div className="flex justify-between text-xs text-gray-400">
        <span>30 days ago</span><span>Today: <strong className={parseInt(data[0].value) > 50 ? 'text-green-400' : 'text-red-400'}>{data[0].value} - {data[0].value_classification}</strong></span>
      </div>
    </div>
  );
}

function GainersLosersContent() {
  const [markets, setMarkets] = useState<CoinMarket[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { getMarkets('usd', 1, 100).then(setMarkets).catch(() => {}).finally(() => setLoading(false)); }, []);
  if (loading) return <LoadingSpinner />;
  const sorted = [...markets].filter(c => c.price_change_percentage_24h !== null).sort((a, b) => (b.price_change_percentage_24h ?? 0) - (a.price_change_percentage_24h ?? 0));
  const gainers = sorted.slice(0, 5);
  const losers = sorted.slice(-5).reverse();
  const renderList = (list: CoinMarket[], isGainer: boolean) => list.map(c => (
    <div key={c.id} className="flex justify-between items-center py-1.5 border-t border-gray-700/30 text-sm">
      <div className="flex items-center gap-2">{c.image && <img src={c.image} alt="" className="w-4 h-4 rounded-full" />}{c.symbol.toUpperCase()}</div>
      <span className={isGainer ? 'text-green-400' : 'text-red-400'}>{formatPercent(c.price_change_percentage_24h)}</span>
    </div>
  ));
  return (
    <div className="grid grid-cols-2 gap-4">
      <div><div className="text-xs text-green-400 font-medium mb-2 flex items-center gap-1"><TrendingUp className="w-3 h-3" />Top Gainers</div>{renderList(gainers, true)}</div>
      <div><div className="text-xs text-red-400 font-medium mb-2 flex items-center gap-1"><TrendingDown className="w-3 h-3" />Top Losers</div>{renderList(losers, false)}</div>
    </div>
  );
}

function BtcVsEthContent() {
  const [btc, setBtc] = useState<[number, number][]>([]);
  const [eth, setEth] = useState<[number, number][]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.allSettled([getCoinMarketChart('bitcoin', 'usd', 30), getCoinMarketChart('ethereum', 'usd', 30)])
      .then(([b, e]) => {
        if (b.status === 'fulfilled') setBtc(b.value.prices);
        if (e.status === 'fulfilled') setEth(e.value.prices);
      })
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <LoadingSpinner />;
  // Normalize to percentage change from start
  const norm = (arr: [number, number][]) => { const base = arr[0]?.[1] || 1; return arr.map(p => ((p[1] - base) / base) * 100); };
  const btcN = norm(btc), ethN = norm(eth);
  if (btcN.length < 2 || ethN.length < 2) return <div className="text-gray-500 text-sm">Insufficient data</div>;
  const allV = [...btcN, ...ethN];
  const min = Math.min(...allV), max = Math.max(...allV), range = max - min || 1;
  const W = 400, H = 140;
  const line = (d: number[]) => d.map((v, i) => `${(i / (d.length - 1)) * W},${H - ((v - min) / range) * H}`).join(' ');
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full mb-2">
        <line x1={0} y1={H - ((0 - min) / range) * H} x2={W} y2={H - ((0 - min) / range) * H} stroke="#374151" strokeDasharray="3,3" />
        <polyline points={line(btcN)} fill="none" stroke="#f59e0b" strokeWidth={2} />
        <polyline points={line(ethN)} fill="none" stroke="#3b82f6" strokeWidth={2} />
      </svg>
      <div className="flex gap-4 text-xs"><span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-500 inline-block" />BTC {formatPercent(btcN[btcN.length - 1])}</span><span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500 inline-block" />ETH {formatPercent(ethN[ethN.length - 1])}</span></div>
    </div>
  );
}

function VolumeAnalysisContent() {
  const [markets, setMarkets] = useState<CoinMarket[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { getMarkets('usd', 1, 20).then(setMarkets).catch(() => {}).finally(() => setLoading(false)); }, []);
  if (loading) return <LoadingSpinner />;
  const sorted = [...markets].sort((a, b) => (b.total_volume ?? 0) - (a.total_volume ?? 0)).slice(0, 8);
  const maxVol = sorted[0]?.total_volume ?? 1;
  return (
    <div className="space-y-2">
      {sorted.map(c => (
        <div key={c.id} className="flex items-center gap-3 text-sm">
          <span className="w-12 text-gray-400 text-xs">{c.symbol.toUpperCase()}</span>
          <div className="flex-1 bg-gray-700/30 rounded-full h-5 overflow-hidden">
            <div className="h-full bg-emerald-500/60 rounded-full flex items-center px-2" style={{ width: `${((c.total_volume ?? 0) / maxVol) * 100}%` }}>
              <span className="text-xs text-white truncate">{formatCompact(c.total_volume)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SupplyAnalysisContent() {
  const [markets, setMarkets] = useState<CoinMarket[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { getMarkets('usd', 1, 10).then(setMarkets).catch(() => {}).finally(() => setLoading(false)); }, []);
  if (loading) return <LoadingSpinner />;
  const withSupply = markets.filter(c => c.circulating_supply && c.total_supply && c.total_supply > 0);
  return (
    <div className="space-y-3">
      {withSupply.slice(0, 6).map(c => {
        const pct = ((c.circulating_supply ?? 0) / (c.total_supply ?? 1)) * 100;
        return (
          <div key={c.id}>
            <div className="flex justify-between text-xs mb-1"><span className="text-gray-300">{c.name}</span><span className="text-gray-400">{pct.toFixed(1)}% circulating</span></div>
            <div className="w-full bg-gray-700/30 rounded-full h-3 overflow-hidden">
              <div className="h-full bg-emerald-500/70 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AthDistanceContent() {
  const [markets, setMarkets] = useState<CoinMarket[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { getMarkets('usd', 1, 15).then(setMarkets).catch(() => {}).finally(() => setLoading(false)); }, []);
  if (loading) return <LoadingSpinner />;
  const sorted = [...markets].filter(c => c.ath_change_percentage !== null).sort((a, b) => (b.ath_change_percentage ?? 0) - (a.ath_change_percentage ?? 0));
  return (
    <div className="space-y-2">
      {sorted.slice(0, 8).map(c => {
        const dist = Math.abs(c.ath_change_percentage ?? 0);
        return (
          <div key={c.id} className="flex items-center gap-3 text-sm">
            <span className="w-14 text-gray-400 text-xs">{c.symbol.toUpperCase()}</span>
            <div className="flex-1 bg-gray-700/30 rounded-full h-4 overflow-hidden">
              <div className="h-full bg-amber-500/60 rounded-full" style={{ width: `${100 - Math.min(dist, 100)}%` }} />
            </div>
            <span className="text-xs text-red-400 w-16 text-right">{formatPercent(c.ath_change_percentage)}</span>
          </div>
        );
      })}
    </div>
  );
}

function DominanceContent() {
  const [markets, setMarkets] = useState<CoinMarket[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { getMarkets('usd', 1, 10).then(setMarkets).catch(() => {}).finally(() => setLoading(false)); }, []);
  if (loading) return <LoadingSpinner />;
  const totalMcap = markets.reduce((s, c) => s + (c.market_cap ?? 0), 0);
  const shares = markets.map(c => ({ name: c.symbol.toUpperCase(), pct: totalMcap ? ((c.market_cap ?? 0) / totalMcap) * 100 : 0 }));
  const btcPct = shares.find(s => s.name === 'BTC')?.pct ?? 0;
  // Gauge
  const R = 60, cx = 80, cy = 80;
  const angle = (btcPct / 100) * 180;
  const rad = (a: number) => ((a - 180) * Math.PI) / 180;
  const arcX = (a: number) => cx + R * Math.cos(rad(a));
  const arcY = (a: number) => cy + R * Math.sin(rad(a));
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6b7280', '#14b8a6', '#f97316', '#84cc16'];
  const pieR = 55;
  // Pre-compute pie slices to avoid mutable cumAngle in render
  const pieSlices = (() => {
    let cum = 0;
    return shares.slice(0, 8).map((s, i) => {
      const sliceAngle = (s.pct / 100) * 360;
      const startRad = (cum * Math.PI) / 180;
      const endRad = ((cum + sliceAngle) * Math.PI) / 180;
      const x1 = 90 + pieR * Math.cos(startRad), y1 = 70 + pieR * Math.sin(startRad);
      const x2 = 90 + pieR * Math.cos(endRad), y2 = 70 + pieR * Math.sin(endRad);
      const large = sliceAngle > 180 ? 1 : 0;
      const path = `M90,70 L${x1},${y1} A${pieR},${pieR} 0 ${large},1 ${x2},${y2} Z`;
      cum += sliceAngle;
      return { path, color: COLORS[i % COLORS.length] };
    });
  })();
  return (
    <div className="flex gap-4 items-start">
      <div>
        <svg viewBox="0 0 160 100" className="w-40">
          <path d={`M${arcX(0)},${arcY(0)} A${R},${R} 0 0,1 ${arcX(180)},${arcY(180)}`} fill="none" stroke="#374151" strokeWidth={12} strokeLinecap="round" />
          <path d={`M${arcX(0)},${arcY(0)} A${R},${R} 0 ${angle > 90 ? 1 : 0},1 ${arcX(angle)},${arcY(angle)}`} fill="none" stroke="#10b981" strokeWidth={12} strokeLinecap="round" />
          <text x={cx} y={cy - 5} textAnchor="middle" className="fill-white text-lg font-bold" fontSize={18}>{btcPct.toFixed(1)}%</text>
          <text x={cx} y={cy + 12} textAnchor="middle" className="fill-gray-400" fontSize={9}>BTC Dominance</text>
        </svg>
      </div>
      <div className="flex-1">
        <svg viewBox="0 0 180 140" className="w-full">
          {pieSlices.map((slice, i) => (
            <path key={i} d={slice.path} fill={slice.color} opacity={0.8} />
          ))}
        </svg>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
          {shares.slice(0, 8).map((s, i) => (
            <span key={i} className="text-xs flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: COLORS[i % COLORS.length] }} />{s.name} {s.pct.toFixed(1)}%</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>;
}

const TEMPLATE_COMPONENTS: Record<string, React.FC> = {
  'market-overview': MarketOverviewContent,
  'portfolio-tracker': PortfolioTrackerContent,
  'fear-greed': FearGreedContent,
  'gainers-losers': GainersLosersContent,
  'btc-vs-eth': BtcVsEthContent,
  'volume-analysis': VolumeAnalysisContent,
  'supply-analysis': SupplyAnalysisContent,
  'ath-distance': AthDistanceContent,
  'dominance': DominanceContent,
};

export default function Templates() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Experiment Lab</h1>
        <p className="text-gray-400 text-sm mt-1">Pre-built analysis templates -- click Launch to explore</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TEMPLATES.map(t => {
          const isOpen = expanded === t.id;
          const Content = TEMPLATE_COMPONENTS[t.id];
          return (
            <div key={t.id} className={`bg-gray-800/60 border rounded-xl transition-all ${isOpen ? 'border-emerald-500/50 col-span-1 md:col-span-2 lg:col-span-3' : 'border-gray-700/50 hover:border-gray-600/50'}`}>
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">{t.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-medium text-white text-sm">{t.title}</h3>
                    <p className="text-gray-500 text-xs mt-0.5">{t.description}</p>
                  </div>
                  <button
                    onClick={() => setExpanded(isOpen ? null : t.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${isOpen ? 'bg-gray-700 text-gray-300' : 'bg-emerald-500 hover:bg-emerald-400 text-white'}`}
                  >
                    {isOpen ? <><ChevronUp className="w-3 h-3" />Close</> : <>Launch</>}
                  </button>
                </div>
              </div>
              {isOpen && Content && (
                <div className="border-t border-gray-700/50 p-4">
                  <Content />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
