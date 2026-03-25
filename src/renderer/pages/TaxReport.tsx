import { useState, useEffect, useMemo } from 'react';
import { FileText, Download, DollarSign, TrendingUp, TrendingDown, AlertTriangle, Loader2 } from 'lucide-react';
import { getPortfolio, getSimplePrice } from '../hooks/useElectron';
import type { PortfolioEntry } from '../types';
import { downloadCsv, formatNumber } from '../utils/export';

type Method = 'FIFO' | 'LIFO' | 'AVG';

interface TaxTransaction {
  dateAcquired: string;
  dateSold: string;
  asset: string;
  symbol: string;
  amount: number;
  costBasis: number;
  proceeds: number;
  gainLoss: number;
  term: 'Short-term' | 'Long-term';
}

function daysBetween(d1: string, d2: string): number {
  const t1 = new Date(d1).getTime();
  const t2 = new Date(d2).getTime();
  if (isNaN(t1) || isNaN(t2)) return 0;
  return Math.abs(t2 - t1) / (1000 * 60 * 60 * 24);
}

function computeTaxTransactions(
  entries: PortfolioEntry[],
  prices: Record<string, number>,
  method: Method,
  taxYear: number,
): TaxTransaction[] {
  // Group entries by coin
  const byCoin: Record<string, PortfolioEntry[]> = {};
  for (const e of entries) {
    if (!byCoin[e.coin_id]) byCoin[e.coin_id] = [];
    byCoin[e.coin_id].push(e);
  }

  const transactions: TaxTransaction[] = [];
  const sellDate = `${taxYear}-12-31`;
  const now = new Date();
  const sellDateStr = taxYear === now.getFullYear()
    ? now.toISOString().split('T')[0]
    : sellDate;

  for (const [coinId, coinEntries] of Object.entries(byCoin)) {
    const currentPrice = prices[coinId] ?? 0;
    if (currentPrice === 0) continue;

    let sorted: PortfolioEntry[];
    if (method === 'LIFO') {
      sorted = [...coinEntries].sort((a, b) => new Date(b.buy_date).getTime() - new Date(a.buy_date).getTime());
    } else {
      sorted = [...coinEntries].sort((a, b) => new Date(a.buy_date).getTime() - new Date(b.buy_date).getTime());
    }

    if (method === 'AVG') {
      const totalCost = sorted.reduce((s, e) => s + e.amount * e.buy_price, 0);
      const totalAmount = sorted.reduce((s, e) => s + e.amount, 0);
      const avgCost = totalAmount > 0 ? totalCost / totalAmount : 0;
      // Treat as single lot
      const earliestDate = sorted.reduce((d, e) => e.buy_date < d ? e.buy_date : d, sorted[0]?.buy_date ?? sellDateStr);
      const proceeds = totalAmount * currentPrice;
      const costBasis = totalAmount * avgCost;
      const term = daysBetween(earliestDate, sellDateStr) > 365 ? 'Long-term' : 'Short-term';
      transactions.push({
        dateAcquired: earliestDate,
        dateSold: sellDateStr,
        asset: sorted[0]?.name ?? coinId,
        symbol: sorted[0]?.symbol ?? coinId,
        amount: totalAmount,
        costBasis,
        proceeds,
        gainLoss: proceeds - costBasis,
        term,
      });
    } else {
      // FIFO or LIFO — simulate selling each lot at current price
      for (const entry of sorted) {
        const costBasis = entry.amount * entry.buy_price;
        const proceeds = entry.amount * currentPrice;
        const term = daysBetween(entry.buy_date, sellDateStr) > 365 ? 'Long-term' : 'Short-term';
        transactions.push({
          dateAcquired: entry.buy_date,
          dateSold: sellDateStr,
          asset: entry.name,
          symbol: entry.symbol,
          amount: entry.amount,
          costBasis,
          proceeds,
          gainLoss: proceeds - costBasis,
          term,
        });
      }
    }
  }

  return transactions;
}

export default function TaxReport() {
  const [entries, setEntries] = useState<PortfolioEntry[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [taxYear, setTaxYear] = useState(2026);
  const [method, setMethod] = useState<Method>('FIFO');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getPortfolio()
      .then(async (portfolio) => {
        if (cancelled) return;
        setEntries(portfolio);
        const coinIds = [...new Set(portfolio.map(e => e.coin_id))];
        if (coinIds.length > 0) {
          try {
            const priceData = await getSimplePrice(coinIds.join(','));
            const priceMap: Record<string, number> = {};
            for (const [id, data] of Object.entries(priceData)) {
              priceMap[id] = data.usd ?? 0;
            }
            if (!cancelled) setPrices(priceMap);
          } catch { /* prices unavailable */ }
        }
      })
      .catch(e => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const transactions = useMemo(() =>
    computeTaxTransactions(entries, prices, method, taxYear),
    [entries, prices, method, taxYear],
  );

  const shortTerm = transactions.filter(t => t.term === 'Short-term');
  const longTerm = transactions.filter(t => t.term === 'Long-term');

  const totalGains = transactions.filter(t => t.gainLoss > 0).reduce((s, t) => s + t.gainLoss, 0);
  const totalLosses = transactions.filter(t => t.gainLoss < 0).reduce((s, t) => s + t.gainLoss, 0);
  const netGainLoss = totalGains + totalLosses;
  const taxEstimate = Math.max(0, netGainLoss * 0.15);

  const shortTermTotal = shortTerm.reduce((s, t) => s + t.gainLoss, 0);
  const longTermTotal = longTerm.reduce((s, t) => s + t.gainLoss, 0);

  const exportCsv = () => {
    const headers = ['Date Acquired', 'Date Sold', 'Asset', 'Amount', 'Cost Basis', 'Proceeds', 'Gain/Loss', 'Term'];
    const rows = transactions.map(t => [t.dateAcquired, t.dateSold, `${t.asset} (${t.symbol.toUpperCase()})`, t.amount, t.costBasis, t.proceeds, t.gainLoss, t.term] as (string | number)[]);
    downloadCsv(`crypto-tax-report-${taxYear}.csv`, headers, rows);
  };

  const export8949 = () => {
    const headers = ['(a) Description', '(b) Date Acquired', '(c) Date Sold', '(d) Proceeds', '(e) Cost Basis', '(f) Code', '(g) Adjustment', '(h) Gain or Loss'];
    const rows = transactions.map(t => [
      `${t.amount.toFixed(6)} ${t.symbol.toUpperCase()}`,
      t.dateAcquired,
      t.dateSold,
      t.proceeds,
      t.costBasis,
      '',
      0,
      t.gainLoss,
    ] as (string | number)[]);
    downloadCsv(`form-8949-${taxYear}.csv`, headers, rows);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tax Report</h1>
          <p className="text-gray-400 text-sm mt-1">Crypto capital gains report based on portfolio data</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} disabled={transactions.length === 0} className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 rounded-lg text-sm transition">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={export8949} disabled={transactions.length === 0} className="flex items-center gap-2 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition">
            <FileText className="w-4 h-4" /> Form 8949
          </button>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">{error}</div>}

      {/* Controls */}
      <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Tax Year</label>
            <div className="flex bg-gray-700/40 rounded-lg p-0.5">
              {[2024, 2025, 2026].map(yr => (
                <button key={yr} onClick={() => setTaxYear(yr)} className={`px-4 py-2 rounded-md text-xs font-medium transition ${taxYear === yr ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-white'}`}>{yr}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Cost Basis Method</label>
            <div className="flex bg-gray-700/40 rounded-lg p-0.5">
              {(['FIFO', 'LIFO', 'AVG'] as Method[]).map(m => (
                <button key={m} onClick={() => setMethod(m)} className={`px-4 py-2 rounded-md text-xs font-medium transition ${method === m ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-white'}`}>{m}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1"><TrendingUp className="w-3.5 h-3.5 text-green-400" />Realized Gains</div>
          <div className="text-lg font-semibold text-green-400">${formatNumber(totalGains)}</div>
        </div>
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1"><TrendingDown className="w-3.5 h-3.5 text-red-400" />Realized Losses</div>
          <div className="text-lg font-semibold text-red-400">${formatNumber(Math.abs(totalLosses))}</div>
        </div>
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1"><DollarSign className="w-3.5 h-3.5" />Net Gain/Loss</div>
          <div className={`text-lg font-semibold ${netGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {netGainLoss >= 0 ? '+' : '-'}${formatNumber(Math.abs(netGainLoss))}
          </div>
        </div>
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1"><FileText className="w-3.5 h-3.5" />Tax Estimate (15%)</div>
          <div className="text-lg font-semibold">${formatNumber(taxEstimate)}</div>
        </div>
      </div>

      {/* Transaction Table */}
      {entries.length === 0 ? (
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-600" />
          <p className="text-gray-500 mb-2">No portfolio entries found</p>
          <p className="text-gray-600 text-sm">Add positions in the Portfolio page to generate tax reports</p>
        </div>
      ) : (
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700/50">
            <h2 className="text-sm font-medium text-gray-300">Transaction Details ({method})</h2>
          </div>
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-800">
                <tr className="text-left text-gray-400 text-xs">
                  <th className="px-4 py-2">Date Acquired</th>
                  <th className="px-4 py-2">Date Sold</th>
                  <th className="px-4 py-2">Asset</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2 text-right">Cost Basis</th>
                  <th className="px-4 py-2 text-right">Proceeds</th>
                  <th className="px-4 py-2 text-right">Gain/Loss</th>
                  <th className="px-4 py-2">Term</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, i) => (
                  <tr key={i} className="border-t border-gray-700/30 hover:bg-gray-700/20">
                    <td className="px-4 py-2 text-gray-300">{new Date(t.dateAcquired).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-gray-300">{new Date(t.dateSold).toLocaleDateString()}</td>
                    <td className="px-4 py-2">
                      <span className="text-white">{t.asset}</span>
                      <span className="text-gray-500 ml-1">{t.symbol.toUpperCase()}</span>
                    </td>
                    <td className="px-4 py-2 text-right text-gray-400">{t.amount.toFixed(6)}</td>
                    <td className="px-4 py-2 text-right">${formatNumber(t.costBasis)}</td>
                    <td className="px-4 py-2 text-right">${formatNumber(t.proceeds)}</td>
                    <td className={`px-4 py-2 text-right font-medium ${t.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {t.gainLoss >= 0 ? '+' : '-'}${formatNumber(Math.abs(t.gainLoss))}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${t.term === 'Long-term' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'}`}>{t.term}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form 8949 Preview */}
      {transactions.length > 0 && (
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700/50">
            <h2 className="text-sm font-medium text-gray-300">Form 8949 Preview</h2>
          </div>
          <div className="p-4 space-y-4">
            {/* Short-term */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400">Part I - Short-Term</span>
                <span className="text-xs text-gray-500">Assets held one year or less</span>
              </div>
              {shortTerm.length > 0 ? (
                <div className="bg-gray-700/20 rounded-lg p-3 space-y-1">
                  {shortTerm.map((t, i) => (
                    <div key={i} className="flex justify-between text-xs text-gray-300">
                      <span>{t.amount.toFixed(4)} {t.symbol.toUpperCase()}</span>
                      <span>Basis: ${formatNumber(t.costBasis)}</span>
                      <span>Proceeds: ${formatNumber(t.proceeds)}</span>
                      <span className={t.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}>{t.gainLoss >= 0 ? '+' : '-'}${formatNumber(Math.abs(t.gainLoss))}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-600/50 pt-1 flex justify-between text-xs font-medium">
                    <span className="text-gray-400">Subtotal</span>
                    <span className={shortTermTotal >= 0 ? 'text-green-400' : 'text-red-400'}>{shortTermTotal >= 0 ? '+' : '-'}${formatNumber(Math.abs(shortTermTotal))}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-600">No short-term transactions</p>
              )}
            </div>
            {/* Long-term */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">Part II - Long-Term</span>
                <span className="text-xs text-gray-500">Assets held more than one year</span>
              </div>
              {longTerm.length > 0 ? (
                <div className="bg-gray-700/20 rounded-lg p-3 space-y-1">
                  {longTerm.map((t, i) => (
                    <div key={i} className="flex justify-between text-xs text-gray-300">
                      <span>{t.amount.toFixed(4)} {t.symbol.toUpperCase()}</span>
                      <span>Basis: ${formatNumber(t.costBasis)}</span>
                      <span>Proceeds: ${formatNumber(t.proceeds)}</span>
                      <span className={t.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}>{t.gainLoss >= 0 ? '+' : '-'}${formatNumber(Math.abs(t.gainLoss))}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-600/50 pt-1 flex justify-between text-xs font-medium">
                    <span className="text-gray-400">Subtotal</span>
                    <span className={longTermTotal >= 0 ? 'text-green-400' : 'text-red-400'}>{longTermTotal >= 0 ? '+' : '-'}${formatNumber(Math.abs(longTermTotal))}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-600">No long-term transactions</p>
              )}
            </div>
            {/* Net */}
            <div className="bg-gray-700/30 rounded-lg p-3 flex justify-between items-center">
              <span className="text-sm font-medium text-gray-300">Net Capital Gain/Loss</span>
              <span className={`text-lg font-bold ${netGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {netGainLoss >= 0 ? '+' : '-'}${formatNumber(Math.abs(netGainLoss))}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-amber-400 text-sm font-medium">Disclaimer</p>
          <p className="text-gray-400 text-xs mt-1">
            This report is for informational purposes only and does not constitute tax advice.
            Gains/losses are hypothetical projections based on current market prices and your portfolio buy data.
            Consult a qualified tax professional for accurate tax filing.
          </p>
        </div>
      </div>
    </div>
  );
}
