import { useState, useEffect, useCallback } from 'react';
import {
  getPortfolio,
  getPortfolioValue,
  addPortfolioEntry,
  updatePortfolioEntry,
  deletePortfolioEntry,
} from './useElectron';
import { useAppStore } from '../stores/appStore';
import type { PortfolioEntry, PortfolioSummary } from '../types';

export function usePortfolio() {
  const [entries, setEntries] = useState<PortfolioEntry[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currency = useAppStore((s) => s.currency);

  const fetchEntries = useCallback(async () => {
    try {
      const data = await getPortfolio();
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      const data = await getPortfolioValue(currency);
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [currency]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchEntries(), fetchSummary()]);
    setLoading(false);
  }, [fetchEntries, fetchSummary]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addEntry = useCallback(
    async (params: {
      coinId: string;
      symbol: string;
      name: string;
      amount: number;
      buyPrice: number;
      buyDate: string;
      notes?: string;
    }) => {
      await addPortfolioEntry(params);
      await refresh();
    },
    [refresh],
  );

  const updateEntry = useCallback(
    async (params: {
      id: string;
      amount: number;
      buyPrice: number;
      notes?: string;
    }) => {
      await updatePortfolioEntry(params);
      await refresh();
    },
    [refresh],
  );

  const removeEntry = useCallback(
    async (id: string) => {
      await deletePortfolioEntry(id);
      await refresh();
    },
    [refresh],
  );

  return {
    entries,
    summary,
    loading,
    error,
    addEntry,
    updateEntry,
    removeEntry,
    refresh,
  };
}
