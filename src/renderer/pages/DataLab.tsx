import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Download, Trash2, BarChart3 } from 'lucide-react';
import { searchCoins, getCoinMarketChart } from '../hooks/useElectron';
import type { MarketChartData } from '../types';
import { sma, bollingerBands } from '../utils/indicators';
import { downloadCsv, formatNumber, formatCompact, formatPercent } from '../utils/export';

const TIMEFRAMES = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: '1Y', days: 365 },
];
const DATA_TYPES = ['Price', 'Volume', 'Market Cap'] as const;
const COIN_COLORS = ['#10b981', '#3b82f6', '#f59e0b'];

type DataType = (typeof DATA_TYPES)[number];

interface CoinTag { id: string; name: string; symbol: string }

interface ChartDataSet {
  coinId: string;
  data: MarketChartData;
}

export default function DataLab() {
  const [coins, setCoins] = useState<CoinTag[]>([]);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{ id: string; name: string; symbol: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dataType, setDataType] = useState<DataType>('Price');
  const [timeframe, setTimeframe] = useState(30);
  const [showSma, setShowSma] = useState(false);
  const [showBollinger, setShowBollinger] = useState(false);
  const [chartData, setChartData] = useState<ChartDataSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (q.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await searchCoins(q);
        setSuggestions(res.coins.slice(0, 8).map(c => ({ id: c.id, name: c.name, symbol: c.symbol })));
        setShowSuggestions(true);
      } catch { setSuggestions([]); }
    }, 300);
  }, []);

  const addCoin = useCallback((coin: { id: string; name: string; symbol: string }) => {
    if (coins.length >= 3 || coins.find(c => c.id === coin.id)) return;
    setCoins(prev => [...prev, { id: coin.id, name: coin.name, symbol: coin.symbol }]);
    setQuery('');
    setShowSuggestions(false);
    setSuggestions([]);
  }, [coins]);

  const removeCoin = (id: string) => setCoins(prev => prev.filter(c => c.id !== id));
  const clearAll = () => { setCoins([]); setChartData([]); setHoverIdx(null); };

  useEffect(() => {
    if (coins.length === 0) { setChartData([]); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.allSettled(coins.map(c => getCoinMarketChart(c.id, 'usd', timeframe).then(d => ({ coinId: c.id, data: d }))))
      .then(results => {
        if (cancelled) return;
        const fulfilled = results.filter((r): r is PromiseFulfilledResult<ChartDataSet> => r.status === 'fulfilled').map(r => r.value);
        if (fulfilled.length === 0 && coins.length > 0) setError('Failed to fetch chart data');
        setChartData(fulfilled);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [coins, timeframe]);

  const getSeriesData = (ds: ChartDataSet): [number, number][] => {
    if (dataType === 'Volume') return ds.data.total_volumes;
    if (dataType === 'Market Cap') return ds.data.market_caps;
    return ds.data.prices;
  };

  // Chart dimensions
  const W = 800, H = 320, PAD = { top: 20, right: 20, bottom: 30, left: 70 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const allSeries = chartData.map(ds => getSeriesData(ds));
  const allValues = allSeries.flatMap(s => s.map(p => p[1]));
  const minVal = allValues.length ? Math.min(...allValues) : 0;
  const maxVal = allValues.length ? Math.max(...allValues) : 1;
  const valRange = maxVal - minVal || 1;

  const maxLen = allSeries.reduce((m, s) => Math.max(m, s.length), 0);
  const timestamps = allSeries.length > 0 ? allSeries.reduce((best, s) => s.length > best.length ? s : best, []).map(p => p[0]) : [];

  const toX = (i: number) => PAD.left + (i / Math.max(maxLen - 1, 1)) * plotW;
  const toY = (v: number) => PAD.top + plotH - ((v - minVal) / valRange) * plotH;

  const buildPath = (series: [number, number][]) => {
    return series.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(p[1]).toFixed(1)}`).join(' ');
  };

  // Overlays for the first coin only when Price is selected
  const firstPrices = allSeries[0]?.map(p => p[1]) ?? [];
  const smaData = showSma && dataType === 'Price' ? sma(firstPrices, 20) : [];
  const bbData = showBollinger && dataType === 'Price' ? bollingerBands(firstPrices) : null;

  const firstSeriesLen = allSeries[0]?.length ?? 0;
  const toXOverlay = (i: number) => PAD.left + (i / Math.max(firstSeriesLen - 1, 1)) * plotW;
  const buildOverlayPath = (vals: (number | null)[]) =>
    vals.map((v, i) => v !== null ? `${i === 0 || vals[i - 1] === null ? 'M' : 'L'}${toXOverlay(i).toFixed(1)},${toY(v).toFixed(1)}` : '').filter(Boolean).join(' ');

  // Table data
  const tableRows: { date: string; values: { price: number; volume: number; change: number | null }[] }[] = [];
  if (allSeries.length > 0) {
    for (let i = 0; i < maxLen; i++) {
      const ts = timestamps[i];
      if (!ts) continue;
      const date = new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const values = chartData.map((ds) => {
        const prices = ds.data.prices;
        const volumes = ds.data.total_volumes;
        const price = prices[i]?.[1] ?? 0;
        const volume = volumes[i]?.[1] ?? 0;
        const prev = prices[i - 1]?.[1];
        const change = prev ? ((price - prev) / prev) * 100 : null;
        return { price, volume, change };
      });
      tableRows.push({ date, values });
    }
  }

  const handleExport = () => {
    const headers = ['Date'];
    coins.forEach(c => { headers.push(`${c.symbol.toUpperCase()} Price`, `${c.symbol.toUpperCase()} Volume`, `${c.symbol.toUpperCase()} Change%`); });
    const rows = tableRows.map(r => {
      const row: (string | number | null)[] = [r.date];
      r.values.forEach(v => { row.push(v.price, v.volume, v.change); });
      return row;
    });
    downloadCsv('datalab-export.csv', headers, rows);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || maxLen === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const idx = Math.round(((x - PAD.left) / plotW) * (maxLen - 1));
    setHoverIdx(Math.max(0, Math.min(maxLen - 1, idx)));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Data Lab</h1>
          <p className="text-gray-400 text-sm mt-1">Interactive multi-coin data exploration</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} disabled={chartData.length === 0} className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 rounded-lg text-sm transition">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={clearAll} className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition text-red-400">
            <Trash2 className="w-4 h-4" /> Clear All
          </button>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">{error}</div>}

      {/* Coin Selector */}
      <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {coins.map((c, i) => (
            <span key={c.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium" style={{ backgroundColor: COIN_COLORS[i] + '22', color: COIN_COLORS[i], border: `1px solid ${COIN_COLORS[i]}44` }}>
              {c.symbol.toUpperCase()}
              <button onClick={() => removeCoin(c.id)} className="hover:opacity-70"><X className="w-3.5 h-3.5" /></button>
            </span>
          ))}
          {coins.length < 3 && (
            <div className="relative">
              <div className="flex items-center bg-gray-700/50 rounded-lg px-3 py-1.5 gap-2">
                <Search className="w-4 h-4 text-gray-400" />
                <input value={query} onChange={e => handleSearch(e.target.value)} onFocus={() => suggestions.length > 0 && setShowSuggestions(true)} placeholder="Add coin..." className="bg-transparent text-sm outline-none w-32 placeholder-gray-500" />
              </div>
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full mt-1 left-0 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto">
                  {suggestions.map(s => (
                    <button key={s.id} onClick={() => addCoin(s)} className="w-full text-left px-3 py-2 hover:bg-gray-700/60 text-sm flex justify-between items-center">
                      <span>{s.name}</span>
                      <span className="text-gray-500 text-xs">{s.symbol.toUpperCase()}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-gray-700/40 rounded-lg p-0.5">
            {DATA_TYPES.map(dt => (
              <button key={dt} onClick={() => setDataType(dt)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${dataType === dt ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-white'}`}>{dt}</button>
            ))}
          </div>
          <div className="flex bg-gray-700/40 rounded-lg p-0.5">
            {TIMEFRAMES.map(tf => (
              <button key={tf.days} onClick={() => setTimeframe(tf.days)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${timeframe === tf.days ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-white'}`}>{tf.label}</button>
            ))}
          </div>
          {dataType === 'Price' && (
            <div className="flex gap-3">
              <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
                <input type="checkbox" checked={showSma} onChange={e => setShowSma(e.target.checked)} className="accent-emerald-500" />
                SMA(20)
              </label>
              <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
                <input type="checkbox" checked={showBollinger} onChange={e => setShowBollinger(e.target.checked)} className="accent-emerald-500" />
                Bollinger
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
        {loading ? (
          <div className="flex items-center justify-center h-80 text-gray-500">Loading chart data...</div>
        ) : chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-80 text-gray-500">
            <BarChart3 className="w-12 h-12 mb-3 opacity-30" />
            <p>Add coins above to begin exploring</p>
          </div>
        ) : (
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseMove={handleMouseMove} onMouseLeave={() => setHoverIdx(null)}>
            {/* Y-axis grid */}
            {[0, 0.25, 0.5, 0.75, 1].map(frac => {
              const y = PAD.top + plotH * (1 - frac);
              const val = minVal + valRange * frac;
              return (
                <g key={frac}>
                  <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#374151" strokeWidth={0.5} />
                  <text x={PAD.left - 8} y={y + 4} textAnchor="end" className="fill-gray-500" fontSize={10}>
                    {dataType === 'Price' ? `$${formatNumber(val)}` : formatCompact(val)}
                  </text>
                </g>
              );
            })}
            {/* X-axis labels */}
            {[0, 0.25, 0.5, 0.75, 1].map(frac => {
              const idx = Math.round(frac * (maxLen - 1));
              const ts = timestamps[idx];
              if (!ts) return null;
              const label = new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              return <text key={frac} x={toX(idx)} y={H - 5} textAnchor="middle" className="fill-gray-500" fontSize={10}>{label}</text>;
            })}

            {/* Bollinger bands fill */}
            {bbData && bbData.upper.some(v => v !== null) && (
              <path
                d={
                  bbData.upper.map((v, i) => v !== null ? `${i === 0 || bbData.upper[i - 1] === null ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}` : '').filter(Boolean).join(' ') + ' ' +
                  [...bbData.lower].reverse().map((v, i) => { const ri = bbData.lower.length - 1 - i; return v !== null ? `L${toX(ri).toFixed(1)},${toY(v).toFixed(1)}` : ''; }).filter(Boolean).join(' ') + ' Z'
                }
                fill={COIN_COLORS[0]} fillOpacity={0.06} stroke="none"
              />
            )}
            {/* Bollinger lines */}
            {bbData && <><path d={buildOverlayPath(bbData.upper)} fill="none" stroke={COIN_COLORS[0]} strokeWidth={0.8} strokeDasharray="3,3" opacity={0.5} /><path d={buildOverlayPath(bbData.lower)} fill="none" stroke={COIN_COLORS[0]} strokeWidth={0.8} strokeDasharray="3,3" opacity={0.5} /></>}
            {/* SMA line */}
            {smaData.length > 0 && <path d={buildOverlayPath(smaData)} fill="none" stroke="#ef4444" strokeWidth={1.2} strokeDasharray="4,2" />}

            {/* Coin lines */}
            {allSeries.map((series, ci) => (
              <path key={chartData[ci].coinId} d={buildPath(series)} fill="none" stroke={COIN_COLORS[ci]} strokeWidth={1.8} />
            ))}

            {/* Crosshair */}
            {hoverIdx !== null && (
              <>
                <line x1={toX(hoverIdx)} y1={PAD.top} x2={toX(hoverIdx)} y2={PAD.top + plotH} stroke="#6b7280" strokeWidth={0.8} strokeDasharray="3,3" />
                {allSeries.map((series, ci) => {
                  const pt = series[hoverIdx];
                  if (!pt) return null;
                  return <circle key={ci} cx={toX(hoverIdx)} cy={toY(pt[1])} r={4} fill={COIN_COLORS[ci]} stroke="#111827" strokeWidth={2} />;
                })}
                {/* Tooltip */}
                <foreignObject x={Math.min(toX(hoverIdx) + 10, W - 170)} y={PAD.top} width={160} height={20 + allSeries.length * 22}>
                  <div className="bg-gray-900/95 border border-gray-700 rounded-lg p-2 text-xs">
                    <div className="text-gray-400 mb-1">{timestamps[hoverIdx] ? new Date(timestamps[hoverIdx]).toLocaleDateString() : ''}</div>
                    {allSeries.map((series, ci) => {
                      const pt = series[hoverIdx];
                      return pt ? (
                        <div key={ci} className="flex justify-between gap-3" style={{ color: COIN_COLORS[ci] }}>
                          <span>{coins[ci]?.symbol.toUpperCase()}</span>
                          <span>{dataType === 'Price' ? `$${formatNumber(pt[1])}` : formatCompact(pt[1])}</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </foreignObject>
              </>
            )}
          </svg>
        )}
      </div>

      {/* Data Table */}
      {tableRows.length > 0 && (
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700/50">
            <h2 className="text-sm font-medium text-gray-300">Data Table</h2>
          </div>
          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-800">
                <tr className="text-left text-gray-400 text-xs">
                  <th className="px-4 py-2">Date</th>
                  {coins.map((c, i) => (
                    <th key={c.id} className="px-3 py-2" colSpan={3}>
                      <span style={{ color: COIN_COLORS[i] }}>{c.symbol.toUpperCase()}</span>
                      <span className="text-gray-600 ml-2 font-normal">Price / Volume / Chg%</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.slice().reverse().slice(0, 60).map((row, ri) => (
                  <tr key={ri} className="border-t border-gray-700/30 hover:bg-gray-700/20">
                    <td className="px-4 py-1.5 text-gray-300 whitespace-nowrap">{row.date}</td>
                    {row.values.map((v, ci) => (
                      <td key={ci} className="px-3 py-1.5 whitespace-nowrap" colSpan={3}>
                        <span className="text-gray-200">${formatNumber(v.price)}</span>
                        <span className="text-gray-500 mx-2">{formatCompact(v.volume)}</span>
                        <span className={v.change !== null ? (v.change >= 0 ? 'text-green-400' : 'text-red-400') : 'text-gray-600'}>{v.change !== null ? formatPercent(v.change) : '-'}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
