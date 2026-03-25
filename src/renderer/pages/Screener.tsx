import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { getMarkets } from '../hooks/useElectron';
import { downloadCsv, formatNumber, formatCompact, formatPercent } from '../utils/export';
import type { CoinMarket } from '../types';

type SortKey =
  | 'market_cap_rank'
  | 'name'
  | 'current_price'
  | 'price_change_percentage_24h'
  | 'price_change_percentage_7d_in_currency'
  | 'market_cap'
  | 'total_volume'
  | 'circulating_supply';

type SortDir = 'asc' | 'desc';
type ChangeFilter = 'all' | 'gainers' | 'losers';

const MCAP_OPTIONS = [
  { label: 'Any', value: 0 },
  { label: '> $1B', value: 1e9 },
  { label: '> $100M', value: 1e8 },
  { label: '> $10M', value: 1e7 },
  { label: '> $1M', value: 1e6 },
];

const PER_PAGE = 50;

export default function Screener() {
  const [coins, setCoins] = useState<CoinMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minMcap, setMinMcap] = useState(0);
  const [maxMcap, setMaxMcap] = useState(0);
  const [changeFilter, setChangeFilter] = useState<ChangeFilter>('all');

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>('market_cap_rank');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Pagination
  const [page, setPage] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    // Fetch pages 1-3 (250 coins total, API max 250 per call)
    getMarkets('usd', 1, 250)
      .then((data) => setCoins(data))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = [...coins];
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (c) => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q),
      );
    }
    if (minPrice) {
      const v = parseFloat(minPrice);
      if (!isNaN(v)) result = result.filter((c) => (c.current_price ?? 0) >= v);
    }
    if (maxPrice) {
      const v = parseFloat(maxPrice);
      if (!isNaN(v)) result = result.filter((c) => (c.current_price ?? Infinity) <= v);
    }
    if (minMcap > 0) {
      result = result.filter((c) => (c.market_cap ?? 0) >= minMcap);
    }
    if (maxMcap > 0) {
      result = result.filter((c) => (c.market_cap ?? 0) <= maxMcap);
    }
    if (changeFilter === 'gainers') {
      result = result.filter((c) => (c.price_change_percentage_24h ?? 0) > 0);
    } else if (changeFilter === 'losers') {
      result = result.filter((c) => (c.price_change_percentage_24h ?? 0) < 0);
    }
    return result;
  }, [coins, search, minPrice, maxPrice, minMcap, maxMcap, changeFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const pageCoins = sorted.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  useEffect(() => {
    setPage(0);
  }, [search, minPrice, maxPrice, minMcap, maxMcap, changeFilter]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  }

  function SortArrow({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="text-gray-600 ml-1">&#x25B4;</span>;
    return sortDir === 'asc' ? (
      <ChevronUp className="w-3.5 h-3.5 inline ml-0.5 text-emerald-400" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 inline ml-0.5 text-emerald-400" />
    );
  }

  function handleExport() {
    const headers = ['Rank', 'Name', 'Symbol', 'Price', '24h%', '7d%', 'Market Cap', 'Volume', 'Circulating Supply'];
    const rows = sorted.map((c) => [
      c.market_cap_rank,
      c.name,
      c.symbol.toUpperCase(),
      c.current_price,
      c.price_change_percentage_24h != null ? c.price_change_percentage_24h.toFixed(2) : '',
      c.price_change_percentage_7d_in_currency != null ? c.price_change_percentage_7d_in_currency.toFixed(2) : '',
      c.market_cap,
      c.total_volume,
      c.circulating_supply,
    ]);
    downloadCsv('screener_export.csv', headers, rows);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Token Screener</h1>
          <p className="text-gray-400 text-sm mt-1">Filter and sort top 250 cryptocurrencies</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
        <div className="flex items-center gap-2 text-gray-400 text-xs mb-3">
          <Filter className="w-3.5 h-3.5" />
          Filters
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div className="relative col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search name / symbol"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-900/60 border border-gray-700/50 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          {/* Min Price */}
          <input
            type="number"
            placeholder="Min price"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="bg-gray-900/60 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
          />

          {/* Max Price */}
          <input
            type="number"
            placeholder="Max price"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="bg-gray-900/60 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
          />

          {/* Min Market Cap */}
          <select
            value={minMcap}
            onChange={(e) => setMinMcap(Number(e.target.value))}
            className="bg-gray-900/60 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
          >
            {MCAP_OPTIONS.map((o) => (
              <option key={`min-${o.value}`} value={o.value}>
                Min Cap: {o.label}
              </option>
            ))}
          </select>

          {/* Max Market Cap */}
          <select
            value={maxMcap}
            onChange={(e) => setMaxMcap(Number(e.target.value))}
            className="bg-gray-900/60 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
          >
            <option value={0}>Max Cap: Any</option>
            <option value={1e6}>Max Cap: &lt; $1M</option>
            <option value={1e7}>Max Cap: &lt; $10M</option>
            <option value={1e8}>Max Cap: &lt; $100M</option>
            <option value={1e9}>Max Cap: &lt; $1B</option>
          </select>

          {/* 24h Change */}
          <select
            value={changeFilter}
            onChange={(e) => setChangeFilter(e.target.value as ChangeFilter)}
            className="bg-gray-900/60 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
          >
            <option value="all">24h: All</option>
            <option value="gainers">24h: Gainers</option>
            <option value="losers">24h: Losers</option>
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Row count */}
      <div className="flex items-center justify-between text-sm text-gray-400">
        <span>
          Showing {pageCoins.length} of {sorted.length} coins
        </span>
        <span>
          Page {page + 1} of {totalPages}
        </span>
      </div>

      {/* Table */}
      <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-3" />
            Loading market data...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700/50 text-gray-400 text-xs">
                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:text-white select-none"
                    onClick={() => toggleSort('market_cap_rank')}
                  >
                    # <SortArrow col="market_cap_rank" />
                  </th>
                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:text-white select-none"
                    onClick={() => toggleSort('name')}
                  >
                    Coin <SortArrow col="name" />
                  </th>
                  <th
                    className="px-4 py-3 text-right cursor-pointer hover:text-white select-none"
                    onClick={() => toggleSort('current_price')}
                  >
                    Price <SortArrow col="current_price" />
                  </th>
                  <th
                    className="px-4 py-3 text-right cursor-pointer hover:text-white select-none"
                    onClick={() => toggleSort('price_change_percentage_24h')}
                  >
                    24h % <SortArrow col="price_change_percentage_24h" />
                  </th>
                  <th
                    className="px-4 py-3 text-right cursor-pointer hover:text-white select-none"
                    onClick={() => toggleSort('price_change_percentage_7d_in_currency')}
                  >
                    7d % <SortArrow col="price_change_percentage_7d_in_currency" />
                  </th>
                  <th
                    className="px-4 py-3 text-right cursor-pointer hover:text-white select-none"
                    onClick={() => toggleSort('market_cap')}
                  >
                    Market Cap <SortArrow col="market_cap" />
                  </th>
                  <th
                    className="px-4 py-3 text-right cursor-pointer hover:text-white select-none"
                    onClick={() => toggleSort('total_volume')}
                  >
                    Volume <SortArrow col="total_volume" />
                  </th>
                  <th
                    className="px-4 py-3 text-right cursor-pointer hover:text-white select-none"
                    onClick={() => toggleSort('circulating_supply')}
                  >
                    Supply <SortArrow col="circulating_supply" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageCoins.map((c) => {
                  const ch24 = c.price_change_percentage_24h;
                  const ch7d = c.price_change_percentage_7d_in_currency;
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-gray-700/30 hover:bg-gray-700/20 transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-400">{c.market_cap_rank ?? '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {c.image && (
                            <img src={c.image} alt="" className="w-6 h-6 rounded-full" />
                          )}
                          <div>
                            <span className="text-white font-medium">{c.name}</span>
                            <span className="text-gray-500 ml-2 text-xs uppercase">{c.symbol}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-white font-mono">
                        ${formatNumber(c.current_price)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-mono ${
                          (ch24 ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {formatPercent(ch24)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-mono ${
                          (ch7d ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {formatPercent(ch7d)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300">
                        {formatCompact(c.market_cap)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300">
                        {formatCompact(c.total_volume)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300 font-mono">
                        {c.circulating_supply != null
                          ? `${(c.circulating_supply / 1e6).toFixed(1)}M`
                          : '-'}
                      </td>
                    </tr>
                  );
                })}
                {pageCoins.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                      No coins match your filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="p-2 rounded-lg bg-gray-800 border border-gray-700/50 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i)
            .filter((i) => i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 2)
            .map((i, idx, arr) => (
              <span key={i}>
                {idx > 0 && arr[idx - 1] !== i - 1 && (
                  <span className="text-gray-600 px-1">...</span>
                )}
                <button
                  onClick={() => setPage(i)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    i === page
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-800 border border-gray-700/50 text-gray-400 hover:text-white'
                  }`}
                >
                  {i + 1}
                </button>
              </span>
            ))}
          <button
            disabled={page === totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            className="p-2 rounded-lg bg-gray-800 border border-gray-700/50 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
