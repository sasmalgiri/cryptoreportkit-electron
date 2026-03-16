// Bridge layer: replaces useTauri.ts — all calls go through electronAPI (preload.js)

import type {
  CoinMarket,
  CoinDetail,
  GlobalMarketData,
  SearchResult,
  OhlcvData,
  PortfolioEntry,
  PortfolioSummary,
  WatchlistItem,
  AppSettings,
  LicenseResult,
  LicenseStatus,
  FearGreedEntry,
  PriceAlert,
  MarketChartData,
  CoinSimplePrice,
} from '../types';

declare global {
  interface Window {
    electronAPI: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      isMaximized: () => Promise<boolean>;
      onMaximizedChanged: (cb: (val: boolean) => void) => void;
      onNavigate: (cb: (route: string) => void) => void;
      getMarkets: (params?: any) => Promise<any>;
      getCoinDetail: (id: string) => Promise<any>;
      getOhlc: (id: string, days?: number) => Promise<any>;
      getGlobalData: () => Promise<any>;
      searchCoins: (query: string) => Promise<any>;
      getTrending: () => Promise<any>;
      getFearGreed: () => Promise<any>;
      getCoinMarketChart: (id: string, days?: number) => Promise<any>;
      getSimplePrice: (ids: string, currencies?: string) => Promise<any>;
      addPortfolioEntry: (entry: any) => Promise<any>;
      getPortfolio: () => Promise<any[]>;
      updatePortfolioEntry: (id: string, entry: any) => Promise<any>;
      deletePortfolioEntry: (id: string) => Promise<any>;
      getPortfolioValue: () => Promise<any>;
      addToWatchlist: (coin: any) => Promise<any>;
      removeFromWatchlist: (coinId: string) => Promise<any>;
      getWatchlist: () => Promise<any[]>;
      addPriceAlert: (alert: any) => Promise<any>;
      getPriceAlerts: () => Promise<any[]>;
      deletePriceAlert: (id: string) => Promise<any>;
      togglePriceAlert: (id: string) => Promise<any>;
      getSettings: () => Promise<any>;
      updateSettings: (key: string, value: any) => Promise<any>;
      setApiKey: (key: string) => Promise<any>;
      getApiKey: () => Promise<string | null>;
      deleteApiKey: () => Promise<any>;
      hasApiKey: () => Promise<boolean>;
      validateLicense: (key: string) => Promise<any>;
      getLicenseStatus: () => Promise<any>;
      openExternal: (url: string) => Promise<void>;
    };
  }
}

const api = () => window.electronAPI;

/* ------------------------------------------------------------------ */
/*  CoinGecko                                                          */
/* ------------------------------------------------------------------ */

export async function getMarkets(
  vsCurrency = 'usd',
  page = 1,
  perPage = 100,
): Promise<CoinMarket[]> {
  return api().getMarkets({ currency: vsCurrency, page, per_page: perPage });
}

export async function getCoinDetail(coinId: string): Promise<CoinDetail> {
  return api().getCoinDetail(coinId);
}

export async function getOhlc(
  coinId: string,
  vsCurrency = 'usd',
  days = 30,
): Promise<OhlcvData> {
  return api().getOhlc(coinId, days);
}

export async function getGlobalData(): Promise<GlobalMarketData> {
  return api().getGlobalData();
}

export async function searchCoins(query: string): Promise<SearchResult> {
  return api().searchCoins(query);
}

export async function getTrending() {
  return api().getTrending();
}

export async function getFearGreed(): Promise<{ data: FearGreedEntry[] }> {
  return api().getFearGreed();
}

/* ------------------------------------------------------------------ */
/*  Portfolio                                                           */
/* ------------------------------------------------------------------ */

export async function addPortfolioEntry(params: {
  coinId: string;
  symbol: string;
  name: string;
  amount: number;
  buyPrice: number;
  buyDate: string;
  notes?: string;
}): Promise<PortfolioEntry> {
  return api().addPortfolioEntry({
    coin_id: params.coinId,
    symbol: params.symbol,
    name: params.name,
    amount: params.amount,
    buy_price: params.buyPrice,
    buy_date: params.buyDate,
    notes: params.notes,
  });
}

export async function getPortfolio(): Promise<PortfolioEntry[]> {
  return api().getPortfolio();
}

export async function updatePortfolioEntry(params: {
  id: string;
  amount: number;
  buyPrice: number;
  notes?: string;
}): Promise<void> {
  return api().updatePortfolioEntry(params.id, {
    amount: params.amount,
    buy_price: params.buyPrice,
    notes: params.notes,
  });
}

export async function deletePortfolioEntry(id: string): Promise<void> {
  return api().deletePortfolioEntry(id);
}

export async function getPortfolioValue(
  vsCurrency = 'usd',
): Promise<PortfolioSummary> {
  return api().getPortfolioValue();
}

/* ------------------------------------------------------------------ */
/*  Watchlist                                                           */
/* ------------------------------------------------------------------ */

export async function addToWatchlist(
  coinId: string,
  symbol?: string,
  name?: string,
): Promise<void> {
  return api().addToWatchlist({ coin_id: coinId, symbol, name });
}

export async function removeFromWatchlist(coinId: string): Promise<void> {
  return api().removeFromWatchlist(coinId);
}

export async function getWatchlist(): Promise<WatchlistItem[]> {
  return api().getWatchlist();
}

/* ------------------------------------------------------------------ */
/*  Keychain                                                            */
/* ------------------------------------------------------------------ */

export async function setApiKey(key: string): Promise<void> {
  return api().setApiKey(key);
}

export async function getApiKey(): Promise<string | null> {
  return api().getApiKey();
}

export async function deleteApiKey(): Promise<void> {
  return api().deleteApiKey();
}

export async function hasApiKey(): Promise<boolean> {
  return api().hasApiKey();
}

/* ------------------------------------------------------------------ */
/*  License                                                             */
/* ------------------------------------------------------------------ */

export async function validateLicense(key: string): Promise<LicenseResult> {
  return api().validateLicense(key);
}

export async function getLicenseStatus(): Promise<LicenseStatus> {
  return api().getLicenseStatus();
}

/* ------------------------------------------------------------------ */
/*  Settings                                                            */
/* ------------------------------------------------------------------ */

export async function getSettings(): Promise<AppSettings> {
  return api().getSettings();
}

export async function updateSettings(settings: Partial<AppSettings>): Promise<void> {
  for (const [key, value] of Object.entries(settings)) {
    await api().updateSettings(key, value);
  }
}

/* ------------------------------------------------------------------ */
/*  Alerts                                                              */
/* ------------------------------------------------------------------ */

export async function addPriceAlert(coinId: string, targetPrice: number, direction: string): Promise<PriceAlert> {
  return api().addPriceAlert({ coin_id: coinId, target_price: targetPrice, direction });
}

export async function getPriceAlerts(): Promise<PriceAlert[]> {
  return api().getPriceAlerts();
}

export async function deletePriceAlert(id: string): Promise<void> {
  return api().deletePriceAlert(id);
}

export async function togglePriceAlert(id: string): Promise<void> {
  return api().togglePriceAlert(id);
}

/* ------------------------------------------------------------------ */
/*  Extended CoinGecko                                                  */
/* ------------------------------------------------------------------ */

export async function getCoinMarketChart(coinId: string, vsCurrency = 'usd', days = 30): Promise<MarketChartData> {
  return api().getCoinMarketChart(coinId, days);
}

export async function getSimplePrice(ids: string): Promise<Record<string, CoinSimplePrice>> {
  return api().getSimplePrice(ids);
}
