import { useState } from 'react';
import {
  Image,
  Search,
  Loader2,
  AlertTriangle,
  Grid3x3,
  List,
  DollarSign,
} from 'lucide-react';

interface OwnedNft {
  tokenId: string;
  contractAddress: string;
  name: string;
  collectionName: string;
  imageUrl?: string;
  chain: string;
  standard: 'ERC-721' | 'ERC-1155';
  floorPrice?: number;
  estimatedValue?: number;
}

interface CollectionBreakdown {
  collection: string;
  count: number;
  floorPrice?: number;
  totalValue: number;
}

const CHAINS = [
  { id: 'ethereum', name: 'Ethereum', color: '#627EEA' },
  { id: 'polygon', name: 'Polygon', color: '#8247E5' },
  { id: 'arbitrum', name: 'Arbitrum', color: '#28A0F0' },
  { id: 'base', name: 'Base', color: '#0052FF' },
];

export default function NftPortfolio() {
  const [address, setAddress] = useState('');
  const [chain, setChain] = useState('ethereum');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nfts, setNfts] = useState<OwnedNft[]>([]);
  const [collections, setCollections] = useState<CollectionBreakdown[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!address.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `https://cryptoreportkit.com/api/v1/nfts/portfolio?address=${encodeURIComponent(address.trim())}&chain=${chain}`,
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed: ${res.status}`);
      }
      const data = await res.json();
      setNfts(data.nfts || []);
      setCollections(data.collectionBreakdown || []);
      setTotalValue(data.totalEstimatedValue || 0);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch NFTs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Image className="w-6 h-6 text-emerald-400" />
        <div>
          <h1 className="text-2xl font-bold">NFT Portfolio</h1>
          <p className="text-gray-400 text-sm mt-0.5">Track NFT holdings with floor prices</p>
        </div>
      </div>

      {/* Chain + Search */}
      <div className="flex flex-wrap gap-3">
        <div className="flex bg-gray-800/60 rounded-lg p-0.5">
          {CHAINS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setChain(c.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition ${
                chain === c.id ? 'bg-emerald-500/15 text-emerald-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
              {c.name}
            </button>
          ))}
        </div>

        <div className="flex-1 min-w-[240px] flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Wallet address (0x...)"
              className="w-full bg-gray-800/60 border border-gray-700/50 rounded-lg px-3 py-2.5 pl-9 text-sm focus:outline-none focus:border-emerald-500/50"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          </div>
          <button
            type="button"
            onClick={handleSearch}
            disabled={loading || !address.trim()}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-lg font-medium text-sm transition"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Scan'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {searched && nfts.length > 0 && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
              <div className="text-xs text-gray-400">Total NFTs</div>
              <div className="text-xl font-bold mt-1">{nfts.length}</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
              <div className="text-xs text-gray-400">Collections</div>
              <div className="text-xl font-bold mt-1">{collections.length}</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
              <div className="flex items-center gap-1 text-xs text-gray-400"><DollarSign className="w-3 h-3" />Est. Value</div>
              <div className="text-xl font-bold mt-1 text-emerald-400">${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            </div>
          </div>

          {/* Collection breakdown */}
          {collections.length > 0 && (
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-700/50 text-sm font-medium text-gray-300">Collections</div>
              {collections.map((col, i) => (
                <div key={i} className="px-4 py-2.5 flex items-center justify-between border-t border-gray-700/30">
                  <div>
                    <span className="text-sm">{col.collection}</span>
                    <span className="text-xs text-gray-500 ml-2">{col.count} items</span>
                  </div>
                  <span className="text-sm text-emerald-400">${col.totalValue.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {/* View toggle */}
          <div className="flex justify-end">
            <div className="flex bg-gray-800/60 rounded-lg p-0.5">
              <button type="button" onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition ${viewMode === 'grid' ? 'bg-emerald-500/15 text-emerald-400' : 'text-gray-500'}`}>
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => setViewMode('list')}
                className={`p-1.5 rounded transition ${viewMode === 'list' ? 'bg-emerald-500/15 text-emerald-400' : 'text-gray-500'}`}>
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Grid */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {nfts.map((nft, i) => (
                <div key={i} className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden hover:border-emerald-500/30 transition">
                  <div className="aspect-square bg-gray-900/50 flex items-center justify-center">
                    {nft.imageUrl ? <img src={nft.imageUrl} alt={nft.name} className="w-full h-full object-cover" /> : <Image className="w-10 h-10 text-gray-700" />}
                  </div>
                  <div className="p-2.5">
                    <p className="text-[11px] text-gray-500 truncate">{nft.collectionName}</p>
                    <p className="text-sm font-medium truncate">{nft.name}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] px-1 py-0.5 rounded bg-gray-700/50 text-gray-400">{nft.standard}</span>
                      {nft.floorPrice !== undefined && <span className="text-xs text-emerald-400">${nft.floorPrice.toFixed(2)}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700/50 text-gray-400 text-xs">
                    <th className="text-left px-4 py-2">NFT</th>
                    <th className="text-left px-4 py-2">Collection</th>
                    <th className="text-right px-4 py-2">Floor</th>
                  </tr>
                </thead>
                <tbody>
                  {nfts.map((nft, i) => (
                    <tr key={i} className="border-t border-gray-700/30 hover:bg-gray-700/20">
                      <td className="px-4 py-2 truncate max-w-[200px]">{nft.name}</td>
                      <td className="px-4 py-2 text-gray-400">{nft.collectionName}</td>
                      <td className="px-4 py-2 text-right">{nft.floorPrice !== undefined ? `$${nft.floorPrice.toFixed(2)}` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {searched && nfts.length === 0 && !error && (
        <div className="bg-gray-800/30 border border-gray-700/30 rounded-xl p-12 text-center">
          <Image className="w-12 h-12 mx-auto mb-3 text-gray-700" />
          <p className="text-gray-400 text-sm">No NFTs found on {CHAINS.find(c => c.id === chain)?.name}</p>
        </div>
      )}

      {!searched && (
        <div className="bg-gray-800/30 border border-gray-700/30 rounded-xl p-12 text-center">
          <Image className="w-12 h-12 mx-auto mb-3 text-gray-700" />
          <p className="text-gray-400 text-sm">Paste any wallet address to discover owned NFTs</p>
        </div>
      )}
    </div>
  );
}
