import { Trash2 } from 'lucide-react';
import type { PortfolioEntryWithValue } from '../types';

interface PortfolioTableProps {
  entries: PortfolioEntryWithValue[];
  onDelete: (id: string) => void;
}

export function PortfolioTable({ entries, onDelete }: PortfolioTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500 uppercase border-b border-gray-700/50">
            <th className="text-left px-4 py-2.5">Coin</th>
            <th className="text-right px-4 py-2.5">Amount</th>
            <th className="text-right px-4 py-2.5">Buy Price</th>
            <th className="text-right px-4 py-2.5">Current Price</th>
            <th className="text-right px-4 py-2.5">Value</th>
            <th className="text-right px-4 py-2.5">P&L</th>
            <th className="text-right px-4 py-2.5 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {entries.map(({ entry, current_price, current_value, pnl, pnl_percentage }) => (
            <tr
              key={entry.id}
              className="border-b border-gray-700/30 hover:bg-gray-800/40 transition"
            >
              <td className="px-4 py-3">
                <div>
                  <span className="font-medium text-white">{entry.name}</span>
                  <span className="ml-2 text-xs text-gray-500 uppercase">
                    {entry.symbol}
                  </span>
                </div>
                <div className="text-[11px] text-gray-600 mt-0.5">
                  Bought {entry.buy_date}
                </div>
              </td>
              <td className="text-right px-4 py-3 font-mono text-white">
                {entry.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
              </td>
              <td className="text-right px-4 py-3 font-mono text-gray-400">
                ${entry.buy_price.toLocaleString()}
              </td>
              <td className="text-right px-4 py-3 font-mono text-white">
                ${current_price.toLocaleString()}
              </td>
              <td className="text-right px-4 py-3 font-mono text-white">
                ${current_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td className="text-right px-4 py-3">
                <div
                  className={`font-mono font-medium ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}
                >
                  {pnl >= 0 ? '+' : ''}$
                  {Math.abs(pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div
                  className={`text-[11px] ${pnl_percentage >= 0 ? 'text-green-400/60' : 'text-red-400/60'}`}
                >
                  {pnl_percentage >= 0 ? '+' : ''}
                  {pnl_percentage.toFixed(2)}%
                </div>
              </td>
              <td className="text-right px-4 py-3">
                <button
                  onClick={() => onDelete(entry.id)}
                  className="text-gray-600 hover:text-red-400 transition p-1"
                  title="Delete entry"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
