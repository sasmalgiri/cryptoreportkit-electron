import { useState } from 'react';
import {
  Wallet,
  Search,
  Loader2,
  AlertTriangle,
  Globe,
  Copy,
  CheckCircle2,
} from 'lucide-react';

interface TokenBalance {
  symbol: string;
  name: string;
  balance: number;
  contractAddress?: string;
}

interface WalletResult {
  chain: string;
  address: string;
  nativeBalance: number;
  nativeSymbol: string;
  tokens: TokenBalance[];
}

const CHAINS = [
  { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', color: '#627EEA' },
  { id: 'bsc', name: 'BNB Chain', symbol: 'BNB', color: '#F0B90B' },
  { id: 'polygon', name: 'Polygon', symbol: 'MATIC', color: '#8247E5' },
  { id: 'arbitrum', name: 'Arbitrum', symbol: 'ETH', color: '#28A0F0' },
  { id: 'optimism', name: 'Optimism', symbol: 'ETH', color: '#FF0420' },
  { id: 'base', name: 'Base', symbol: 'ETH', color: '#0052FF' },
  { id: 'solana', name: 'Solana', symbol: 'SOL', color: '#9945FF' },
  { id: 'cosmos', name: 'Cosmos', symbol: 'ATOM', color: '#2E3148' },
];

export default function WalletTracker() {
  const [address, setAddress] = useState('');
  const [selectedChains, setSelectedChains] = useState<string[]>(['ethereum']);
  const [results, setResults] = useState<WalletResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const toggleChain = (id: string) => {
    setSelectedChains((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const handleSearch = async () => {
    if (!address.trim() || selectedChains.length === 0) return;
    setLoading(true);
    setError(null);
    setResults([]);

    const newResults: WalletResult[] = [];
    for (const chainId of selectedChains) {
      try {
        const res = await fetch(
          `https://cryptoreportkit.com/api/v1/wallet/${chainId}?address=${encodeURIComponent(address.trim())}`,
        );
        if (res.ok) newResults.push(await res.json());
      } catch { /* skip */ }
    }

    if (newResults.length === 0) {
      setError('Could not fetch balance from any selected chain');
    }
    setResults(newResults);
    setLoading(false);
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Wallet className="w-6 h-6 text-emerald-400" />
        <div>
          <h1 className="text-2xl font-bold">Multi-Chain Wallet</h1>
          <p className="text-gray-400 text-sm mt-0.5">View balances across 8 blockchains</p>
        </div>
      </div>

      {/* Chain selector */}
      <div className="flex flex-wrap gap-2">
        {CHAINS.map((chain) => (
          <button
            key={chain.id}
            type="button"
            onClick={() => toggleChain(chain.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
              selectedChains.includes(chain.id)
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                : 'border-gray-700/50 bg-gray-800/40 text-gray-400 hover:text-white'
            }`}
          >
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chain.color }} />
            {chain.name}
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
            placeholder="Enter wallet address (0x... or Solana/Cosmos)"
            className="w-full bg-gray-800/60 border border-gray-700/50 rounded-lg px-4 py-2.5 pl-10 text-sm focus:outline-none focus:border-emerald-500/50"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={loading || !address.trim()}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-lg font-medium text-sm transition flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
          Scan
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          {/* Address bar */}
          <div className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <code className="text-emerald-400 font-mono text-xs">{address.slice(0, 10)}...{address.slice(-8)}</code>
              <button type="button" onClick={copyAddress} className="text-gray-500 hover:text-white transition">
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <span className="text-xs text-gray-500">{results.length} chain{results.length !== 1 ? 's' : ''}</span>
          </div>

          {results.map((result) => {
            const chain = CHAINS.find((c) => c.name === result.chain) || CHAINS[0];
            return (
              <div key={result.chain} className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-700/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: chain.color + '20' }}>
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chain.color }} />
                    </div>
                    <span className="font-medium text-sm">{result.chain}</span>
                    <span className="text-xs text-gray-500">{result.nativeBalance.toFixed(6)} {result.nativeSymbol}</span>
                  </div>
                </div>

                {/* Native */}
                <div className="px-4 py-2.5 bg-gray-900/30 flex items-center justify-between">
                  <span className="text-sm font-medium">{result.nativeSymbol}</span>
                  <span className="font-mono text-sm">{result.nativeBalance.toFixed(6)}</span>
                </div>

                {/* Tokens */}
                {result.tokens.map((tok, i) => (
                  <div key={i} className="px-4 py-2 flex items-center justify-between border-t border-gray-700/30">
                    <span className="text-sm text-gray-300">{tok.symbol}</span>
                    <span className="font-mono text-sm text-gray-400">{tok.balance.toFixed(4)}</span>
                  </div>
                ))}

                {result.tokens.length === 0 && (
                  <div className="px-4 py-2 text-xs text-gray-600 border-t border-gray-700/30">No tokens found</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && results.length === 0 && !error && (
        <div className="bg-gray-800/30 border border-gray-700/30 rounded-xl p-12 text-center">
          <Globe className="w-12 h-12 mx-auto mb-3 text-gray-700" />
          <p className="text-gray-400 text-sm">Paste any wallet address to scan balances across 8 chains</p>
        </div>
      )}
    </div>
  );
}
