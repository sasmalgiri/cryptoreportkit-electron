import { useState } from 'react';
import { TrendingUp, TrendingDown, Globe, Activity, BarChart3, Gauge } from 'lucide-react';
import { useMarketData } from '../hooks/useMarketData';
import { PriceCard } from '../components/PriceCard';
import { MarketTable } from '../components/MarketTable';
import { PriceChart } from '../components/PriceChart';
import { HelpTooltip } from '../components/HelpTooltip';
import { BeginnerDashboard } from '../components/BeginnerDashboard';
import { StartHereBanner } from '../components/StartHereBanner';
import { useAppStore } from '../stores/appStore';

function formatNumber(n: number | null | undefined): string {
  if (n == null) return '--';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
}

function KpiSkeleton() {
  return (
    <div className="kpi-card">
      <div className="skeleton h-3 w-24 mb-3" />
      <div className="skeleton h-6 w-32 mb-2" />
      <div className="skeleton h-3 w-16" />
    </div>
  );
}

export default function Dashboard() {
  const { markets, globalData, fearGreed, loading, error } = useMarketData();
  const [selectedCoin, setSelectedCoin] = useState('bitcoin');
  const [showFullDashboard, setShowFullDashboard] = useState(() => {
    return localStorage.getItem('crk-user-level') !== 'new';
  });
  const currency = useAppStore((s) => s.currency);

  if (!showFullDashboard) {
    return <BeginnerDashboard onShowFullDashboard={() => setShowFullDashboard(true)} />;
  }

  const global = globalData?.data;
  const totalMcap = global?.total_market_cap?.[currency];
  const totalVol = global?.total_volume?.[currency];
  const mcapChange = global?.market_cap_change_percentage_24h_usd;
  const btcDominance = global?.market_cap_percentage?.btc;

  const fgValue = fearGreed ? parseInt(fearGreed.value) : null;
  const fgLabel = fearGreed?.value_classification ?? '--';
  const fgColor = fgValue != null
    ? fgValue >= 60 ? 'text-green-400' : fgValue >= 40 ? 'text-yellow-400' : 'text-red-400'
    : '';

  const topCoins = markets.slice(0, 4);

  return (
    <div className="space-y-6">
      <StartHereBanner />

      {/* Header */}
      <div className="count-up">
        <h1 className="text-2xl font-bold text-white tracking-tight">Market Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Real-time data from your CoinGecko API key
        </p>
      </div>

      {error && (
        <div className="glass-card bg-red-500/5 border-red-500/20 p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Global KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-enter">
        {loading ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <>
            <div className="kpi-card group">
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
                <Globe className="w-3.5 h-3.5 text-emerald-400/60" />
                <span>Total Market Cap</span>
                <HelpTooltip text="The combined value of all cryptocurrencies. Calculated as price x circulating supply for every coin, summed together." />
              </div>
              <div className="text-xl font-semibold text-white font-mono count-up">
                {formatNumber(totalMcap)}
              </div>
              {mcapChange != null && (
                <div
                  className={`text-xs flex items-center gap-1 mt-1.5 ${mcapChange >= 0 ? 'text-green-400' : 'text-red-400'}`}
                >
                  {mcapChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  <span className="font-mono">{mcapChange >= 0 ? '+' : ''}{mcapChange.toFixed(2)}%</span>
                </div>
              )}
            </div>

            <div className="kpi-card group">
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
                <BarChart3 className="w-3.5 h-3.5 text-blue-400/60" />
                <span>24h Volume</span>
                <HelpTooltip text="Total cryptocurrency traded in the last 24 hours. High volume confirms price moves are real." />
              </div>
              <div className="text-xl font-semibold text-white font-mono count-up">
                {formatNumber(totalVol)}
              </div>
            </div>

            <div className="kpi-card group">
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
                <Activity className="w-3.5 h-3.5 text-amber-400/60" />
                <span>BTC Dominance</span>
                <HelpTooltip text="Bitcoin's share of the total crypto market cap. Rising dominance means money is flowing to Bitcoin." />
              </div>
              <div className="text-xl font-semibold text-white font-mono count-up">
                {btcDominance != null ? `${btcDominance.toFixed(1)}%` : '--'}
              </div>
            </div>

            <div className="kpi-card group">
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
                <Gauge className="w-3.5 h-3.5 text-purple-400/60" />
                <span>Fear & Greed</span>
                <HelpTooltip text="A 0-100 index measuring market emotion. Below 25 = extreme fear. Above 75 = extreme greed." />
              </div>
              <div className={`text-xl font-semibold font-mono count-up ${fgColor}`}>
                {fgValue ?? '--'}
              </div>
              <div className="text-xs text-gray-600 mt-1">{fgLabel}</div>
              {/* Mini gauge bar */}
              {fgValue != null && (
                <div className="mt-2 h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      fgValue >= 60 ? 'bg-green-400' : fgValue >= 40 ? 'bg-yellow-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${fgValue}%` }}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Top Coins */}
      <div>
        <h2 className="text-sm font-medium text-gray-500 mb-3">Top Cryptocurrencies</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-enter">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="glass-card p-4 h-28">
                  <div className="skeleton h-4 w-20 mb-3" />
                  <div className="skeleton h-6 w-28 mb-2" />
                  <div className="skeleton h-3 w-14" />
                </div>
              ))
            : topCoins.map((coin) => (
                <PriceCard
                  key={coin.id}
                  coin={coin}
                  onClick={() => setSelectedCoin(coin.id)}
                  isSelected={selectedCoin === coin.id}
                />
              ))}
        </div>
      </div>

      {/* Chart */}
      <div className="glass-card p-5">
        <PriceChart coinId={selectedCoin} currency={currency} />
      </div>

      {/* Market Table */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/[0.04]">
          <h2 className="text-sm font-medium text-gray-400">All Markets</h2>
        </div>
        <MarketTable
          coins={markets}
          loading={loading}
          onCoinClick={(id) => setSelectedCoin(id)}
        />
      </div>
    </div>
  );
}
