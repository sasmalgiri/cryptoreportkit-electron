import { useState, useEffect, useMemo, useRef } from 'react';
import { LayoutGrid, Loader2, AlertCircle, TrendingUp, BarChart3 } from 'lucide-react';
import { getMarkets } from '../hooks/useElectron';
import { formatCompact, formatPercent, formatNumber } from '../utils/export';
import type { CoinMarket } from '../types';

type SizeMode = 'market_cap' | 'total_volume';
type ColorMode = '24h' | '7d';

interface TreemapCell {
  coin: CoinMarket;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Squarified treemap algorithm — lays items into rows within a bounding rectangle. */
function squarify(
  items: { coin: CoinMarket; value: number }[],
  x: number,
  y: number,
  w: number,
  h: number,
): TreemapCell[] {
  if (items.length === 0) return [];
  if (items.length === 1) {
    return [{ coin: items[0].coin, x, y, w, h }];
  }

  const total = items.reduce((s, i) => s + i.value, 0);
  if (total <= 0) return [];

  const cells: TreemapCell[] = [];
  let remaining = [...items];
  let cx = x,
    cy = y,
    cw = w,
    ch = h;

  while (remaining.length > 0) {
    const isHoriz = cw >= ch;
    const side = isHoriz ? ch : cw;
    const remTotal = remaining.reduce((s, i) => s + i.value, 0);

    // Find how many items go in this row to get best aspect ratio
    let rowItems: typeof remaining = [];
    let rowSum = 0;
    let bestWorst = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      rowItems.push(remaining[i]);
      rowSum += remaining[i].value;

      const rowFrac = rowSum / remTotal;
      const rowLen = isHoriz ? cw * rowFrac : ch * rowFrac;

      // Calculate worst aspect ratio in this row
      let worstRatio = 0;
      for (const ri of rowItems) {
        const frac = ri.value / rowSum;
        const itemLen = side * frac;
        const ratio = Math.max(rowLen / itemLen, itemLen / rowLen);
        if (ratio > worstRatio) worstRatio = ratio;
      }

      if (worstRatio > bestWorst && rowItems.length > 1) {
        // Adding this item made it worse — rollback
        rowItems.pop();
        rowSum -= remaining[i].value;
        break;
      }
      bestWorst = worstRatio;
    }

    if (rowItems.length === 0) break;

    // Lay out the row
    const rowTotal = rowItems.reduce((s, i) => s + i.value, 0);
    const rowFrac = rowTotal / remTotal;

    if (isHoriz) {
      const rowW = cw * rowFrac;
      let ry = cy;
      for (const ri of rowItems) {
        const itemH = ch * (ri.value / rowTotal);
        cells.push({ coin: ri.coin, x: cx, y: ry, w: rowW, h: itemH });
        ry += itemH;
      }
      cx += rowW;
      cw -= rowW;
    } else {
      const rowH = ch * rowFrac;
      let rx = cx;
      for (const ri of rowItems) {
        const itemW = cw * (ri.value / rowTotal);
        cells.push({ coin: ri.coin, x: rx, y: cy, w: itemW, h: rowH });
        rx += itemW;
      }
      cy += rowH;
      ch -= rowH;
    }

    remaining = remaining.slice(rowItems.length);
  }

  return cells;
}

function changeColor(change: number | null): string {
  if (change == null) return 'rgba(75,85,99,0.6)';
  const clamped = Math.max(-15, Math.min(15, change));
  const intensity = Math.abs(clamped) / 15;
  if (clamped >= 0) {
    const r = Math.round(17 * (1 - intensity) + 16 * intensity);
    const g = Math.round(24 * (1 - intensity) + 185 * intensity);
    const b = Math.round(39 * (1 - intensity) + 129 * intensity);
    return `rgba(${r},${g},${b},0.85)`;
  } else {
    const r = Math.round(17 * (1 - intensity) + 239 * intensity);
    const g = Math.round(24 * (1 - intensity) + 68 * intensity);
    const b = Math.round(39 * (1 - intensity) + 68 * intensity);
    return `rgba(${r},${g},${b},0.85)`;
  }
}

export default function Heatmap() {
  const [coins, setCoins] = useState<CoinMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sizeMode, setSizeMode] = useState<SizeMode>('market_cap');
  const [colorMode, setColorMode] = useState<ColorMode>('24h');
  const [tooltip, setTooltip] = useState<{ coin: CoinMarket; x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 900, h: 600 });

  useEffect(() => {
    setLoading(true);
    getMarkets('usd', 1, 100)
      .then((data) => setCoins(data))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDims({ w: entry.contentRect.width, h: Math.max(400, entry.contentRect.height) });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const totalMcap = useMemo(
    () => coins.reduce((s, c) => s + (c.market_cap ?? 0), 0),
    [coins],
  );

  const totalChange = useMemo(() => {
    if (coins.length === 0) return 0;
    const weighted = coins.reduce((s, c) => {
      const w = (c.market_cap ?? 0) / (totalMcap || 1);
      return s + w * (c.price_change_percentage_24h ?? 0);
    }, 0);
    return weighted;
  }, [coins, totalMcap]);

  const cells = useMemo(() => {
    const items = coins
      .filter((c) => {
        const v = sizeMode === 'market_cap' ? c.market_cap : c.total_volume;
        return v != null && v > 0;
      })
      .map((c) => ({
        coin: c,
        value: (sizeMode === 'market_cap' ? c.market_cap : c.total_volume) ?? 0,
      }))
      .sort((a, b) => b.value - a.value);

    return squarify(items, 0, 0, dims.w, dims.h);
  }, [coins, sizeMode, dims]);

  function getChange(c: CoinMarket): number | null {
    return colorMode === '24h'
      ? c.price_change_percentage_24h
      : c.price_change_percentage_7d_in_currency;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <LayoutGrid className="w-6 h-6 text-emerald-400" />
            Market Heatmap
          </h1>
          <p className="text-gray-400 text-sm mt-1">Top 100 coins by {sizeMode === 'market_cap' ? 'market cap' : 'volume'}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Size toggle */}
          <div className="bg-gray-800 border border-gray-700/50 rounded-lg p-0.5 flex text-xs">
            <button
              onClick={() => setSizeMode('market_cap')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                sizeMode === 'market_cap'
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 inline mr-1" />
              Market Cap
            </button>
            <button
              onClick={() => setSizeMode('total_volume')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                sizeMode === 'total_volume'
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 inline mr-1" />
              Volume
            </button>
          </div>
          {/* Color toggle */}
          <div className="bg-gray-800 border border-gray-700/50 rounded-lg p-0.5 flex text-xs">
            <button
              onClick={() => setColorMode('24h')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                colorMode === '24h'
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              24h Change
            </button>
            <button
              onClick={() => setColorMode('7d')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                colorMode === '7d'
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              7d Change
            </button>
          </div>
        </div>
      </div>

      {/* Top bar */}
      <div className="flex items-center gap-6 bg-gray-800/60 border border-gray-700/50 rounded-xl px-5 py-3">
        <div>
          <span className="text-gray-400 text-xs">Total Market Cap</span>
          <div className="text-white font-semibold">{formatCompact(totalMcap)}</div>
        </div>
        <div>
          <span className="text-gray-400 text-xs">24h Change</span>
          <div className={`font-semibold ${totalChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatPercent(totalChange)}
          </div>
        </div>
        {/* Legend */}
        <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
          <span>-15%</span>
          <div className="flex h-3 rounded overflow-hidden">
            {Array.from({ length: 11 }, (_, i) => {
              const v = -15 + i * 3;
              return (
                <div
                  key={i}
                  className="w-5 h-full"
                  style={{ backgroundColor: changeColor(v) }}
                />
              );
            })}
          </div>
          <span>+15%</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Treemap */}
      <div
        ref={containerRef}
        className="bg-gray-800/40 border border-gray-700/50 rounded-xl overflow-hidden relative"
        style={{ height: 600 }}
        onMouseLeave={() => setTooltip(null)}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-3" />
            Loading market data...
          </div>
        ) : (
          <svg width={dims.w} height={dims.h} className="block">
            {cells.map((cell) => {
              const ch = getChange(cell.coin);
              const showLabel = cell.w > 40 && cell.h > 30;
              const showPrice = cell.w > 60 && cell.h > 50;
              return (
                <g
                  key={cell.coin.id}
                  onMouseEnter={(e) =>
                    setTooltip({ coin: cell.coin, x: e.clientX, y: e.clientY })
                  }
                  onMouseMove={(e) =>
                    setTooltip({ coin: cell.coin, x: e.clientX, y: e.clientY })
                  }
                  onMouseLeave={() => setTooltip(null)}
                  className="cursor-pointer"
                >
                  <rect
                    x={cell.x + 1}
                    y={cell.y + 1}
                    width={Math.max(0, cell.w - 2)}
                    height={Math.max(0, cell.h - 2)}
                    rx={3}
                    fill={changeColor(ch)}
                    stroke="rgba(17,24,39,0.8)"
                    strokeWidth={1}
                  />
                  {showLabel && (
                    <text
                      x={cell.x + cell.w / 2}
                      y={cell.y + cell.h / 2 - (showPrice ? 6 : 0)}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-white font-bold pointer-events-none"
                      fontSize={Math.min(14, cell.w / 5)}
                    >
                      {cell.coin.symbol.toUpperCase()}
                    </text>
                  )}
                  {showPrice && (
                    <text
                      x={cell.x + cell.w / 2}
                      y={cell.y + cell.h / 2 + 10}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-white/70 pointer-events-none"
                      fontSize={Math.min(11, cell.w / 7)}
                    >
                      {ch != null ? `${ch >= 0 ? '+' : ''}${ch.toFixed(1)}%` : ''}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}

        {/* Tooltip */}
        {tooltip && (
          <div
            className="fixed z-50 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm shadow-xl pointer-events-none"
            style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
          >
            <div className="flex items-center gap-2 mb-2">
              {tooltip.coin.image && (
                <img src={tooltip.coin.image} alt="" className="w-5 h-5 rounded-full" />
              )}
              <span className="text-white font-semibold">{tooltip.coin.name}</span>
              <span className="text-gray-500 text-xs uppercase">{tooltip.coin.symbol}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <span className="text-gray-400">Price</span>
              <span className="text-white text-right">${formatNumber(tooltip.coin.current_price)}</span>
              <span className="text-gray-400">24h</span>
              <span
                className={`text-right ${
                  (tooltip.coin.price_change_percentage_24h ?? 0) >= 0
                    ? 'text-emerald-400'
                    : 'text-red-400'
                }`}
              >
                {formatPercent(tooltip.coin.price_change_percentage_24h)}
              </span>
              <span className="text-gray-400">Market Cap</span>
              <span className="text-white text-right">{formatCompact(tooltip.coin.market_cap)}</span>
              <span className="text-gray-400">Volume</span>
              <span className="text-white text-right">{formatCompact(tooltip.coin.total_volume)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
