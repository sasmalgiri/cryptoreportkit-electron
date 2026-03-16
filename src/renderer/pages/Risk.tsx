import { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  Download,
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
} from 'lucide-react';
import { getMarkets, getCoinMarketChart } from '../hooks/useElectron';
import {
  dailyReturns,
  valueAtRisk,
  sharpeRatio,
  sortinoRatio,
  maxDrawdown,
} from '../utils/indicators';
import { downloadCsv } from '../utils/export';
import { HelpTooltip } from '../components/HelpTooltip';
import type { CoinMarket } from '../types';

function rollingStdDev(returns: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = window - 1; i < returns.length; i++) {
    const slice = returns.slice(i - window + 1, i + 1);
    const mean = slice.reduce((s, v) => s + v, 0) / slice.length;
    const variance = slice.reduce((s, v) => s + (v - mean) ** 2, 0) / slice.length;
    result.push(Math.sqrt(variance));
  }
  return result;
}

function drawdownSeries(prices: number[]): number[] {
  const dd: number[] = [];
  let peak = prices[0];
  for (const p of prices) {
    if (p > peak) peak = p;
    dd.push((p - peak) / peak); // negative values
  }
  return dd;
}

function buildHistogram(
  returns: number[],
  binMin: number,
  binMax: number,
  binCount: number,
): { center: number; count: number }[] {
  const binWidth = (binMax - binMin) / binCount;
  const bins = Array.from({ length: binCount }, (_, i) => ({
    center: binMin + (i + 0.5) * binWidth,
    count: 0,
  }));
  for (const r of returns) {
    const idx = Math.min(binCount - 1, Math.max(0, Math.floor((r - binMin) / binWidth)));
    bins[idx].count++;
  }
  return bins;
}

/** Simple SVG polyline from data points */
function svgPath(
  points: number[],
  width: number,
  height: number,
  minY?: number,
  maxY?: number,
): string {
  if (points.length === 0) return '';
  const mn = minY ?? Math.min(...points);
  const mx = maxY ?? Math.max(...points);
  const range = mx - mn || 1;
  return points
    .map((v, i) => {
      const x = (i / Math.max(1, points.length - 1)) * width;
      const y = height - ((v - mn) / range) * height;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export default function Risk() {
  const [topCoins, setTopCoins] = useState<CoinMarket[]>([]);
  const [selectedCoin, setSelectedCoin] = useState('bitcoin');
  const [prices, setPrices] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingChart, setFetchingChart] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch top coins for selector
  useEffect(() => {
    getMarkets('usd', 1, 30)
      .then((data) => setTopCoins(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Fetch price history
  useEffect(() => {
    setFetchingChart(true);
    setError(null);
    getCoinMarketChart(selectedCoin, 'usd', 365)
      .then((data) => {
        setPrices(data.prices.map(([, p]) => p));
      })
      .catch((e) => setError(String(e)))
      .finally(() => setFetchingChart(false));
  }, [selectedCoin]);

  // Computed metrics
  const returns = useMemo(() => dailyReturns(prices), [prices]);
  const sharpe = useMemo(() => sharpeRatio(returns), [returns]);
  const sortino = useMemo(() => sortinoRatio(returns), [returns]);
  const mdd = useMemo(() => maxDrawdown(prices), [prices]);
  const var95 = useMemo(() => valueAtRisk(returns, 0.05), [returns]);
  const volSeries = useMemo(() => rollingStdDev(returns, 30), [returns]);
  const ddSeries = useMemo(() => drawdownSeries(prices), [prices]);
  const histogram = useMemo(() => buildHistogram(returns, -0.1, 0.1, 40), [returns]);
  const maxHistCount = useMemo(
    () => Math.max(1, ...histogram.map((b) => b.count)),
    [histogram],
  );

  const coinInfo = topCoins.find((c) => c.id === selectedCoin);

  function sharpeColor(v: number): string {
    if (v > 1) return 'text-emerald-400';
    if (v >= 0) return 'text-yellow-400';
    return 'text-red-400';
  }

  function handleExport() {
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Coin', selectedCoin],
      ['Sharpe Ratio', sharpe.toFixed(4)],
      ['Sortino Ratio', sortino.toFixed(4)],
      ['Max Drawdown', `${(-mdd * 100).toFixed(2)}%`],
      ['Value at Risk (95%)', `${(var95 * 100).toFixed(2)}%`],
      ['Days Analyzed', String(prices.length)],
      ['Daily Returns Count', String(returns.length)],
      ['Avg Daily Return', `${((returns.reduce((a, b) => a + b, 0) / returns.length) * 100).toFixed(4)}%`],
    ];
    downloadCsv(`risk_${selectedCoin}.csv`, headers, rows);
  }

  // Chart dimensions
  const CW = 700;
  const CH = 180;

  function interpretRisk(): string {
    const parts: string[] = [];
    if (sharpe > 1.5) parts.push('Excellent risk-adjusted returns (Sharpe > 1.5).');
    else if (sharpe > 1) parts.push('Good risk-adjusted returns (Sharpe > 1).');
    else if (sharpe > 0) parts.push('Positive but modest risk-adjusted returns.');
    else parts.push('Negative risk-adjusted returns, underperforming the risk-free rate.');

    if (mdd > 0.5)
      parts.push(`Significant historical drawdown of ${(mdd * 100).toFixed(0)}% from peak.`);
    else if (mdd > 0.3) parts.push(`Moderate drawdown of ${(mdd * 100).toFixed(0)}% observed.`);
    else parts.push(`Relatively mild max drawdown of ${(mdd * 100).toFixed(0)}%.`);

    parts.push(
      `At 95% confidence, daily losses are not expected to exceed ${Math.abs(var95 * 100).toFixed(2)}%.`,
    );

    if (sortino > sharpe)
      parts.push('Sortino > Sharpe indicates limited downside relative to overall volatility.');

    return parts.join(' ');
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-emerald-400" />
            Risk Dashboard
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Quantitative risk analysis — 365-day window
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Coin selector */}
          <select
            value={selectedCoin}
            onChange={(e) => setSelectedCoin(e.target.value)}
            className="bg-gray-800 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
          >
            {topCoins.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.symbol.toUpperCase()})
              </option>
            ))}
          </select>
          <button
            onClick={handleExport}
            disabled={prices.length === 0}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {fetchingChart || loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-3" />
          Loading price history for {selectedCoin}...
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Sharpe */}
            <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
                <TrendingUp className="w-3.5 h-3.5" />
                Sharpe Ratio
                <HelpTooltip text="Return per unit of total risk. Above 1.0 is good, above 2.0 is excellent. Compares excess return to volatility — higher means better risk-adjusted performance." />
              </div>
              <div className={`text-2xl font-bold ${sharpeColor(sharpe)}`}>
                {sharpe.toFixed(2)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {sharpe > 1 ? 'Good' : sharpe > 0 ? 'Moderate' : 'Poor'}
              </div>
            </div>

            {/* Sortino */}
            <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
                <Activity className="w-3.5 h-3.5" />
                Sortino Ratio
                <HelpTooltip text="Like Sharpe but only penalizes downside volatility. Upside swings don't count against you. Better for assets with asymmetric returns like crypto." />
              </div>
              <div className={`text-2xl font-bold ${sharpeColor(sortino)}`}>
                {sortino.toFixed(2)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Downside-adjusted</div>
            </div>

            {/* Max Drawdown */}
            <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
                <TrendingDown className="w-3.5 h-3.5" />
                Max Drawdown
                <HelpTooltip text="The largest peak-to-trough decline in the selected period. Shows the worst-case loss if you bought at the top and sold at the bottom." />
              </div>
              <div className="text-2xl font-bold text-red-400">
                {(-mdd * 100).toFixed(2)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">From all-time high</div>
            </div>

            {/* VaR */}
            <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
                <Target className="w-3.5 h-3.5" />
                Value at Risk (95%)
                <HelpTooltip text="With 95% confidence, the daily loss will not exceed this percentage. The remaining 5% of the time, losses could be worse. A common institutional risk metric." />
              </div>
              <div className="text-2xl font-bold text-yellow-400">
                {(var95 * 100).toFixed(2)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">Daily, 5th percentile</div>
            </div>
          </div>

          {/* Volatility Chart */}
          <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">
              Rolling 30-Day Volatility (Std Dev of Daily Returns)
            </h3>
            <div className="overflow-x-auto">
              <svg
                viewBox={`0 0 ${CW} ${CH}`}
                className="w-full"
                style={{ maxHeight: CH }}
                preserveAspectRatio="none"
              >
                {/* Grid lines */}
                {[0.25, 0.5, 0.75].map((f) => (
                  <line
                    key={f}
                    x1={0}
                    y1={CH * f}
                    x2={CW}
                    y2={CH * f}
                    stroke="rgba(75,85,99,0.3)"
                    strokeDasharray="4"
                  />
                ))}
                {/* Volatility line */}
                <path
                  d={svgPath(volSeries, CW, CH)}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeLinejoin="round"
                />
                {/* Area fill */}
                {volSeries.length > 0 && (
                  <path
                    d={`${svgPath(volSeries, CW, CH)} L${CW},${CH} L0,${CH} Z`}
                    fill="url(#volGrad)"
                    opacity={0.3}
                  />
                )}
                <defs>
                  <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>~1 year ago</span>
              <span>Today</span>
            </div>
          </div>

          {/* Return Distribution + Drawdown side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Histogram */}
            <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
              <h3 className="text-sm font-medium text-gray-300 mb-3">
                Daily Return Distribution
              </h3>
              <div className="overflow-x-auto">
                <svg viewBox={`0 0 ${CW} ${CH + 30}`} className="w-full" style={{ maxHeight: CH + 30 }}>
                  {/* Bars */}
                  {histogram.map((bin, i) => {
                    const bw = CW / histogram.length;
                    const bh = (bin.count / maxHistCount) * CH;
                    const isNeg = bin.center < 0;
                    return (
                      <rect
                        key={i}
                        x={i * bw + 1}
                        y={CH - bh}
                        width={Math.max(1, bw - 2)}
                        height={bh}
                        rx={1}
                        fill={isNeg ? 'rgba(239,68,68,0.7)' : 'rgba(16,185,129,0.7)'}
                      />
                    );
                  })}
                  {/* VaR line */}
                  {(() => {
                    const varX = ((var95 - -0.1) / 0.2) * CW;
                    return (
                      <g>
                        <line
                          x1={varX}
                          y1={0}
                          x2={varX}
                          y2={CH}
                          stroke="#f59e0b"
                          strokeWidth={2}
                          strokeDasharray="6,3"
                        />
                        <text
                          x={varX + 4}
                          y={14}
                          className="fill-yellow-400"
                          fontSize={10}
                          fontWeight="bold"
                        >
                          VaR {(var95 * 100).toFixed(1)}%
                        </text>
                      </g>
                    );
                  })()}
                  {/* Zero line */}
                  <line
                    x1={CW / 2}
                    y1={0}
                    x2={CW / 2}
                    y2={CH}
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth={1}
                  />
                  {/* X axis labels */}
                  <text x={4} y={CH + 16} className="fill-gray-500" fontSize={10}>
                    -10%
                  </text>
                  <text x={CW / 2 - 6} y={CH + 16} className="fill-gray-500" fontSize={10}>
                    0%
                  </text>
                  <text x={CW - 30} y={CH + 16} className="fill-gray-500" fontSize={10}>
                    +10%
                  </text>
                </svg>
              </div>
            </div>

            {/* Drawdown Chart */}
            <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
              <h3 className="text-sm font-medium text-gray-300 mb-3">
                Drawdown from Peak
              </h3>
              <div className="overflow-x-auto">
                <svg viewBox={`0 0 ${CW} ${CH}`} className="w-full" style={{ maxHeight: CH }}>
                  {/* Grid */}
                  {[-0.25, -0.5, -0.75].map((f) => {
                    const minDd = Math.min(0, ...ddSeries);
                    const y = CH - ((f - minDd) / (0 - minDd || 1)) * CH;
                    return (
                      <g key={f}>
                        <line
                          x1={0}
                          y1={y}
                          x2={CW}
                          y2={y}
                          stroke="rgba(75,85,99,0.3)"
                          strokeDasharray="4"
                        />
                        <text x={4} y={y - 4} className="fill-gray-500" fontSize={9}>
                          {(f * 100).toFixed(0)}%
                        </text>
                      </g>
                    );
                  })}
                  {/* Zero line at top */}
                  <line x1={0} y1={0} x2={CW} y2={0} stroke="rgba(255,255,255,0.1)" />
                  {/* Drawdown area */}
                  {ddSeries.length > 0 && (() => {
                    const minDd = Math.min(0, ...ddSeries);
                    const pathD = ddSeries
                      .map((v, i) => {
                        const x = (i / Math.max(1, ddSeries.length - 1)) * CW;
                        const y = CH - ((v - minDd) / (0 - minDd || 1)) * CH;
                        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
                      })
                      .join(' ');
                    return (
                      <g>
                        <path
                          d={`${pathD} L${CW},0 L0,0 Z`}
                          fill="rgba(239,68,68,0.25)"
                        />
                        <path
                          d={pathD}
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth={1.5}
                          strokeLinejoin="round"
                        />
                      </g>
                    );
                  })()}
                </svg>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>~1 year ago</span>
                <span>Today</span>
              </div>
            </div>
          </div>

          {/* Risk Summary */}
          <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-5">
            <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
              Risk Summary — {coinInfo?.name ?? selectedCoin}
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed">{interpretRisk()}</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4 text-xs">
              <div>
                <span className="text-gray-500">Avg Daily Return</span>
                <div className="text-white font-mono mt-0.5">
                  {returns.length > 0
                    ? `${((returns.reduce((a, b) => a + b, 0) / returns.length) * 100).toFixed(4)}%`
                    : '-'}
                </div>
              </div>
              <div>
                <span className="text-gray-500">Daily Volatility</span>
                <div className="text-white font-mono mt-0.5">
                  {volSeries.length > 0
                    ? `${(volSeries[volSeries.length - 1] * 100).toFixed(4)}%`
                    : '-'}
                </div>
              </div>
              <div>
                <span className="text-gray-500">Annualized Volatility</span>
                <div className="text-white font-mono mt-0.5">
                  {volSeries.length > 0
                    ? `${(volSeries[volSeries.length - 1] * Math.sqrt(365) * 100).toFixed(2)}%`
                    : '-'}
                </div>
              </div>
              <div>
                <span className="text-gray-500">Data Points</span>
                <div className="text-white font-mono mt-0.5">
                  {prices.length} prices / {returns.length} returns
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
