import { useState, useCallback, useRef } from 'react';
import { Play, Download, Search, TrendingUp, TrendingDown, BarChart3, Loader2 } from 'lucide-react';
import { getCoinMarketChart, searchCoins } from '../hooks/useElectron';
import { sma, rsi, dailyReturns, maxDrawdown, sharpeRatio } from '../utils/indicators';
import { downloadCsv, formatNumber, formatPercent } from '../utils/export';

const STRATEGIES = [
  { id: 'buy-hold', label: 'Buy & Hold' },
  { id: 'sma-crossover', label: 'SMA Crossover (50)' },
  { id: 'rsi', label: 'RSI (30/70)' },
  { id: 'dca', label: 'DCA (Weekly)' },
];
const RANGES = [
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: '180D', days: 180 },
  { label: '1Y', days: 365 },
];

interface Trade { date: string; action: 'Buy' | 'Sell'; price: number; amount: number; portfolioValue: number; index: number }
interface BacktestResult {
  equityCurve: { date: string; value: number; index: number }[];
  buyHoldCurve: { date: string; value: number }[];
  trades: Trade[];
  finalValue: number;
  totalReturn: number;
  maxDd: number;
  sharpe: number;
  numTrades: number;
}

function runBacktest(prices: [number, number][], strategy: string, investment: number): BacktestResult | null {
  if (prices.length === 0) return null;
  const closes = prices.map(p => p[1]);
  if (closes[0] === 0) return null;
  const dates = prices.map(p => new Date(p[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }));

  // Buy & Hold baseline
  const bhInitialAmount = investment / closes[0];
  const buyHoldCurve = closes.map((c, i) => ({ date: dates[i], value: bhInitialAmount * c }));

  const trades: Trade[] = [];
  const equityCurve: { date: string; value: number; index: number }[] = [];

  if (strategy === 'buy-hold') {
    const amount = investment / closes[0];
    trades.push({ date: dates[0], action: 'Buy', price: closes[0], amount, portfolioValue: investment, index: 0 });
    closes.forEach((c, i) => equityCurve.push({ date: dates[i], value: amount * c, index: i }));
  } else if (strategy === 'sma-crossover') {
    const sma50 = sma(closes, 50);
    let cash = investment;
    let holding = 0;
    closes.forEach((c, i) => {
      const s = sma50[i];
      if (s !== null && holding === 0 && c > s) {
        holding = cash / c;
        trades.push({ date: dates[i], action: 'Buy', price: c, amount: holding, portfolioValue: holding * c, index: i });
        cash = 0;
      } else if (s !== null && holding > 0 && c < s) {
        cash = holding * c;
        trades.push({ date: dates[i], action: 'Sell', price: c, amount: holding, portfolioValue: cash, index: i });
        holding = 0;
      }
      equityCurve.push({ date: dates[i], value: holding > 0 ? holding * c : cash, index: i });
    });
  } else if (strategy === 'rsi') {
    const rsiVals = rsi(closes, 14);
    let cash = investment;
    let holding = 0;
    closes.forEach((c, i) => {
      const r = rsiVals[i];
      if (r !== null && holding === 0 && r < 30) {
        holding = cash / c;
        trades.push({ date: dates[i], action: 'Buy', price: c, amount: holding, portfolioValue: holding * c, index: i });
        cash = 0;
      } else if (r !== null && holding > 0 && r > 70) {
        cash = holding * c;
        trades.push({ date: dates[i], action: 'Sell', price: c, amount: holding, portfolioValue: cash, index: i });
        holding = 0;
      }
      equityCurve.push({ date: dates[i], value: holding > 0 ? holding * c : cash, index: i });
    });
  } else if (strategy === 'dca') {
    const interval = 7; // buy every 7 data points
    let cash = investment;
    let holding = 0;
    const numBuys = Math.floor((closes.length - 1) / interval) + 1;
    const buyAmount = investment / numBuys;
    closes.forEach((c, i) => {
      if (i % interval === 0 && cash >= buyAmount) {
        const amt = buyAmount / c;
        holding += amt;
        cash -= buyAmount;
        trades.push({ date: dates[i], action: 'Buy', price: c, amount: amt, portfolioValue: holding * c + cash, index: i });
      }
      equityCurve.push({ date: dates[i], value: holding * c + cash, index: i });
    });
  }

  const eqValues = equityCurve.map(e => e.value);
  const finalValue = eqValues[eqValues.length - 1] ?? investment;
  const totalReturn = ((finalValue - investment) / investment) * 100;
  const dr = dailyReturns(eqValues);
  const maxDd = maxDrawdown(eqValues);
  const sr = dr.length > 1 ? sharpeRatio(dr) : 0;

  return { equityCurve, buyHoldCurve, trades, finalValue, totalReturn, maxDd, sharpe: sr, numTrades: trades.length };
}

export default function Backtester() {
  const [coinId, setCoinId] = useState('bitcoin');
  const [coinLabel, setCoinLabel] = useState('Bitcoin');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{ id: string; name: string; symbol: string }[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [days, setDays] = useState(90);
  const [strategy, setStrategy] = useState('buy-hold');
  const [investment, setInvestment] = useState(1000);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (q.length < 2) { setSuggestions([]); return; }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await searchCoins(q);
        setSuggestions(res.coins.slice(0, 6).map(c => ({ id: c.id, name: c.name, symbol: c.symbol })));
      } catch { setSuggestions([]); }
    }, 300);
  }, []);

  const selectCoin = (c: { id: string; name: string }) => {
    setCoinId(c.id); setCoinLabel(c.name); setQuery(''); setSuggestions([]); setShowSearch(false);
  };

  const runTest = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      const chart = await getCoinMarketChart(coinId, 'usd', days);
      const r = runBacktest(chart.prices, strategy, investment);
      setResult(r);
    } catch (e) { setError(String(e)); }
    setLoading(false);
  };

  const exportResults = () => {
    if (!result) return;
    const headers = ['Date', 'Action', 'Price', 'Amount', 'Portfolio Value'];
    const rows = result.trades.map(t => [t.date, t.action, t.price, t.amount, t.portfolioValue] as (string | number)[]);
    downloadCsv('backtest-results.csv', headers, rows);
  };

  // Chart rendering
  const W = 800, H = 280, PAD = { top: 20, right: 20, bottom: 30, left: 70 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  let chartSvg = null;
  if (result) {
    const allVals = [...result.equityCurve.map(e => e.value), ...result.buyHoldCurve.map(e => e.value)];
    const minV = Math.min(...allVals), maxV = Math.max(...allVals), range = maxV - minV || 1;
    const len = result.equityCurve.length;
    const toX = (i: number) => PAD.left + (i / Math.max(len - 1, 1)) * plotW;
    const toY = (v: number) => PAD.top + plotH - ((v - minV) / range) * plotH;
    const eqPath = result.equityCurve.map((e, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(e.value).toFixed(1)}`).join(' ');
    const bhPath = result.buyHoldCurve.map((e, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(e.value).toFixed(1)}`).join(' ');

    chartSvg = (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map(frac => {
          const y = PAD.top + plotH * (1 - frac);
          const val = minV + range * frac;
          return (
            <g key={frac}>
              <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#374151" strokeWidth={0.5} />
              <text x={PAD.left - 8} y={y + 4} textAnchor="end" className="fill-gray-500" fontSize={10}>${formatNumber(val, 0)}</text>
            </g>
          );
        })}
        {/* X labels */}
        {[0, 0.25, 0.5, 0.75, 1].map(frac => {
          const idx = Math.round(frac * (len - 1));
          const label = result.equityCurve[idx]?.date ?? '';
          return <text key={frac} x={toX(idx)} y={H - 5} textAnchor="middle" className="fill-gray-500" fontSize={10}>{label}</text>;
        })}
        {/* Buy & Hold line */}
        <path d={bhPath} fill="none" stroke="#6b7280" strokeWidth={1.2} strokeDasharray="4,3" />
        {/* Strategy line */}
        <path d={eqPath} fill="none" stroke="#10b981" strokeWidth={2} />
        {/* Trade markers */}
        {result.trades.map((t, i) => (
          <circle key={i} cx={toX(t.index)} cy={toY(t.portfolioValue)} r={4} fill={t.action === 'Buy' ? '#10b981' : '#ef4444'} stroke="#111827" strokeWidth={2} />
        ))}
        {/* Legend */}
        <line x1={PAD.left + 10} y1={12} x2={PAD.left + 30} y2={12} stroke="#10b981" strokeWidth={2} />
        <text x={PAD.left + 34} y={15} className="fill-gray-300" fontSize={10}>Strategy</text>
        <line x1={PAD.left + 100} y1={12} x2={PAD.left + 120} y2={12} stroke="#6b7280" strokeWidth={1.2} strokeDasharray="4,3" />
        <text x={PAD.left + 124} y={15} className="fill-gray-500" fontSize={10}>Buy & Hold</text>
      </svg>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Strategy Backtester</h1>
        <p className="text-gray-400 text-sm mt-1">Test trading strategies against historical data</p>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">{error}</div>}

      {/* Config */}
      <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Coin selector */}
          <div className="relative">
            <label className="text-xs text-gray-400 block mb-1">Coin</label>
            <button onClick={() => setShowSearch(!showSearch)} className="w-full flex items-center gap-2 bg-gray-700/50 border border-gray-600/50 rounded-lg px-3 py-2 text-sm text-left">
              <Search className="w-4 h-4 text-gray-400" />{coinLabel}
            </button>
            {showSearch && (
              <div className="absolute top-full mt-1 left-0 w-full bg-gray-800 border border-gray-700 rounded-lg z-20 shadow-xl">
                <input value={query} onChange={e => handleSearch(e.target.value)} placeholder="Search..." className="w-full bg-transparent border-b border-gray-700 px-3 py-2 text-sm outline-none" autoFocus />
                {suggestions.map(s => (
                  <button key={s.id} onClick={() => selectCoin(s)} className="w-full text-left px-3 py-2 hover:bg-gray-700/60 text-sm">
                    {s.name} <span className="text-gray-500">{s.symbol.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Date range */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Date Range</label>
            <div className="flex bg-gray-700/40 rounded-lg p-0.5">
              {RANGES.map(r => (
                <button key={r.days} onClick={() => setDays(r.days)} className={`flex-1 px-2 py-2 rounded-md text-xs font-medium transition ${days === r.days ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-white'}`}>{r.label}</button>
              ))}
            </div>
          </div>
          {/* Strategy */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Strategy</label>
            <select value={strategy} onChange={e => setStrategy(e.target.value)} className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-3 py-2 text-sm outline-none">
              {STRATEGIES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          {/* Investment */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Initial Investment</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input type="number" value={investment} onChange={e => setInvestment(Number(e.target.value) || 0)} className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg pl-7 pr-3 py-2 text-sm outline-none" />
            </div>
          </div>
          {/* Run button */}
          <div className="flex items-end">
            <button onClick={runTest} disabled={loading} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Run Backtest
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Final Value', value: `$${formatNumber(result.finalValue)}`, icon: <BarChart3 className="w-3.5 h-3.5" /> },
              { label: 'Total Return', value: formatPercent(result.totalReturn), icon: result.totalReturn >= 0 ? <TrendingUp className="w-3.5 h-3.5 text-green-400" /> : <TrendingDown className="w-3.5 h-3.5 text-red-400" />, color: result.totalReturn >= 0 ? 'text-green-400' : 'text-red-400' },
              { label: 'Max Drawdown', value: `${(-result.maxDd * 100).toFixed(2)}%`, icon: <TrendingDown className="w-3.5 h-3.5 text-red-400" />, color: 'text-red-400' },
              { label: 'Sharpe Ratio', value: result.sharpe.toFixed(2), icon: <BarChart3 className="w-3.5 h-3.5" /> },
              { label: 'Trades', value: String(result.numTrades), icon: <BarChart3 className="w-3.5 h-3.5" /> },
            ].map(kpi => (
              <div key={kpi.label} className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">{kpi.icon}{kpi.label}</div>
                <div className={`text-lg font-semibold ${kpi.color ?? ''}`}>{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Equity Curve Chart */}
          <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-gray-300">Equity Curve</h2>
              <button onClick={exportResults} className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs transition">
                <Download className="w-3.5 h-3.5" />Export CSV
              </button>
            </div>
            {chartSvg}
          </div>

          {/* Trade Log */}
          <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700/50">
              <h2 className="text-sm font-medium text-gray-300">Trade Log</h2>
            </div>
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-800">
                  <tr className="text-left text-gray-400 text-xs">
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Action</th>
                    <th className="px-4 py-2 text-right">Price</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                    <th className="px-4 py-2 text-right">Portfolio Value</th>
                  </tr>
                </thead>
                <tbody>
                  {result.trades.map((t, i) => (
                    <tr key={i} className="border-t border-gray-700/30 hover:bg-gray-700/20">
                      <td className="px-4 py-2 text-gray-300">{t.date}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${t.action === 'Buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{t.action}</span>
                      </td>
                      <td className="px-4 py-2 text-right">${formatNumber(t.price)}</td>
                      <td className="px-4 py-2 text-right text-gray-400">{t.amount.toFixed(6)}</td>
                      <td className="px-4 py-2 text-right">${formatNumber(t.portfolioValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.trades.length === 0 && (
                <div className="p-8 text-center text-gray-500 text-sm">No trades executed with this strategy and timeframe</div>
              )}
            </div>
          </div>
        </>
      )}

      {!result && !loading && (
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-12 text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-600" />
          <p className="text-gray-500">Configure your strategy above and click Run Backtest</p>
        </div>
      )}
    </div>
  );
}
