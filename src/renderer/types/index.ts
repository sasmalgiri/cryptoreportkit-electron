/* ------------------------------------------------------------------ */
/*  CoinGecko Types                                                    */
/* ------------------------------------------------------------------ */

export interface CoinMarket {
  id: string;
  symbol: string;
  name: string;
  image: string | null;
  current_price: number | null;
  market_cap: number | null;
  market_cap_rank: number | null;
  total_volume: number | null;
  price_change_percentage_24h: number | null;
  price_change_percentage_7d_in_currency: number | null;
  circulating_supply: number | null;
  total_supply: number | null;
  ath: number | null;
  ath_change_percentage: number | null;
  sparkline_in_7d: { price: number[] } | null;
}

export interface CoinDetail {
  id: string;
  symbol: string;
  name: string;
  description: Record<string, string> | null;
  image: { large?: string; small?: string; thumb?: string } | null;
  market_data: {
    current_price: Record<string, number> | null;
    market_cap: Record<string, number> | null;
    total_volume: Record<string, number> | null;
    price_change_percentage_24h: number | null;
    price_change_percentage_7d: number | null;
    price_change_percentage_30d: number | null;
  } | null;
  links: {
    homepage: string[] | null;
    blockchain_site: string[] | null;
  } | null;
}

export interface GlobalMarketData {
  data: {
    total_market_cap: Record<string, number> | null;
    total_volume: Record<string, number> | null;
    market_cap_percentage: Record<string, number> | null;
    market_cap_change_percentage_24h_usd: number | null;
    active_cryptocurrencies: number | null;
  };
}

export interface TrendingCoin {
  item: {
    id: string;
    name: string;
    symbol: string;
    market_cap_rank: number | null;
    thumb: string | null;
    small: string | null;
    price_btc: number | null;
    data: {
      price: number | null;
      price_change_percentage_24h: Record<string, number> | null;
    } | null;
  };
}

export interface FearGreedEntry {
  value: string;
  value_classification: string;
  timestamp: string;
}

export type OhlcvData = [number, number, number, number, number][];

/* ------------------------------------------------------------------ */
/*  Portfolio Types                                                     */
/* ------------------------------------------------------------------ */

export interface PortfolioEntry {
  id: string;
  coin_id: string;
  symbol: string;
  name: string;
  amount: number;
  buy_price: number;
  buy_date: string;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface PortfolioEntryWithValue {
  entry: PortfolioEntry;
  current_price: number;
  current_value: number;
  pnl: number;
  pnl_percentage: number;
}

export interface PortfolioSummary {
  total_invested: number;
  current_value: number;
  total_pnl: number;
  total_pnl_percentage: number;
  entries: PortfolioEntryWithValue[];
}

/* ------------------------------------------------------------------ */
/*  Watchlist Types                                                     */
/* ------------------------------------------------------------------ */

export interface WatchlistItem {
  coin_id: string;
  symbol: string | null;
  name: string | null;
  added_at: string | null;
}

/* ------------------------------------------------------------------ */
/*  Settings Types                                                      */
/* ------------------------------------------------------------------ */

export interface AppSettings {
  currency: string;
  refresh_interval: number;
  tray_coins: string[];
  theme: string;
}

export interface LicenseResult {
  valid: boolean;
  tier: string;
  message: string;
}

export interface LicenseStatus {
  has_license: boolean;
  tier: string;
  key_preview: string | null;
}

/* ------------------------------------------------------------------ */
/*  Search Types                                                        */
/* ------------------------------------------------------------------ */

export interface SearchResult {
  coins: {
    id: string;
    name: string;
    symbol: string;
    market_cap_rank: number | null;
    thumb: string | null;
    large: string | null;
  }[];
}

/* ------------------------------------------------------------------ */
/*  Price Alert Types                                                   */
/* ------------------------------------------------------------------ */

export interface PriceAlert {
  id: string;
  coin_id: string;
  target_price: number;
  direction: 'above' | 'below';
  active: boolean;
  created_at: string | null;
}

/* ------------------------------------------------------------------ */
/*  Market Chart Types                                                  */
/* ------------------------------------------------------------------ */

export interface MarketChartData {
  prices: [number, number][];
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

export interface CoinSimplePrice {
  usd: number | null;
  usd_24h_change: number | null;
  usd_24h_vol: number | null;
  usd_market_cap: number | null;
}
