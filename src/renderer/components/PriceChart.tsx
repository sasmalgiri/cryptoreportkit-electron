import { useState, useEffect, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import { getOhlc } from '../hooks/useElectron';
import type { OhlcvData } from '../types';

interface PriceChartProps {
  coinId: string;
  currency: string;
}

const TIMEFRAMES = [
  { label: '1D', days: 1 },
  { label: '7D', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '1Y', days: 365 },
];

export function PriceChart({ coinId, currency }: PriceChartProps) {
  const [data, setData] = useState<OhlcvData>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState<'line' | 'candlestick'>('line');

  const fetchChart = useCallback(async () => {
    setLoading(true);
    try {
      const ohlc = await getOhlc(coinId, currency, days);
      setData(ohlc);
    } catch {
      setData([]);
    }
    setLoading(false);
  }, [coinId, currency, days]);

  useEffect(() => {
    fetchChart();
  }, [fetchChart]);

  const option =
    chartType === 'candlestick' ? getCandlestickOption(data) : getLineOption(data);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white capitalize">{coinId}</span>
          <div className="flex rounded-lg overflow-hidden border border-gray-700">
            {(['line', 'candlestick'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setChartType(type)}
                className={`px-2.5 py-1 text-[11px] transition ${
                  chartType === type
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-gray-500 hover:text-white'
                }`}
              >
                {type === 'line' ? 'Line' : 'Candle'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex rounded-lg overflow-hidden border border-gray-700">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.days}
              onClick={() => setDays(tf.days)}
              className={`px-2.5 py-1 text-[11px] transition ${
                days === tf.days
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-[300px] flex items-center justify-center text-gray-600">
          Loading chart...
        </div>
      ) : data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-gray-600">
          No chart data available
        </div>
      ) : (
        <ReactECharts
          option={option}
          style={{ height: 300 }}
          notMerge
          theme="dark"
        />
      )}
    </div>
  );
}

function getLineOption(data: OhlcvData) {
  const xData = data.map((d) =>
    new Date(d[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  );
  const closes = data.map((d) => d[4]);
  const isUp = closes.length > 1 && closes[closes.length - 1] >= closes[0];

  return {
    backgroundColor: 'transparent',
    grid: { left: 50, right: 20, top: 10, bottom: 30 },
    xAxis: {
      type: 'category',
      data: xData,
      axisLine: { lineStyle: { color: '#374151' } },
      axisLabel: { color: '#6b7280', fontSize: 10 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#1f2937' } },
      axisLabel: {
        color: '#6b7280',
        fontSize: 10,
        formatter: (v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`),
      },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1f2937',
      borderColor: '#374151',
      textStyle: { color: '#e5e7eb', fontSize: 12 },
    },
    series: [
      {
        type: 'line',
        data: closes,
        smooth: true,
        showSymbol: false,
        lineStyle: { color: isUp ? '#4ade80' : '#f87171', width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: isUp ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)' },
              { offset: 1, color: 'transparent' },
            ],
          },
        },
      },
    ],
  };
}

function getCandlestickOption(data: OhlcvData) {
  const xData = data.map((d) =>
    new Date(d[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  );
  // ECharts candlestick: [open, close, low, high]
  const ohlc = data.map((d) => [d[1], d[4], d[3], d[2]]);

  return {
    backgroundColor: 'transparent',
    grid: { left: 50, right: 20, top: 10, bottom: 30 },
    xAxis: {
      type: 'category',
      data: xData,
      axisLine: { lineStyle: { color: '#374151' } },
      axisLabel: { color: '#6b7280', fontSize: 10 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#1f2937' } },
      axisLabel: {
        color: '#6b7280',
        fontSize: 10,
        formatter: (v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`),
      },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1f2937',
      borderColor: '#374151',
      textStyle: { color: '#e5e7eb', fontSize: 12 },
    },
    series: [
      {
        type: 'candlestick',
        data: ohlc,
        itemStyle: {
          color: '#4ade80',
          color0: '#f87171',
          borderColor: '#4ade80',
          borderColor0: '#f87171',
        },
      },
    ],
  };
}
