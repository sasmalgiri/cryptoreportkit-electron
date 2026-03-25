import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  GitCompareArrows,
  Download,
  Loader2,
  AlertCircle,
  Square,
  CheckSquare,
} from 'lucide-react';
import { getMarkets, getCoinMarketChart } from '../hooks/useElectron';
import { correlation } from '../utils/indicators';
import { downloadCsv } from '../utils/export';
import type { CoinMarket } from '../types';

type Period = 30 | 90 | 180 | 365;

const PERIODS: { label: string; value: Period }[] = [
  { label: '30D', value: 30 },
  { label: '90D', value: 90 },
  { label: '180D', value: 180 },
  { label: '365D', value: 365 },
];

function corrColor(v: number): string {
  // deep red (-1) -> white (0) -> deep green (+1)
  if (v >= 0) {
    const t = Math.min(1, v);
    const r = Math.round(255 * (1 - t) + 16 * t);
    const g = Math.round(255 * (1 - t) + 185 * t);
    const b = Math.round(255 * (1 - t) + 129 * t);
    return `rgb(${r},${g},${b})`;
  } else {
    const t = Math.min(1, Math.abs(v));
    const r = Math.round(255 * (1 - t) + 239 * t);
    const g = Math.round(255 * (1 - t) + 68 * t);
    const b = Math.round(255 * (1 - t) + 68 * t);
    return `rgb(${r},${g},${b})`;
  }
}

function textColor(v: number): string {
  return Math.abs(v) > 0.5 ? 'white' : '#111827';
}

export default function Correlation() {
  const [topCoins, setTopCoins] = useState<CoinMarket[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [period, setPeriod] = useState<Period>(90);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priceData, setPriceData] = useState<Record<string, number[]>>({});

  // Fetch top 20 coins for selection
  useEffect(() => {
    setLoading(true);
    getMarkets('usd', 1, 20)
      .then((data) => {
        setTopCoins(data);
        // Default select first 6
        setSelected(data.slice(0, 6).map((c) => c.id));
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  // Fetch price histories for selected coins
  useEffect(() => {
    if (selected.length < 2) return;

    setCalculating(true);
    setError(null);

    const fetches = selected.map((coinId) =>
      getCoinMarketChart(coinId, 'usd', period).then((data) => ({
        id: coinId,
        prices: data.prices.map(([, p]) => p),
      })),
    );

    Promise.allSettled(fetches)
      .then((results) => {
        const map: Record<string, number[]> = {};
        for (const r of results) {
          if (r.status === 'fulfilled') map[r.value.id] = r.value.prices;
        }
        if (Object.keys(map).length === 0) setError('Failed to fetch price data');
        setPriceData(map);
      })
      .finally(() => setCalculating(false));
  }, [selected, period]);

  // Compute correlation matrix
  const matrix = useMemo(() => {
    if (selected.length < 2) return [];
    const result: number[][] = [];
    for (let i = 0; i < selected.length; i++) {
      const row: number[] = [];
      for (let j = 0; j < selected.length; j++) {
        if (i === j) {
          row.push(1);
        } else {
          const a = priceData[selected[i]];
          const b = priceData[selected[j]];
          if (a && b) {
            row.push(correlation(a, b));
          } else {
            row.push(0);
          }
        }
      }
      result.push(row);
    }
    return result;
  }, [selected, priceData]);

  const coinMap = useMemo(() => {
    const m: Record<string, CoinMarket> = {};
    for (const c of topCoins) m[c.id] = c;
    return m;
  }, [topCoins]);

  const toggleCoin = useCallback(
    (id: string) => {
      setSelected((prev) => {
        if (prev.includes(id)) {
          return prev.length > 2 ? prev.filter((x) => x !== id) : prev;
        }
        return prev.length < 10 ? [...prev, id] : prev;
      });
    },
    [],
  );

  function handleExport() {
    const labels = selected.map((id) => coinMap[id]?.symbol.toUpperCase() ?? id);
    const headers = ['', ...labels];
    const rows = selected.map((_id, i) => [
      labels[i],
      ...matrix[i].map((v) => v.toFixed(4)),
    ]);
    downloadCsv(`correlation_${period}d.csv`, headers, rows);
  }

  const [hoverCell, setHoverCell] = useState<{ i: number; j: number } | null>(null);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <GitCompareArrows className="w-6 h-6 text-emerald-400" />
            Correlation Matrix
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Analyze price correlation between cryptocurrencies
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period selector */}
          <div className="bg-gray-800 border border-gray-700/50 rounded-lg p-0.5 flex text-xs">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  period === p.value
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleExport}
            disabled={matrix.length === 0 || loading}
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

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
        {/* Coin selector */}
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">
            Select Coins ({selected.length}/10)
          </h3>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading...
            </div>
          ) : (
            <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
              {topCoins.map((coin) => {
                const isSelected = selected.includes(coin.id);
                const disabled = !isSelected && selected.length >= 10;
                return (
                  <button
                    key={coin.id}
                    onClick={() => toggleCoin(coin.id)}
                    disabled={disabled}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                      isSelected
                        ? 'bg-emerald-500/10 border border-emerald-500/30'
                        : disabled
                          ? 'opacity-30 cursor-not-allowed border border-transparent'
                          : 'border border-transparent hover:bg-gray-700/40'
                    }`}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    )}
                    {coin.image && (
                      <img src={coin.image} alt="" className="w-5 h-5 rounded-full flex-shrink-0" />
                    )}
                    <span className="text-white truncate">{coin.name}</span>
                    <span className="text-gray-500 text-xs uppercase ml-auto flex-shrink-0">
                      {coin.symbol}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          {selected.length < 2 && (
            <p className="text-yellow-400/80 text-xs mt-3">Select at least 2 coins</p>
          )}
        </div>

        {/* Matrix */}
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4 overflow-x-auto">
          {calculating ? (
            <div className="flex items-center justify-center py-20 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mr-3" />
              Fetching price history and computing correlations...
            </div>
          ) : matrix.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-gray-500">
              Select at least 2 coins to see the correlation matrix
            </div>
          ) : (
            <>
              <div className="inline-block min-w-fit">
                <table className="border-separate" style={{ borderSpacing: 2 }}>
                  <thead>
                    <tr>
                      <th className="w-16"></th>
                      {selected.map((id) => {
                        const c = coinMap[id];
                        return (
                          <th key={id} className="px-1 py-2 text-center">
                            <div className="flex flex-col items-center gap-1">
                              {c?.image && (
                                <img src={c.image} alt="" className="w-5 h-5 rounded-full" />
                              )}
                              <span className="text-gray-300 text-xs font-medium uppercase">
                                {c?.symbol ?? id}
                              </span>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {selected.map((rowId, i) => {
                      const rowCoin = coinMap[rowId];
                      return (
                        <tr key={rowId}>
                          <td className="pr-2 py-1">
                            <div className="flex items-center gap-1.5">
                              {rowCoin?.image && (
                                <img
                                  src={rowCoin.image}
                                  alt=""
                                  className="w-4 h-4 rounded-full"
                                />
                              )}
                              <span className="text-gray-300 text-xs font-medium uppercase">
                                {rowCoin?.symbol ?? rowId}
                              </span>
                            </div>
                          </td>
                          {matrix[i].map((val, j) => {
                            const isHovered =
                              hoverCell?.i === i || hoverCell?.j === j;
                            const isCurrent =
                              hoverCell?.i === i && hoverCell?.j === j;
                            return (
                              <td
                                key={j}
                                className="text-center transition-all"
                                style={{
                                  width: 56,
                                  height: 44,
                                  minWidth: 56,
                                }}
                                onMouseEnter={() => setHoverCell({ i, j })}
                                onMouseLeave={() => setHoverCell(null)}
                              >
                                <div
                                  className={`w-full h-full flex items-center justify-center rounded-md text-xs font-mono font-semibold transition-all ${
                                    isCurrent ? 'ring-2 ring-white/50 scale-110 z-10' : ''
                                  } ${isHovered && !isCurrent ? 'brightness-110' : ''}`}
                                  style={{
                                    backgroundColor: corrColor(val),
                                    color: textColor(val),
                                  }}
                                >
                                  {val.toFixed(2)}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 mt-5 text-xs text-gray-400">
                <span>-1.00</span>
                <div className="flex h-4 rounded overflow-hidden flex-1 max-w-xs">
                  {Array.from({ length: 21 }, (_, i) => {
                    const v = -1 + i * 0.1;
                    return (
                      <div
                        key={i}
                        className="flex-1 h-full"
                        style={{ backgroundColor: corrColor(v) }}
                      />
                    );
                  })}
                </div>
                <span>+1.00</span>
                <div className="ml-4 flex items-center gap-4 text-gray-500">
                  <span>
                    <span className="inline-block w-3 h-3 rounded mr-1" style={{ backgroundColor: corrColor(-1) }} />
                    Negative
                  </span>
                  <span>
                    <span className="inline-block w-3 h-3 rounded mr-1" style={{ backgroundColor: corrColor(0) }} />
                    Neutral
                  </span>
                  <span>
                    <span className="inline-block w-3 h-3 rounded mr-1" style={{ backgroundColor: corrColor(1) }} />
                    Positive
                  </span>
                </div>
              </div>

              {/* Hover detail */}
              {hoverCell && (
                <div className="mt-3 bg-gray-900/60 border border-gray-700/50 rounded-lg px-4 py-2 text-sm inline-flex items-center gap-2">
                  <span className="text-gray-400">
                    {coinMap[selected[hoverCell.i]]?.symbol?.toUpperCase()} vs{' '}
                    {coinMap[selected[hoverCell.j]]?.symbol?.toUpperCase()}:
                  </span>
                  <span
                    className="font-mono font-bold"
                    style={{ color: corrColor(matrix[hoverCell.i][hoverCell.j]) }}
                  >
                    {matrix[hoverCell.i][hoverCell.j].toFixed(4)}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
