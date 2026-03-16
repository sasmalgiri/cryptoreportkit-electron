import { useState } from 'react';
import { Plus, TrendingUp, TrendingDown, DollarSign, PieChart } from 'lucide-react';
import { usePortfolio } from '../hooks/usePortfolio';
import { PortfolioTable } from '../components/PortfolioTable';
import { AddEntryModal } from '../components/AddEntryModal';

export default function Portfolio() {
  const { summary, loading, error, addEntry, removeEntry, refresh } = usePortfolio();
  const [showAddModal, setShowAddModal] = useState(false);

  const totalInvested = summary?.total_invested ?? 0;
  const currentValue = summary?.current_value ?? 0;
  const totalPnl = summary?.total_pnl ?? 0;
  const totalPnlPct = summary?.total_pnl_percentage ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Portfolio</h1>
          <p className="text-gray-400 text-sm mt-1">
            Track your holdings locally with full privacy
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg font-medium text-sm transition"
        >
          <Plus className="w-4 h-4" />
          Add Position
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
            <DollarSign className="w-3.5 h-3.5" />
            Total Invested
          </div>
          <div className="text-lg font-semibold">
            ${totalInvested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
            <PieChart className="w-3.5 h-3.5" />
            Current Value
          </div>
          <div className="text-lg font-semibold">
            ${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
            {totalPnl >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-red-400" />
            )}
            Total P&L
          </div>
          <div
            className={`text-lg font-semibold ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}
          >
            {totalPnl >= 0 ? '+' : ''}$
            {Math.abs(totalPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
            P&L %
          </div>
          <div
            className={`text-lg font-semibold ${totalPnlPct >= 0 ? 'text-green-400' : 'text-red-400'}`}
          >
            {totalPnlPct >= 0 ? '+' : ''}
            {totalPnlPct.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700/50 flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-300">Holdings</h2>
          <button
            onClick={refresh}
            className="text-xs text-emerald-400 hover:text-emerald-300 transition"
          >
            Refresh prices
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading portfolio...</div>
        ) : summary && summary.entries.length > 0 ? (
          <PortfolioTable entries={summary.entries} onDelete={removeEntry} />
        ) : (
          <div className="p-12 text-center">
            <p className="text-gray-500 mb-4">No holdings yet</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition"
            >
              Add your first position
            </button>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddEntryModal
          onClose={() => setShowAddModal(false)}
          onAdd={async (params) => {
            await addEntry(params);
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}
