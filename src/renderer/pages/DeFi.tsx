import { useState, useEffect } from 'react';
import { Landmark, ArrowUpDown, Download } from 'lucide-react';
import { getMarkets } from '../hooks/useElectron';
import type { CoinMarket } from '../types';
import { formatCompact, formatPercent, downloadCsv } from '../utils/export';

const DEFI_IDS = ['uniswap', 'aave', 'chainlink', 'maker', 'compound-governance-token', 'curve-dao-token',
  'sushi', 'pancakeswap-token', '1inch', 'yearn-finance', 'lido-dao', 'rocket-pool', 'convex-finance',
  'balancer', 'the-graph', 'synthetix-network-token', 'ens', 'ribbon-finance', 'dydx-chain', 'gmx'];

export default function DeFi() {
  const [allMarkets, setAllMarkets] = useState<CoinMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'market_cap' | 'price_change_percentage_24h' | 'total_volume'>('market_cap');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    (async () => {
      try {
        const m = await getMarkets('usd', 1, 250);
        setAllMarkets(m);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const defiCoins = allMarkets.filter(m => DEFI_IDS.includes(m.id));
  const totalDefiMcap = defiCoins.reduce((s, c) => s + (c.market_cap ?? 0), 0);
  const totalMcap = allMarkets.reduce((s, c) => s + (c.market_cap ?? 0), 0);
  const defiPct = totalMcap > 0 ? (totalDefiMcap / totalMcap) * 100 : 0;
  const avgChange = defiCoins.length > 0 ? defiCoins.reduce((s, c) => s + (c.price_change_percentage_24h ?? 0), 0) / defiCoins.length : 0;
  const topDefi = [...defiCoins].sort((a, b) => (b.market_cap ?? 0) - (a.market_cap ?? 0))[0];

  const sorted = [...defiCoins].sort((a, b) => {
    const av = a[sortBy] ?? 0, bv = b[sortBy] ?? 0;
    return sortDir === 'desc' ? (bv as number) - (av as number) : (av as number) - (bv as number);
  });

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  const exportCsv = () => {
    downloadCsv('defi-protocols.csv',
      ['Rank', 'Protocol', 'Symbol', 'Price', 'Market Cap', '24h Change', 'Volume'],
      sorted.map((c, i) => [i + 1, c.name, c.symbol.toUpperCase(), c.current_price, c.market_cap, c.price_change_percentage_24h, c.total_volume]));
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading DeFi data...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Landmark className="w-6 h-6 text-emerald-400" />
          <h1 className="text-2xl font-bold">DeFi Overview</h1>
        </div>
        <button type="button" onClick={exportCsv} className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg text-sm text-gray-300 hover:text-white transition">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
          <div className="text-sm text-gray-400">DeFi Market Cap</div>
          <div className="text-xl font-bold mt-1">{formatCompact(totalDefiMcap)}</div>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
          <div className="text-sm text-gray-400">DeFi / Total Market</div>
          <div className="text-xl font-bold mt-1">{defiPct.toFixed(2)}%</div>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
          <div className="text-sm text-gray-400">Top Protocol</div>
          <div className="text-xl font-bold mt-1">{topDefi?.name ?? 'N/A'}</div>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
          <div className="text-sm text-gray-400">Avg 24h Change</div>
          <div className={`text-xl font-bold mt-1 ${avgChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatPercent(avgChange)}</div>
        </div>
      </div>

      {/* DeFi Table */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700/50 text-gray-400">
              <th className="text-left px-4 py-3 font-medium">#</th>
              <th className="text-left px-4 py-3 font-medium">Protocol</th>
              <th className="text-right px-4 py-3 font-medium">Price</th>
              <th className="text-right px-4 py-3 font-medium cursor-pointer hover:text-white" onClick={() => toggleSort('market_cap')}>
                <span className="inline-flex items-center gap-1">Market Cap <ArrowUpDown className="w-3 h-3" /></span>
              </th>
              <th className="text-right px-4 py-3 font-medium cursor-pointer hover:text-white" onClick={() => toggleSort('price_change_percentage_24h')}>
                <span className="inline-flex items-center gap-1">24h % <ArrowUpDown className="w-3 h-3" /></span>
              </th>
              <th className="text-right px-4 py-3 font-medium cursor-pointer hover:text-white" onClick={() => toggleSort('total_volume')}>
                <span className="inline-flex items-center gap-1">Volume <ArrowUpDown className="w-3 h-3" /></span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c, i) => (
              <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-700/20 transition">
                <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {c.image && <img src={c.image} className="w-5 h-5 rounded-full" alt="" />}
                    <span className="font-medium">{c.name}</span>
                    <span className="text-gray-500">{c.symbol.toUpperCase()}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">${c.current_price?.toLocaleString() ?? '-'}</td>
                <td className="px-4 py-3 text-right">{formatCompact(c.market_cap)}</td>
                <td className={`px-4 py-3 text-right ${(c.price_change_percentage_24h ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatPercent(c.price_change_percentage_24h)}
                </td>
                <td className="px-4 py-3 text-right">{formatCompact(c.total_volume)}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No DeFi protocols found in market data</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
