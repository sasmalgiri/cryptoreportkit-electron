import { useState, useEffect } from 'react';
import { Activity, Download } from 'lucide-react';
import { getOhlc, getMarkets } from '../hooks/useElectron';
import type { CoinMarket, OhlcvData } from '../types';
import { rsi, macd, bollingerBands, sma, ema, atr } from '../utils/indicators';
import { formatNumber, downloadCsv } from '../utils/export';
import { HelpTooltip } from '../components/HelpTooltip';

export default function Technical() {
  const [coins, setCoins] = useState<CoinMarket[]>([]);
  const [selected, setSelected] = useState('bitcoin');
  const [ohlc, setOhlc] = useState<OhlcvData>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { const m = await getMarkets('usd', 1, 20); setCoins(m); } catch { /* */ }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = await getOhlc(selected, 'usd', 90);
        setOhlc(data);
      } catch { setOhlc([]); }
    })();
  }, [selected]);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  const closes = ohlc.map(c => c[4]);
  const highs = ohlc.map(c => c[2]);
  const lows = ohlc.map(c => c[3]);

  const rsiVals = rsi(closes);
  const macdData = macd(closes);
  const bb = bollingerBands(closes);
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const atrVals = atr(highs, lows, closes);

  const lastRsi = rsiVals.filter(v => v !== null).slice(-1)[0] ?? 50;
  const lastMacd = macdData.macdLine.filter(v => v !== null).slice(-1)[0] ?? 0;
  const lastSignal = macdData.signalLine.filter(v => v !== null).slice(-1)[0] ?? 0;
  const lastHist = macdData.histogram.filter(v => v !== null).slice(-1)[0] ?? 0;
  const lastBbUpper = bb.upper.filter(v => v !== null).slice(-1)[0] ?? 0;
  const lastBbMiddle = bb.middle.filter(v => v !== null).slice(-1)[0] ?? 0;
  const lastBbLower = bb.lower.filter(v => v !== null).slice(-1)[0] ?? 0;
  const lastSma20 = sma20.filter(v => v !== null).slice(-1)[0] ?? 0;
  const lastSma50 = sma50.filter(v => v !== null).slice(-1)[0] ?? 0;
  const lastEma12 = ema12.filter(v => v !== null).slice(-1)[0] ?? 0;
  const lastEma26 = ema26.filter(v => v !== null).slice(-1)[0] ?? 0;
  const lastAtr = atrVals.filter(v => v !== null).slice(-1)[0] ?? 0;
  const lastPrice = closes[closes.length - 1] ?? 0;

  // Signals
  const rsiSignal = lastRsi < 30 ? 'buy' : lastRsi > 70 ? 'sell' : 'neutral';
  const macdSignal = lastMacd > lastSignal ? 'buy' : 'sell';
  const smaSignal = lastSma20 > lastSma50 ? 'buy' : 'sell';
  const bbSignal = lastPrice < lastBbLower ? 'buy' : lastPrice > lastBbUpper ? 'sell' : 'neutral';
  const emaSignal = lastEma12 > lastEma26 ? 'buy' : 'sell';

  const signals = [rsiSignal, macdSignal, smaSignal, bbSignal, emaSignal];
  const buyCount = signals.filter(s => s === 'buy').length;
  const sellCount = signals.filter(s => s === 'sell').length;
  const overall = buyCount > sellCount ? 'BUY' : sellCount > buyCount ? 'SELL' : 'NEUTRAL';

  const signalColor = (s: string) => s === 'buy' ? 'text-emerald-400' : s === 'sell' ? 'text-red-400' : 'text-gray-400';
  const signalBg = (s: string) => s === 'buy' ? 'bg-emerald-500/10 border-emerald-500/20' : s === 'sell' ? 'bg-red-500/10 border-red-500/20' : 'bg-gray-700/30 border-gray-700/50';

  const exportData = () => {
    downloadCsv('technical-analysis.csv',
      ['Indicator', 'Value', 'Signal'],
      [['RSI(14)', lastRsi, rsiSignal], ['MACD', lastMacd, macdSignal], ['SMA 20/50', `${lastSma20.toFixed(2)} / ${lastSma50.toFixed(2)}`, smaSignal],
       ['Bollinger', `${lastBbLower.toFixed(2)} / ${lastBbMiddle.toFixed(2)} / ${lastBbUpper.toFixed(2)}`, bbSignal],
       ['EMA 12/26', `${lastEma12.toFixed(2)} / ${lastEma26.toFixed(2)}`, emaSignal], ['ATR(14)', lastAtr, 'info']]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-emerald-400" />
          <h1 className="text-2xl font-bold">Technical Analysis</h1>
        </div>
        <div className="flex items-center gap-3">
          <select value={selected} onChange={e => setSelected(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none">
            {coins.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button type="button" onClick={exportData} className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg text-sm text-gray-300 hover:text-white transition">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Overall Signal */}
      <div className={`text-center py-4 rounded-xl border ${overall === 'BUY' ? 'bg-emerald-500/10 border-emerald-500/20' : overall === 'SELL' ? 'bg-red-500/10 border-red-500/20' : 'bg-gray-700/30 border-gray-700/50'}`}>
        <div className="text-sm text-gray-400">Overall Signal</div>
        <div className={`text-3xl font-bold mt-1 ${overall === 'BUY' ? 'text-emerald-400' : overall === 'SELL' ? 'text-red-400' : 'text-gray-300'}`}>{overall}</div>
        <div className="text-xs text-gray-500 mt-1">{buyCount} Buy / {signals.length - buyCount - sellCount} Neutral / {sellCount} Sell</div>
      </div>

      {/* Indicator Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {/* RSI */}
        <div className={`rounded-xl p-4 border ${signalBg(rsiSignal)}`}>
          <div className="flex justify-between items-start mb-3">
            <div className="text-sm font-medium text-gray-300 flex items-center gap-1.5">RSI (14) <HelpTooltip text="Relative Strength Index — a 0-100 oscillator. Below 30 = oversold (potential bounce). Above 70 = overbought (potential pullback). Not a standalone signal." /></div>
            <span className={`text-xs font-medium uppercase ${signalColor(rsiSignal)}`}>{rsiSignal}</span>
          </div>
          <div className="text-2xl font-bold mb-2">{lastRsi.toFixed(1)}</div>
          <div className="h-2 rounded-full bg-gray-700 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${lastRsi}%`, backgroundColor: lastRsi < 30 ? '#10b981' : lastRsi > 70 ? '#ef4444' : '#6b7280' }} />
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 mt-1">
            <span>Oversold (30)</span><span>Overbought (70)</span>
          </div>
        </div>

        {/* MACD */}
        <div className={`rounded-xl p-4 border ${signalBg(macdSignal)}`}>
          <div className="flex justify-between items-start mb-3">
            <div className="text-sm font-medium text-gray-300 flex items-center gap-1.5">MACD <HelpTooltip text="Moving Average Convergence Divergence — shows momentum direction. When MACD crosses above the signal line, momentum is bullish. The histogram shows strength." /></div>
            <span className={`text-xs font-medium uppercase ${signalColor(macdSignal)}`}>{macdSignal}</span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">MACD</span><span>{lastMacd.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Signal</span><span>{lastSignal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Histogram</span>
              <span className={lastHist >= 0 ? 'text-emerald-400' : 'text-red-400'}>{lastHist.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Bollinger Bands */}
        <div className={`rounded-xl p-4 border ${signalBg(bbSignal)}`}>
          <div className="flex justify-between items-start mb-3">
            <div className="text-sm font-medium text-gray-300 flex items-center gap-1.5">Bollinger Bands <HelpTooltip text="A moving average with bands 2 standard deviations above/below. Price near upper band = high volatility. Squeezing bands predict a big move is coming." /></div>
            <span className={`text-xs font-medium uppercase ${signalColor(bbSignal)}`}>{bbSignal}</span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">Upper</span><span>${formatNumber(lastBbUpper)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Middle</span><span>${formatNumber(lastBbMiddle)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Lower</span><span>${formatNumber(lastBbLower)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Price</span><span className="font-medium">${formatNumber(lastPrice)}</span></div>
          </div>
        </div>

        {/* SMA */}
        <div className={`rounded-xl p-4 border ${signalBg(smaSignal)}`}>
          <div className="flex justify-between items-start mb-3">
            <div className="text-sm font-medium text-gray-300">SMA Cross</div>
            <span className={`text-xs font-medium uppercase ${signalColor(smaSignal)}`}>{smaSignal === 'buy' ? 'Golden Cross' : 'Death Cross'}</span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">SMA(20)</span><span>${formatNumber(lastSma20)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">SMA(50)</span><span>${formatNumber(lastSma50)}</span></div>
          </div>
        </div>

        {/* EMA */}
        <div className={`rounded-xl p-4 border ${signalBg(emaSignal)}`}>
          <div className="flex justify-between items-start mb-3">
            <div className="text-sm font-medium text-gray-300">EMA</div>
            <span className={`text-xs font-medium uppercase ${signalColor(emaSignal)}`}>{emaSignal}</span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">EMA(12)</span><span>${formatNumber(lastEma12)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">EMA(26)</span><span>${formatNumber(lastEma26)}</span></div>
          </div>
        </div>

        {/* ATR */}
        <div className="rounded-xl p-4 border bg-gray-700/30 border-gray-700/50">
          <div className="flex justify-between items-start mb-3">
            <div className="text-sm font-medium text-gray-300">ATR (14)</div>
            <span className="text-xs text-gray-500">Volatility</span>
          </div>
          <div className="text-2xl font-bold">${formatNumber(lastAtr)}</div>
          <div className="text-xs text-gray-500 mt-1">
            {lastAtr / lastPrice > 0.03 ? 'High volatility' : lastAtr / lastPrice > 0.015 ? 'Moderate volatility' : 'Low volatility'}
          </div>
        </div>
      </div>
    </div>
  );
}
