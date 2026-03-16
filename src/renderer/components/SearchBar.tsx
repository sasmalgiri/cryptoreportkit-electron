import { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { searchCoins } from '../hooks/useElectron';

interface SearchBarProps {
  onSelect: (coin: { id: string; symbol: string; name: string }) => void;
  placeholder?: string;
}

export function SearchBar({ onSelect, placeholder = 'Search coins...' }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<
    { id: string; name: string; symbol: string; thumb: string | null }[]
  >([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchCoins(query);
        setResults(data.coins.slice(0, 8));
        setOpen(true);
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 300);
  }, [query]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-gray-800/60 border border-gray-700/50 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
          {results.map((coin) => (
            <button
              key={coin.id}
              onClick={() => {
                onSelect({ id: coin.id, symbol: coin.symbol, name: coin.name });
                setQuery('');
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-700/50 transition text-left"
            >
              {coin.thumb && (
                <img src={coin.thumb} alt="" className="w-5 h-5 rounded-full" />
              )}
              <span className="text-sm text-white">{coin.name}</span>
              <span className="text-xs text-gray-500 uppercase ml-auto">
                {coin.symbol}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
