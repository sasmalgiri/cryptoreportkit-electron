import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Download,
  CandlestickChart,
  LineChart,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { searchCoins, getOhlc } from '../hooks/useElectron';
import { sma, ema, rsi, macd, bollingerBands } from '../utils/indicators';
import { downloadCsv } from '../utils/export';
import type { OhlcvData } from '../types';

const TIMEFRAMES = [
  { label: '1D', days: 1 },
  { label: '7D', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '1Y', days: 365 },
];

const OVERLAYS = ['SMA(20)', 'EMA(50)', 'Bollinger'] as const;
type Overlay = (typeof OVERLAYS)[number];

function fmtDate(ts: number, short = false): string {
  const d = new Date(ts);
  if (short) return `${d.getMonth() + 1}/${d.getDate()}`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

function fmtPrice(n: number): string {
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (n >= 1) return n.toFixed(2);
  return n.toPrecision(4);
}

/* ------------------------------------------------------------------ */
/*  SVG Chart helpers                                                  */
/* ------------------------------------------------------------------ */
function polylinePoints(
  values: (number | null)[],
  timestamps: number[],
  xScale: (ts: number) => number,
  yScale: (v: number) => number,
): string {
  return values
    .map((v, i) => (v !== null ? `${xScale(timestamps[i])},${yScale(v)}` : null))
    .filter(Boolean)
    .join(' ');
}

export default function AdvancedCharts() {
  const [coinId, setCoinId] = useState('bitcoin');
  const [coinLabel, setCoinLabel] = useState('Bitcoin');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<
    { id: string; name: string; symbol: string; thumb: string | null }[]
  >([]);
  const [showResults, setShowResults] = useState(false);
  const [days, setDays] = useState(30);
  const [chartType, setChartType] = useState<'line' | 'candle'>('line');
  const [overlays, setOverlays] = useState<Set<Overlay>>(new Set());
  const [ohlc, setOhlc] = useState<OhlcvData>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Debounced search */
  useEffect(() => {
    if (query.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await searchCoins(query);
        setSearchResults(res.coins.slice(0, 8));
        setShowResults(true);
      } catch { /* ignore */ }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  /* Fetch OHLC */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getOhlc(coinId, 'usd', days);
      setOhlc(data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load chart data');
    } finally {
      setLoading(false);
    }
  }, [coinId, days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* Derived data */
  const timestamps = useMemo(() => ohlc.map((c) => c[0]), [ohlc]);
  const highs = useMemo(() => ohlc.map((c) => c[2]), [ohlc]);
  const lows = useMemo(() => ohlc.map((c) => c[3]), [ohlc]);
  const closes = useMemo(() => ohlc.map((c) => c[4]), [ohlc]);

  const sma20 = useMemo(() => (overlays.has('SMA(20)') ? sma(closes, 20) : []), [closes, overlays]);
  const ema50 = useMemo(() => (overlays.has('EMA(50)') ? ema(closes, 50) : []), [closes, overlays]);
  const bb = useMemo(() => (overlays.has('Bollinger') ? bollingerBands(closes) : null), [closes, overlays]);
  const rsiData = useMemo(() => rsi(closes, 14), [closes]);
  const macdData = useMemo(() => macd(closes), [closes]);

  /* Toggle overlay */
  const toggleOverlay = (o: Overlay) => {
    setOverlays((prev) => {
      const next = new Set(prev);
      next.has(o) ? next.delete(o) : next.add(o);
      return next;
    });
  };

  /* Select coin from search */
  const selectCoin = (id: string, name: string) => {
    setCoinId(id);
    setCoinLabel(name);
    setQuery('');
    setShowResults(false);
  };

  /* Export */
  const handleExport = () => {
    const headers = ['Date', 'Open', 'High', 'Low', 'Close'];
    const rows = ohlc.map((c) => [new Date(c[0]).toISOString(), c[1], c[2], c[3], c[4]]);
    downloadCsv(`${coinId}_ohlc_${days}d.csv`, headers, rows);
  };

  /* Chart dimensions */
  const W = 900, H = 340, PAD = { top: 16, right: 60, bottom: 32, left: 0 };
  const cw = W - PAD.left - PAD.right;
  const ch = H - PAD.top - PAD.bottom;

  /* Price range */
  const allPrices = [...highs, ...lows, ...(bb ? [...bb.upper.filter(Boolean) as number[], ...bb.lower.filter(Boolean) as number[]] : [])];
  const minP = allPrices.length ? Math.min(...allPrices) * 0.998 : 0;
  const maxP = allPrices.length ? Math.max(...allPrices) * 1.002 : 1;

  const xScale = (ts: number) => {
    if (timestamps.length < 2) return PAD.left;
    return PAD.left + ((ts - timestamps[0]) / (timestamps[timestamps.length - 1] - timestamps[0])) * cw;
  };
  const yScale = (v: number) => PAD.top + ch - ((v - minP) / (maxP - minP)) * ch;

  /* Y axis ticks */
  const yTicks = Array.from({ length: 5 }, (_, i) => minP + ((maxP - minP) * i) / 4);

  /* X axis labels (~6) */
  const xLabelCount = 6;
  const xStep = Math.max(1, Math.floor(timestamps.length / xLabelCount));
  const xLabels = timestamps.filter((_, i) => i % xStep === 0);

  /* RSI sub-chart */
  const RSI_H = 100, RSI_TOP = 8;
  const rsiYScale = (v: number) => RSI_TOP + (1 - v / 100) * (RSI_H - RSI_TOP - 8);

  /* MACD sub-chart */
  const MACD_H = 100, MACD_TOP = 8;
  const macdVals = macdData.macdLine.filter((v): v is number => v !== null);
  const histVals = macdData.histogram.filter((v): v is number => v !== null);
  const allMacdVals = [...macdVals, ...histVals];
  const macdMin = allMacdVals.length ? Math.min(...allMacdVals) : -1;
  const macdMax = allMacdVals.length ? Math.max(...allMacdVals) : 1;
  const macdRange = Math.max(Math.abs(macdMin), Math.abs(macdMax)) * 1.1 || 1;
  const macdYScale = (v: number) => MACD_TOP + (MACD_H - MACD_TOP - 8) / 2 * (1 - v / macdRange);
  const macdZero = macdYScale(0);

  /* Candle width */
  const candleW = timestamps.length > 1 ? Math.max(2, (cw / timestamps.length) * 0.6) : 4;

  const currentPrice = closes.length ? closes[closes.length - 1] : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Advanced Charts</h1>
          <p className="text-gray-400 text-sm mt-0.5">{coinLabel} {currentPrice !== null && `- $${fmtPrice(currentPrice)}`}</p>
        </div>
        <button onClick={handleExport} disabled={ohlc.length === 0} className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm rounded-lg transition-colors">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Search + controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
            placeholder="Search coin..."
            className="bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white w-56 focus:outline-none focus:border-emerald-500"
          />
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full mt-1 left-0 w-72 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
              {searchResults.map((c) => (
                <button key={c.id} onMouseDown={() => selectCoin(c.id, c.name)} className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-700/60 text-left text-sm">
                  {c.thumb && <img src={c.thumb} alt="" className="w-5 h-5 rounded-full" />}
                  <span className="text-white">{c.name}</span>
                  <span className="text-gray-500 uppercase text-xs">{c.symbol}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Timeframe */}
        <div className="flex bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          {TIMEFRAMES.map((tf) => (
            <button key={tf.label} onClick={() => setDays(tf.days)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${days === tf.days ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              {tf.label}
            </button>
          ))}
        </div>

        {/* Chart type */}
        <div className="flex bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <button onClick={() => setChartType('line')} className={`px-3 py-1.5 text-xs flex items-center gap-1 transition-colors ${chartType === 'line' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            <LineChart className="w-3.5 h-3.5" /> Line
          </button>
          <button onClick={() => setChartType('candle')} className={`px-3 py-1.5 text-xs flex items-center gap-1 transition-colors ${chartType === 'candle' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            <CandlestickChart className="w-3.5 h-3.5" /> Candle
          </button>
        </div>

        {/* Overlays */}
        <div className="flex items-center gap-2">
          {OVERLAYS.map((o) => (
            <label key={o} className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer select-none">
              <input type="checkbox" checked={overlays.has(o)} onChange={() => toggleOverlay(o)}
                className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 accent-emerald-500" />
              {o}
            </label>
          ))}
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
        {loading ? (
          <div className="flex items-center justify-center h-[340px] text-gray-500"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : error ? (
          <div className="flex items-center justify-center h-[340px] gap-2 text-red-400 text-sm"><AlertCircle className="w-5 h-5" />{error}</div>
        ) : (
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
            {/* Grid lines */}
            {yTicks.map((t, i) => (
              <g key={i}>
                <line x1={PAD.left} x2={W - PAD.right} y1={yScale(t)} y2={yScale(t)} stroke="#374151" strokeWidth="0.5" />
                <text x={W - PAD.right + 4} y={yScale(t) + 4} fill="#9ca3af" fontSize="9">{fmtPrice(t)}</text>
              </g>
            ))}
            {/* X labels */}
            {xLabels.map((ts) => (
              <text key={ts} x={xScale(ts)} y={H - 4} fill="#9ca3af" fontSize="9" textAnchor="middle">{fmtDate(ts, true)}</text>
            ))}

            {/* Bollinger Bands fill */}
            {bb && (() => {
              const pts: string[] = [];
              const ptsRev: string[] = [];
              for (let i = 0; i < closes.length; i++) {
                if (bb.upper[i] !== null && bb.lower[i] !== null) {
                  pts.push(`${xScale(timestamps[i])},${yScale(bb.upper[i]!)}`);
                  ptsRev.unshift(`${xScale(timestamps[i])},${yScale(bb.lower[i]!)}`);
                }
              }
              return <polygon points={[...pts, ...ptsRev].join(' ')} fill="#10b98115" />;
            })()}

            {/* Candlestick / Line */}
            {chartType === 'candle' ? (
              ohlc.map((c, i) => {
                const [ts, o, h, l, cl] = c;
                const x = xScale(ts);
                const bullish = cl >= o;
                const color = bullish ? '#10b981' : '#ef4444';
                const bodyTop = yScale(Math.max(o, cl));
                const bodyBot = yScale(Math.min(o, cl));
                const bodyH = Math.max(1, bodyBot - bodyTop);
                return (
                  <g key={i}>
                    <line x1={x} x2={x} y1={yScale(h)} y2={yScale(l)} stroke={color} strokeWidth="1" />
                    <rect x={x - candleW / 2} y={bodyTop} width={candleW} height={bodyH} fill={color} rx="0.5" />
                  </g>
                );
              })
            ) : (
              <polyline points={polylinePoints(closes, timestamps, xScale, yScale)} fill="none" stroke="#10b981" strokeWidth="2" />
            )}

            {/* Overlays */}
            {overlays.has('SMA(20)') && sma20.length > 0 && (
              <polyline points={polylinePoints(sma20, timestamps, xScale, yScale)} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 2" />
            )}
            {overlays.has('EMA(50)') && ema50.length > 0 && (
              <polyline points={polylinePoints(ema50, timestamps, xScale, yScale)} fill="none" stroke="#8b5cf6" strokeWidth="1.5" />
            )}
            {bb && (
              <>
                <polyline points={polylinePoints(bb.upper, timestamps, xScale, yScale)} fill="none" stroke="#10b981" strokeWidth="1" opacity="0.5" />
                <polyline points={polylinePoints(bb.middle, timestamps, xScale, yScale)} fill="none" stroke="#10b981" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
                <polyline points={polylinePoints(bb.lower, timestamps, xScale, yScale)} fill="none" stroke="#10b981" strokeWidth="1" opacity="0.5" />
              </>
            )}
          </svg>
        )}

        {/* Legend */}
        {!loading && !error && overlays.size > 0 && (
          <div className="flex gap-4 mt-2 text-xs text-gray-400 pl-2">
            {overlays.has('SMA(20)') && <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-400 inline-block" /> SMA(20)</span>}
            {overlays.has('EMA(50)') && <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-violet-500 inline-block" /> EMA(50)</span>}
            {overlays.has('Bollinger') && <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-500 inline-block opacity-50" /> Bollinger</span>}
          </div>
        )}
      </div>

      {/* RSI Sub-chart */}
      {!loading && !error && rsiData.length > 0 && (
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
          <h3 className="text-xs font-medium text-gray-400 mb-2">RSI (14)</h3>
          <svg viewBox={`0 0 ${W} ${RSI_H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
            {/* Zones */}
            <rect x={PAD.left} y={rsiYScale(70)} width={cw} height={rsiYScale(30) - rsiYScale(70)} fill="#10b98108" />
            <line x1={PAD.left} x2={W - PAD.right} y1={rsiYScale(70)} y2={rsiYScale(70)} stroke="#ef4444" strokeWidth="0.5" strokeDasharray="4 2" opacity="0.5" />
            <line x1={PAD.left} x2={W - PAD.right} y1={rsiYScale(30)} y2={rsiYScale(30)} stroke="#10b981" strokeWidth="0.5" strokeDasharray="4 2" opacity="0.5" />
            <line x1={PAD.left} x2={W - PAD.right} y1={rsiYScale(50)} y2={rsiYScale(50)} stroke="#374151" strokeWidth="0.5" />
            {/* Labels */}
            <text x={W - PAD.right + 4} y={rsiYScale(70) + 3} fill="#ef4444" fontSize="8">70</text>
            <text x={W - PAD.right + 4} y={rsiYScale(30) + 3} fill="#10b981" fontSize="8">30</text>
            {/* Line */}
            <polyline
              points={rsiData.map((v, i) => v !== null ? `${xScale(timestamps[i])},${rsiYScale(v)}` : null).filter(Boolean).join(' ')}
              fill="none" stroke="#a78bfa" strokeWidth="1.5"
            />
          </svg>
          {(() => {
            const last = rsiData.filter((v): v is number => v !== null).pop();
            return last !== undefined ? (
              <p className="text-xs mt-1 text-gray-500">Current: <span className={last > 70 ? 'text-red-400' : last < 30 ? 'text-emerald-400' : 'text-gray-300'}>{last.toFixed(1)}</span></p>
            ) : null;
          })()}
        </div>
      )}

      {/* MACD Sub-chart */}
      {!loading && !error && macdData.macdLine.length > 0 && (
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
          <h3 className="text-xs font-medium text-gray-400 mb-2">MACD (12, 26, 9)</h3>
          <svg viewBox={`0 0 ${W} ${MACD_H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
            <line x1={PAD.left} x2={W - PAD.right} y1={macdZero} y2={macdZero} stroke="#374151" strokeWidth="0.5" />
            {/* Histogram */}
            {macdData.histogram.map((v, i) => {
              if (v === null) return null;
              const x = xScale(timestamps[i]);
              const barW = Math.max(1.5, candleW * 0.8);
              const top = v >= 0 ? macdYScale(v) : macdZero;
              const h = Math.abs(macdYScale(v) - macdZero);
              return <rect key={i} x={x - barW / 2} y={top} width={barW} height={Math.max(0.5, h)} fill={v >= 0 ? '#10b981' : '#ef4444'} opacity="0.4" />;
            })}
            {/* MACD line */}
            <polyline
              points={macdData.macdLine.map((v, i) => v !== null ? `${xScale(timestamps[i])},${macdYScale(v)}` : null).filter(Boolean).join(' ')}
              fill="none" stroke="#3b82f6" strokeWidth="1.5"
            />
            {/* Signal line */}
            <polyline
              points={macdData.signalLine.map((v, i) => v !== null ? `${xScale(timestamps[i])},${macdYScale(v)}` : null).filter(Boolean).join(' ')}
              fill="none" stroke="#f97316" strokeWidth="1.5" strokeDasharray="3 2"
            />
          </svg>
          <div className="flex gap-4 mt-1 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500 inline-block" /> MACD</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-orange-500 inline-block" /> Signal</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500/40 inline-block rounded-sm" /> Histogram</span>
          </div>
        </div>
      )}
    </div>
  );
}
