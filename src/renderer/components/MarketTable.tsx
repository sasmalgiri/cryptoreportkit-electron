import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { CoinMarket } from '../types';

interface MarketTableProps {
  coins: CoinMarket[];
  loading: boolean;
  onCoinClick: (id: string) => void;
}

type SortKey = 'market_cap_rank' | 'current_price' | 'price_change_percentage_24h' | 'market_cap' | 'total_volume';

export function MarketTable({ coins, loading, onCoinClick }: MarketTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('market_cap_rank');
  const [sortAsc, setSortAsc] = useState(true);

  const sorted = [...coins].sort((a, b) => {
    const aVal = a[sortKey] ?? 0;
    const bVal = b[sortKey] ?? 0;
    return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'market_cap_rank');
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col ? (
      sortAsc ? (
        <ChevronUp className="w-3 h-3 inline ml-0.5" />
      ) : (
        <ChevronDown className="w-3 h-3 inline ml-0.5" />
      )
    ) : null;

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-600">
        <div className="inline-block w-5 h-5 border-2 border-gray-700 border-t-emerald-400 rounded-full animate-spin mb-2" />
        <div className="text-xs">Loading market data...</div>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto max-h-[400px]">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-surface/90 backdrop-blur-md z-10">
          <tr className="text-xs text-gray-500 uppercase">
            <th
              className="text-left px-4 py-2.5 cursor-pointer hover:text-white transition"
              onClick={() => handleSort('market_cap_rank')}
            >
              # <SortIcon col="market_cap_rank" />
            </th>
            <th className="text-left px-4 py-2.5">Coin</th>
            <th
              className="text-right px-4 py-2.5 cursor-pointer hover:text-white transition"
              onClick={() => handleSort('current_price')}
            >
              Price <SortIcon col="current_price" />
            </th>
            <th
              className="text-right px-4 py-2.5 cursor-pointer hover:text-white transition"
              onClick={() => handleSort('price_change_percentage_24h')}
            >
              24h % <SortIcon col="price_change_percentage_24h" />
            </th>
            <th
              className="text-right px-4 py-2.5 cursor-pointer hover:text-white transition"
              onClick={() => handleSort('market_cap')}
            >
              Market Cap <SortIcon col="market_cap" />
            </th>
            <th
              className="text-right px-4 py-2.5 cursor-pointer hover:text-white transition"
              onClick={() => handleSort('total_volume')}
            >
              Volume <SortIcon col="total_volume" />
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((coin) => {
            const change = coin.price_change_percentage_24h;
            return (
              <tr
                key={coin.id}
                onClick={() => onCoinClick(coin.id)}
                className="border-t border-white/[0.03] hover:bg-white/[0.03] cursor-pointer transition-colors duration-200"
              >
                <td className="px-4 py-2.5 text-gray-500 text-xs">
                  {coin.market_cap_rank ?? '--'}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    {coin.image && (
                      <img src={coin.image} alt="" className="w-5 h-5 rounded-full" />
                    )}
                    <span className="font-medium text-white text-[13px]">{coin.name}</span>
                    <span className="text-[10px] text-gray-500 uppercase">
                      {coin.symbol}
                    </span>
                  </div>
                </td>
                <td className="text-right px-4 py-2.5 font-mono text-white">
                  {coin.current_price != null
                    ? `$${coin.current_price.toLocaleString()}`
                    : '--'}
                </td>
                <td className="text-right px-4 py-2.5">
                  {change != null ? (
                    <span
                      className={`font-medium font-mono text-xs ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}
                    >
                      {change >= 0 ? '+' : ''}
                      {change.toFixed(2)}%
                    </span>
                  ) : (
                    '--'
                  )}
                </td>
                <td className="text-right px-4 py-2.5 text-gray-400">
                  {coin.market_cap != null
                    ? `$${(coin.market_cap / 1e9).toFixed(1)}B`
                    : '--'}
                </td>
                <td className="text-right px-4 py-2.5 text-gray-400">
                  {coin.total_volume != null
                    ? `$${(coin.total_volume / 1e9).toFixed(1)}B`
                    : '--'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
