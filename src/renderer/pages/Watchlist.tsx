import { useState, useEffect, useCallback } from 'react';
import { Star, Trash2, RefreshCw } from 'lucide-react';
import { getWatchlist, removeFromWatchlist, getMarkets } from '../hooks/useElectron';
import { SearchBar } from '../components/SearchBar';
import { addToWatchlist } from '../hooks/useElectron';
import { useAppStore } from '../stores/appStore';
import type { WatchlistItem, CoinMarket } from '../types';

export default function Watchlist() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [marketData, setMarketData] = useState<Map<string, CoinMarket>>(new Map());
  const [loading, setLoading] = useState(true);
  const currency = useAppStore((s) => s.currency);

  const fetchData = useCallback(async () => {
    try {
      const watchlistItems = await getWatchlist();
      setItems(watchlistItems);

      if (watchlistItems.length > 0) {
        const markets = await getMarkets(currency, 1, 250);
        const map = new Map<string, CoinMarket>();
        markets.forEach((m) => map.set(m.id, m));
        setMarketData(map);
      }
    } catch (err) {
      console.error('Failed to fetch watchlist:', err);
    } finally {
      setLoading(false);
    }
  }, [currency]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRemove = async (coinId: string) => {
    await removeFromWatchlist(coinId);
    setItems((prev) => prev.filter((i) => i.coin_id !== coinId));
  };

  const handleAdd = async (coinId: string, symbol: string, name: string) => {
    await addToWatchlist(coinId, symbol, name);
    await fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Watchlist</h1>
          <p className="text-gray-400 text-sm mt-1">
            Track your favorite coins
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white border border-gray-700 rounded-lg text-sm transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Search to add */}
      <SearchBar
        onSelect={(coin) => handleAdd(coin.id, coin.symbol, coin.name)}
        placeholder="Search to add a coin..."
      />

      {/* Watchlist items */}
      {loading ? (
        <div className="text-center text-gray-500 py-12">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <Star className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">Your watchlist is empty</p>
          <p className="text-gray-600 text-sm">
            Search for a coin above to start tracking
          </p>
        </div>
      ) : (
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b border-gray-700/50">
                <th className="text-left px-4 py-3">Coin</th>
                <th className="text-right px-4 py-3">Price</th>
                <th className="text-right px-4 py-3">24h Change</th>
                <th className="text-right px-4 py-3">Market Cap</th>
                <th className="text-right px-4 py-3">Volume</th>
                <th className="text-right px-4 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const coin = marketData.get(item.coin_id);
                const change = coin?.price_change_percentage_24h;

                return (
                  <tr
                    key={item.coin_id}
                    className="border-b border-gray-700/30 hover:bg-gray-800/40 transition"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {coin?.image && (
                          <img
                            src={coin.image}
                            alt=""
                            className="w-6 h-6 rounded-full"
                          />
                        )}
                        <div>
                          <span className="font-medium text-white">
                            {item.name ?? item.coin_id}
                          </span>
                          <span className="ml-2 text-xs text-gray-500 uppercase">
                            {item.symbol}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="text-right px-4 py-3 font-mono text-sm">
                      {coin?.current_price != null
                        ? `$${coin.current_price.toLocaleString()}`
                        : '--'}
                    </td>
                    <td className="text-right px-4 py-3">
                      {change != null ? (
                        <span
                          className={`text-sm font-medium ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}
                        >
                          {change >= 0 ? '+' : ''}
                          {change.toFixed(2)}%
                        </span>
                      ) : (
                        '--'
                      )}
                    </td>
                    <td className="text-right px-4 py-3 text-sm text-gray-400">
                      {coin?.market_cap != null
                        ? `$${(coin.market_cap / 1e9).toFixed(1)}B`
                        : '--'}
                    </td>
                    <td className="text-right px-4 py-3 text-sm text-gray-400">
                      {coin?.total_volume != null
                        ? `$${(coin.total_volume / 1e9).toFixed(1)}B`
                        : '--'}
                    </td>
                    <td className="text-right px-4 py-3">
                      <button
                        onClick={() => handleRemove(item.coin_id)}
                        className="text-gray-600 hover:text-red-400 transition p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
