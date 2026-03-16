import { useState } from 'react';
import { X } from 'lucide-react';
import { SearchBar } from './SearchBar';

interface AddEntryModalProps {
  onClose: () => void;
  onAdd: (params: {
    coinId: string;
    symbol: string;
    name: string;
    amount: number;
    buyPrice: number;
    buyDate: string;
    notes?: string;
  }) => Promise<void>;
}

export function AddEntryModal({ onClose, onAdd }: AddEntryModalProps) {
  const [coin, setCoin] = useState<{ id: string; symbol: string; name: string } | null>(null);
  const [amount, setAmount] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [buyDate, setBuyDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coin || !amount || !buyPrice) return;

    setSaving(true);
    try {
      await onAdd({
        coinId: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        amount: parseFloat(amount),
        buyPrice: parseFloat(buyPrice),
        buyDate,
        notes: notes || undefined,
      });
    } catch (err) {
      console.error('Failed to add entry:', err);
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md p-6 mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Add Position</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Coin search */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Coin</label>
            {coin ? (
              <div className="flex items-center justify-between bg-gray-900 border border-gray-700 rounded-lg px-3 py-2">
                <span className="text-sm text-white">
                  {coin.name}{' '}
                  <span className="text-gray-500 uppercase text-xs">{coin.symbol}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setCoin(null)}
                  className="text-gray-500 hover:text-white text-xs"
                >
                  Change
                </button>
              </div>
            ) : (
              <SearchBar
                onSelect={(c) =>
                  setCoin({ id: c.id, symbol: c.symbol, name: c.name })
                }
                placeholder="Search for a coin..."
              />
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Amount</label>
            <input
              type="number"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.5"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50"
              required
            />
          </div>

          {/* Buy Price */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              Buy Price (USD)
            </label>
            <input
              type="number"
              step="any"
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
              placeholder="50000"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50"
              required
            />
          </div>

          {/* Buy Date */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Buy Date</label>
            <input
              type="date"
              value={buyDate}
              onChange={(e) => setBuyDate(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              Notes (optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="DCA buy, limit order, etc."
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-700 text-gray-400 hover:text-white rounded-lg text-sm transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!coin || !amount || !buyPrice || saving}
              className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-medium transition"
            >
              {saving ? 'Adding...' : 'Add Position'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
