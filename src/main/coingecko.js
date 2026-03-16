const { ipcMain } = require('electron');

// In-memory cache with TTL
const cache = new Map();
const CACHE_TTL = {
  markets: 60,
  detail: 300,
  ohlc: 300,
  global: 120,
  search: 600,
  trending: 300,
  feargreed: 300,
  chart: 300,
  price: 30,
};

// Rate limiter: 30 req/min for free tier
let requestCount = 0;
let windowStart = Date.now();

// Circuit breaker
let failureCount = 0;
let circuitOpen = false;
let circuitOpenTime = 0;

function getCached(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() - item.time > item.ttl * 1000) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

function setCache(key, data, ttl) {
  cache.set(key, { data, time: Date.now(), ttl });
}

async function rateLimitedFetch(url, apiKey) {
  // Circuit breaker check
  if (circuitOpen) {
    if (Date.now() - circuitOpenTime > 60000) {
      circuitOpen = false;
      failureCount = 0;
    } else {
      throw new Error('Circuit breaker open - too many failures');
    }
  }

  // Rate limit check
  const now = Date.now();
  if (now - windowStart > 60000) {
    requestCount = 0;
    windowStart = now;
  }
  if (requestCount >= 28) {
    await new Promise((r) => setTimeout(r, 2000));
  }
  requestCount++;

  const headers = {};
  let baseUrl;
  if (apiKey) {
    baseUrl = 'https://pro-api.coingecko.com/api/v3';
    headers['x-cg-pro-api-key'] = apiKey;
  } else {
    baseUrl = 'https://api.coingecko.com/api/v3';
  }

  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

  const res = await fetch(fullUrl, { headers, signal: AbortSignal.timeout(15000) });

  if (!res.ok) {
    failureCount++;
    if (failureCount >= 5) {
      circuitOpen = true;
      circuitOpenTime = Date.now();
    }
    throw new Error(`CoinGecko API error: ${res.status}`);
  }

  failureCount = Math.max(0, failureCount - 1);
  return res.json();
}

// Get API key from keychain (lazy import to avoid circular deps)
let cachedApiKey = undefined;
async function getApiKey() {
  if (cachedApiKey !== undefined) return cachedApiKey;
  try {
    const keytar = require('keytar');
    cachedApiKey = await keytar.getPassword('cryptoreportkit', 'coingecko-api-key');
    return cachedApiKey;
  } catch {
    cachedApiKey = null;
    return null;
  }
}

// Reset cached key when it changes
function invalidateApiKeyCache() {
  cachedApiKey = undefined;
}

function registerCoinGeckoHandlers() {
  ipcMain.handle('coingecko:getMarkets', async (_event, params = {}) => {
    const currency = params.currency || 'usd';
    const page = params.page || 1;
    const perPage = params.per_page || 50;
    const cacheKey = `markets:${currency}:${page}:${perPage}`;

    const cached = getCached(cacheKey);
    if (cached) return cached;

    const apiKey = await getApiKey();
    const data = await rateLimitedFetch(
      `/coins/markets?vs_currency=${currency}&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=true&price_change_percentage=1h,24h,7d`,
      apiKey
    );
    setCache(cacheKey, data, CACHE_TTL.markets);
    return data;
  });

  ipcMain.handle('coingecko:getCoinDetail', async (_event, id) => {
    const cacheKey = `detail:${id}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const apiKey = await getApiKey();
    const data = await rateLimitedFetch(
      `/coins/${id}?localization=false&tickers=false&community_data=false&developer_data=false`,
      apiKey
    );
    setCache(cacheKey, data, CACHE_TTL.detail);
    return data;
  });

  ipcMain.handle('coingecko:getOhlc', async (_event, id, days = 30) => {
    const cacheKey = `ohlc:${id}:${days}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const apiKey = await getApiKey();
    const data = await rateLimitedFetch(`/coins/${id}/ohlc?vs_currency=usd&days=${days}`, apiKey);
    setCache(cacheKey, data, CACHE_TTL.ohlc);
    return data;
  });

  ipcMain.handle('coingecko:getGlobalData', async () => {
    const cached = getCached('global');
    if (cached) return cached;

    const apiKey = await getApiKey();
    const data = await rateLimitedFetch('/global', apiKey);
    setCache('global', data, CACHE_TTL.global);
    return data;
  });

  ipcMain.handle('coingecko:searchCoins', async (_event, query) => {
    const cacheKey = `search:${query}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const apiKey = await getApiKey();
    const data = await rateLimitedFetch(`/search?query=${encodeURIComponent(query)}`, apiKey);
    setCache(cacheKey, data, CACHE_TTL.search);
    return data;
  });

  ipcMain.handle('coingecko:getTrending', async () => {
    const cached = getCached('trending');
    if (cached) return cached;

    const apiKey = await getApiKey();
    const data = await rateLimitedFetch('/search/trending', apiKey);
    setCache('trending', data, CACHE_TTL.trending);
    return data;
  });

  ipcMain.handle('coingecko:getFearGreed', async () => {
    const cached = getCached('feargreed');
    if (cached) return cached;

    const data = await rateLimitedFetch('https://api.alternative.me/fng/?limit=30', null);
    setCache('feargreed', data, CACHE_TTL.feargreed);
    return data;
  });

  ipcMain.handle('coingecko:getCoinMarketChart', async (_event, id, days = 30) => {
    const cacheKey = `chart:${id}:${days}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const apiKey = await getApiKey();
    const data = await rateLimitedFetch(
      `/coins/${id}/market_chart?vs_currency=usd&days=${days}`,
      apiKey
    );
    setCache(cacheKey, data, CACHE_TTL.chart);
    return data;
  });

  ipcMain.handle('coingecko:getSimplePrice', async (_event, ids, currencies = 'usd') => {
    const cacheKey = `price:${ids}:${currencies}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const apiKey = await getApiKey();
    const data = await rateLimitedFetch(
      `/simple/price?ids=${ids}&vs_currencies=${currencies}&include_24hr_change=true&include_market_cap=true`,
      apiKey
    );
    setCache(cacheKey, data, CACHE_TTL.price);
    return data;
  });
}

module.exports = { registerCoinGeckoHandlers, invalidateApiKeyCache };
