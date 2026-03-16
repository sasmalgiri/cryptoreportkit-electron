import { useState, useEffect, useCallback, useRef } from 'react';
import { getMarkets, getGlobalData, getFearGreed } from './useElectron';
import { useAppStore } from '../stores/appStore';
import type { CoinMarket, GlobalMarketData, FearGreedEntry } from '../types';

export function useMarketData(refreshInterval = 60000) {
  const [markets, setMarkets] = useState<CoinMarket[]>([]);
  const [globalData, setGlobalData] = useState<GlobalMarketData | null>(null);
  const [fearGreed, setFearGreed] = useState<FearGreedEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currency = useAppStore((s) => s.currency);
  const setLastUpdate = useAppStore((s) => s.setLastUpdate);
  const setIsOnline = useAppStore((s) => s.setIsOnline);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [marketsData, global, fg] = await Promise.allSettled([
        getMarkets(currency, 1, 100),
        getGlobalData(),
        getFearGreed(),
      ]);

      if (marketsData.status === 'fulfilled') {
        setMarkets(marketsData.value);
        setIsOnline(true);
      }

      if (global.status === 'fulfilled') {
        setGlobalData(global.value);
      }

      if (fg.status === 'fulfilled' && fg.value.data?.[0]) {
        setFearGreed(fg.value.data[0]);
      }

      setLastUpdate(Date.now());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setIsOnline(false);
    } finally {
      setLoading(false);
    }
  }, [currency, setLastUpdate, setIsOnline]);

  useEffect(() => {
    fetchData();

    intervalRef.current = setInterval(fetchData, refreshInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData, refreshInterval]);

  return { markets, globalData, fearGreed, loading, error, refetch: fetchData };
}
