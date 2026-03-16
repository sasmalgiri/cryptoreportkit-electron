/**
 * Technical indicator calculations — all computed client-side from OHLCV data.
 */

export function sma(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += data[j];
    result.push(sum / period);
  }
  return result;
}

export function ema(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const k = 2 / (period + 1);
  let prev: number | null = null;
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    if (prev === null) {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += data[j];
      prev = sum / period;
    } else {
      prev = data[i] * k + prev * (1 - k);
    }
    result.push(prev);
  }
  return result;
}

export function rsi(closes: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = [];
  if (closes.length < period + 1) return closes.map(() => null);

  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) avgGain += diff; else avgLoss += Math.abs(diff);
  }
  avgGain /= period;
  avgLoss /= period;

  for (let i = 0; i < period; i++) result.push(null);
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push(100 - 100 / (1 + rs));

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const r = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push(100 - 100 / (1 + r));
  }
  return result;
}

export function macd(closes: number[], fast = 12, slow = 26, signal = 9) {
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  const macdLine: (number | null)[] = emaFast.map((f, i) => {
    const s = emaSlow[i];
    return f !== null && s !== null ? f - s : null;
  });
  const validMacd = macdLine.filter((v): v is number => v !== null);
  const signalLine = ema(validMacd, signal);
  // Pad signal line
  const padded: (number | null)[] = [];
  let si = 0;
  for (const m of macdLine) {
    if (m === null) { padded.push(null); continue; }
    padded.push(signalLine[si] ?? null);
    si++;
  }
  const histogram: (number | null)[] = macdLine.map((m, i) => {
    const s = padded[i];
    return m !== null && s !== null ? m - s : null;
  });
  return { macdLine, signalLine: padded, histogram };
}

export function bollingerBands(closes: number[], period = 20, stdDevMult = 2) {
  const middle = sma(closes, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    const m = middle[i];
    if (m === null) { upper.push(null); lower.push(null); continue; }
    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) {
      variance += (closes[j] - m) ** 2;
    }
    const std = Math.sqrt(variance / period);
    upper.push(m + stdDevMult * std);
    lower.push(m - stdDevMult * std);
  }
  return { upper, middle, lower };
}

export function atr(highs: number[], lows: number[], closes: number[], period = 14): (number | null)[] {
  const trs: number[] = [];
  for (let i = 0; i < highs.length; i++) {
    if (i === 0) { trs.push(highs[i] - lows[i]); continue; }
    trs.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
  }
  return sma(trs, period);
}

/** Correlation coefficient between two price arrays */
export function correlation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const meanA = a.slice(0, n).reduce((s, v) => s + v, 0) / n;
  const meanB = b.slice(0, n).reduce((s, v) => s + v, 0) / n;
  let cov = 0, varA = 0, varB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA, db = b[i] - meanB;
    cov += da * db;
    varA += da * da;
    varB += db * db;
  }
  const denom = Math.sqrt(varA * varB);
  return denom === 0 ? 0 : cov / denom;
}

/** Daily returns from price array */
export function dailyReturns(prices: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  return returns;
}

/** Value at Risk (historical, 95%) */
export function valueAtRisk(returns: number[], confidence = 0.05): number {
  const sorted = [...returns].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * confidence);
  return sorted[idx] ?? 0;
}

/** Sharpe Ratio (annualized, assuming daily returns) */
export function sharpeRatio(returns: number[], riskFreeRate = 0): number {
  const mean = returns.reduce((s, v) => s + v, 0) / returns.length;
  const std = Math.sqrt(returns.reduce((s, v) => s + (v - mean) ** 2, 0) / returns.length);
  if (std === 0) return 0;
  return ((mean - riskFreeRate / 365) * Math.sqrt(365)) / std;
}

/** Sortino Ratio (annualized) */
export function sortinoRatio(returns: number[], riskFreeRate = 0): number {
  const mean = returns.reduce((s, v) => s + v, 0) / returns.length;
  const downside = returns.filter((r) => r < 0);
  const downsideStd = Math.sqrt(downside.reduce((s, v) => s + v ** 2, 0) / (downside.length || 1));
  if (downsideStd === 0) return 0;
  return ((mean - riskFreeRate / 365) * Math.sqrt(365)) / downsideStd;
}

/** Max drawdown from price series */
export function maxDrawdown(prices: number[]): number {
  let peak = prices[0];
  let maxDd = 0;
  for (const p of prices) {
    if (p > peak) peak = p;
    const dd = (peak - p) / peak;
    if (dd > maxDd) maxDd = dd;
  }
  return maxDd;
}
