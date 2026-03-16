import { TrendingUp, TrendingDown } from 'lucide-react';
import type { CoinMarket } from '../types';

interface PriceCardProps {
  coin: CoinMarket;
  onClick: () => void;
  isSelected?: boolean;
}

export function PriceCard({ coin, onClick, isSelected }: PriceCardProps) {
  const change = coin.price_change_percentage_24h;
  const isPositive = (change ?? 0) >= 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`glass-card p-4 text-left card-hover relative overflow-hidden group ${
        isSelected
          ? 'border-emerald-400/30 glow-emerald'
          : ''
      }`}
    >
      {/* Subtle gradient overlay on hover */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
        isPositive
          ? 'bg-gradient-to-br from-green-500/[0.03] to-transparent'
          : 'bg-gradient-to-br from-red-500/[0.03] to-transparent'
      }`} />

      <div className="relative z-10">
        <div className="flex items-center gap-2.5 mb-3">
          {coin.image && (
            <img
              src={coin.image}
              alt=""
              className="w-7 h-7 rounded-full ring-1 ring-white/10"
            />
          )}
          <span className="font-medium text-white text-sm">{coin.name}</span>
          <span className="text-[10px] text-gray-600 uppercase ml-auto font-mono tracking-wider">
            {coin.symbol}
          </span>
        </div>

        <div className="text-xl font-semibold text-white font-mono tracking-tight">
          {coin.current_price != null
            ? `$${coin.current_price.toLocaleString()}`
            : '--'}
        </div>

        {change != null && (
          <div
            className={`flex items-center gap-1 text-xs mt-1.5 font-mono ${
              isPositive ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {isPositive ? '+' : ''}
            {change.toFixed(2)}%
          </div>
        )}

        {/* Animated sparkline */}
        {coin.sparkline_in_7d?.price && (
          <div className="mt-3 h-8 flex items-end gap-px">
            {sampleSparkline(coin.sparkline_in_7d.price, 24).map((val, i) => (
              <div
                key={i}
                className={`flex-1 rounded-t-sm sparkline-bar ${
                  isPositive ? 'bg-green-400/25' : 'bg-red-400/25'
                }`}
                style={{
                  height: `${val}%`,
                  animationDelay: `${i * 20}ms`,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

function sampleSparkline(prices: number[], points: number): number[] {
  if (prices.length === 0) return [];
  const step = Math.max(1, Math.floor(prices.length / points));
  const sampled = [];
  for (let i = 0; i < prices.length; i += step) {
    sampled.push(prices[i]);
    if (sampled.length >= points) break;
  }
  const min = Math.min(...sampled);
  const max = Math.max(...sampled);
  const range = max - min || 1;
  return sampled.map((v) => ((v - min) / range) * 100);
}
