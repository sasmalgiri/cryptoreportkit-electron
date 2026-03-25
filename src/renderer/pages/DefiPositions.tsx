import { useState } from 'react';
import {
  Landmark,
  Search,
  Loader2,
  AlertTriangle,
  Layers,
  TrendingUp,
  Shield,
  Droplets,
  Coins,
  Lock,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface DefiPosition {
  protocol: string;
  chain: string;
  type: 'liquidity' | 'staking' | 'lending' | 'farming' | 'vesting' | 'deposit';
  tokens: { symbol: string; amount: number; usdValue: number }[];
  totalUsdValue: number;
  apy?: number;
  healthFactor?: number;
}

const TYPE_CONFIG: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  liquidity: { icon: Droplets, color: 'text-blue-400', label: 'Liquidity' },
  staking: { icon: Lock, color: 'text-purple-400', label: 'Staking' },
  lending: { icon: Coins, color: 'text-amber-400', label: 'Lending' },
  farming: { icon: TrendingUp, color: 'text-green-400', label: 'Farming' },
  vesting: { icon: Shield, color: 'text-cyan-400', label: 'Vesting' },
  deposit: { icon: Layers, color: 'text-emerald-400', label: 'Deposit' },
};

const CHAINS = ['ethereum', 'arbitrum', 'optimism', 'polygon', 'base'];

export default function DefiPositions() {
  const [address, setAddress] = useState('');
  const [selectedChains, setSelectedChains] = useState(['ethereum']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [positions, setPositions] = useState<DefiPosition[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [searched, setSearched] = useState(false);

  const toggleChain = (chain: string) => {
    setSelectedChains((prev) => {
      if (prev.includes(chain)) {
        // Prevent deselecting all chains
        if (prev.length <= 1) return prev;
        return prev.filter((c) => c !== chain);
      }
      return [...prev, chain];
    });
  };

  const handleSearch = async () => {
    if (!address.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const chains = selectedChains.join(',');
      const res = await fetch(
        `https://cryptoreportkit.com/api/v1/defi/positions?address=${encodeURIComponent(address.trim())}&chains=${chains}`,
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed: ${res.status}`);
      }
      const data = await res.json();
      setPositions(data.positions || []);
      setTotalValue(data.totalValue || 0);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch positions');
    } finally {
      setLoading(false);
    }
  };

  const byProtocol = positions.reduce(
    (acc, pos) => {
      if (!acc[pos.protocol]) acc[pos.protocol] = [];
      acc[pos.protocol].push(pos);
      return acc;
    },
    {} as Record<string, DefiPosition[]>,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Layers className="w-6 h-6 text-emerald-400" />
        <div>
          <h1 className="text-2xl font-bold">DeFi Positions</h1>
          <p className="text-gray-400 text-sm mt-0.5">LP, staking, lending, and farming positions</p>
        </div>
      </div>

      {/* Chain chips */}
      <div className="flex flex-wrap gap-2">
        {CHAINS.map((chain) => (
          <button
            key={chain}
            type="button"
            onClick={() => toggleChain(chain)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition border ${
              selectedChains.includes(chain)
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                : 'border-gray-700/50 bg-gray-800/40 text-gray-400 hover:text-white'
            }`}
          >
            {chain}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Enter EVM wallet address (0x...)"
            className="w-full bg-gray-800/60 border border-gray-700/50 rounded-lg px-4 py-2.5 pl-10 text-sm focus:outline-none focus:border-emerald-500/50"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={loading || !address.trim()}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-lg font-medium text-sm transition"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Scan'}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {searched && positions.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
              <div className="text-xs text-gray-400">Positions</div>
              <div className="text-xl font-bold mt-1">{positions.length}</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
              <div className="text-xs text-gray-400">Protocols</div>
              <div className="text-xl font-bold mt-1">{Object.keys(byProtocol).length}</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
              <div className="text-xs text-gray-400">Total Value</div>
              <div className="text-xl font-bold mt-1 text-emerald-400">
                ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {Object.entries(byProtocol).map(([protocol, protocolPositions]) => (
              <div key={protocol} className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-700/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-emerald-400" />
                    <span className="font-medium">{protocol}</span>
                    <span className="text-xs text-gray-500">{protocolPositions.length} position{protocolPositions.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                {protocolPositions.map((pos, i) => {
                  const config = TYPE_CONFIG[pos.type] || TYPE_CONFIG.deposit;
                  const TypeIcon = config.icon;
                  return (
                    <div key={i} className="px-4 py-2.5 flex items-center justify-between border-t border-gray-700/30">
                      <div className="flex items-center gap-2">
                        <TypeIcon className={`w-4 h-4 ${config.color}`} />
                        <span className={`text-xs px-1.5 py-0.5 rounded bg-gray-700/40 ${config.color}`}>
                          {config.label}
                        </span>
                        <span className="text-xs text-gray-500 capitalize">{pos.chain}</span>
                        <div className="flex gap-2 ml-2">
                          {pos.tokens.map((tok, j) => (
                            <span key={j} className="text-sm">
                              {tok.amount.toFixed(4)} <span className="text-gray-500">{tok.symbol}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                      {pos.apy !== undefined && (
                        <span className="text-xs text-green-400">{pos.apy.toFixed(2)}% APY</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}

      {searched && positions.length === 0 && !error && (
        <div className="bg-gray-800/30 border border-gray-700/30 rounded-xl p-12 text-center">
          <Layers className="w-12 h-12 mx-auto mb-3 text-gray-700" />
          <p className="text-gray-400 text-sm">No DeFi positions found on selected chains</p>
        </div>
      )}

      {!searched && (
        <div className="bg-gray-800/30 border border-gray-700/30 rounded-xl p-12 text-center">
          <Layers className="w-12 h-12 mx-auto mb-3 text-gray-700" />
          <p className="text-gray-400 text-sm">Enter a wallet address to scan for DeFi positions across protocols</p>
        </div>
      )}
    </div>
  );
}
