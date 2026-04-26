import {
  useQuery,
  useQueries,
  useMutation,
  type QueryClient,
} from '@tanstack/react-query';
import { NEWS_SOURCES, fetchWithProxyFallback } from '@/shared/api/news';
import type { ProxyFetchResult } from '@/shared/api/news';
import type {
  Trade, EquityPoint, ServerHealth, PriceData, StatsResponse, FtmPortfolio,
  Candle, Indicators, FearGreedData, Timeframe, ClaudeSignal, Asset, MacroData,
} from '@/shared/types';
import {
  DEMO_LOGS, DEMO_EQUITY, DEMO_HEALTH, DEMO_STATS, DEMO_PORTFOLIO,
  DEMO_FTMO_EQUITY, DEMO_FTMO_STATS, MACRO_DEMO_DATA,
} from '@/shared/utils/demo';
import { useAppStore } from '@/shared/store/useAppStore';
import { ASSETS } from '@/shared/utils/assets';
import { calcRSI, calcMACD, calcBB } from '@/shared/utils/indicators';

// ── Cache lifetime constants ──────────────────────────────────────────
const CACHE = {
  PRICE:   { staleTime: 10_000,  gcTime: 30_000  },
  NEWS:    { staleTime: 300_000, gcTime: 900_000  },
  MACRO:   { staleTime: 300_000, gcTime: 900_000  },
  AI:      {                     gcTime: 120_000  },  // mutations: gcTime only
  BACKEND: { staleTime: 0,       gcTime: 600_000, refetchOnMount: true as const },
} as const;

// ── Anthropic endpoint ────────────────────────────────────────────────
const ANTHROPIC_ENDPOINT = import.meta.env.DEV
  ? '/anthropic/v1/messages'
  : 'https://api.anthropic.com/v1/messages';

// ── Backend base: in prod all VPS calls go through edge proxy ─────────
// Avoids mixed-content (HTTP VPS from HTTPS Vercel) and CORS issues.
// In dev, uses serverUrl directly so you can point at localhost.
const backendBase = (serverUrl: string): string =>
  import.meta.env.DEV ? serverUrl : 'https://importance-majority-asked-holland.trycloudflare.com';

// ── Demo fallback prices ──────────────────────────────────────────────
const DEMO_BASE_PRICES: Record<string, number> = {
  BTCUSDT: 67000, ETHUSDT: 3200, BNBUSDT: 580, SOLUSDT: 145,
  EURUSD: 1.085, GBPUSD: 1.265, USDJPY: 149.5, USDCHF: 0.905,
  AUDUSD: 0.655, USDCAD: 1.365, NZDUSD: 0.605,
  EURJPY: 162.2, GBPJPY: 189.1, EURGBP: 0.857,
  SPX: 5200, NDX: 18200, IDAX: 17800, IFTSE: 7650, NKY: 38500,
  XAUUSD: 2340, XAGUSD: 27.5, WTIUSD: 78.5,
};

const BINANCE_INTERVAL: Record<Timeframe, string> = {
  '15m': '15m', '1h': '1h', '4h': '4h', '1d': '1d',
};
const TWELVE_INTERVAL: Record<Timeframe, string> = {
  '15m': '15min', '1h': '1h', '4h': '4h', '1d': '1day',
};

// ── Private fetchers ──────────────────────────────────────────────────

async function fetchPrice(asset: Asset, twelveKey: string): Promise<{ price: number; chg: number } | null> {
  if (asset.binance) {
    try {
      const r = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${asset.id}`);
      if (!r.ok) throw new Error();
      const d = await r.json() as { lastPrice: string; priceChangePercent: string };
      return { price: parseFloat(d.lastPrice), chg: parseFloat(d.priceChangePercent) };
    } catch { /* fall through */ }
  }
  if (asset.twelveSymbol && twelveKey) {
    try {
      const r = await fetch(
        `https://api.twelvedata.com/quote?symbol=${asset.twelveSymbol}&apikey=${twelveKey}`
      );
      if (!r.ok) throw new Error();
      const d = await r.json() as { close?: string; percent_change?: string };
      if (d.close) return {
        price: parseFloat(d.close),
        chg:   parseFloat(d.percent_change ?? '0'),
      };
    } catch { /* fall through */ }
  }
  const base = DEMO_BASE_PRICES[asset.id];
  if (base == null) return null;
  const jitter = (Math.random() - 0.5) * base * 0.002;
  return { price: +(base + jitter).toFixed(4), chg: +((Math.random() - 0.5) * 2).toFixed(2) };
}

async function fetchCandles(
  asset: Asset, twelveKey: string, timeframe: Timeframe, limit = 150
): Promise<Candle[]> {
  if (asset.binance) {
    try {
      const r = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${asset.id}&interval=${BINANCE_INTERVAL[timeframe]}&limit=${limit}`
      );
      const d = await r.json() as Array<[number, string, string, string, string, string]>;
      if (Array.isArray(d)) return d.map(k => ({
        ts: k[0], open: +k[1], high: +k[2], low: +k[3], close: +k[4], vol: +k[5],
      }));
    } catch { /* fall through */ }
  }
  if (asset.twelveSymbol && twelveKey) {
    try {
      const r = await fetch(
        `https://api.twelvedata.com/time_series?symbol=${asset.twelveSymbol}&interval=${TWELVE_INTERVAL[timeframe]}&outputsize=${limit}&apikey=${twelveKey}`
      );
      const d = await r.json() as {
        values?: Array<{ datetime: string; open: string; high: string; low: string; close: string; volume?: string }>;
      };
      if (d.values) return d.values.reverse().map(v => ({
        ts: new Date(v.datetime).getTime(),
        open: +v.open, high: +v.high, low: +v.low, close: +v.close, vol: +(v.volume ?? 0),
      }));
    } catch { /* fall through */ }
  }
  // Demo fallback — deterministic random walk
  const base = DEMO_BASE_PRICES[asset.id] ?? 100;
  let p = base;
  const msPer: Record<Timeframe, number> = {
    '15m': 900_000, '1h': 3_600_000, '4h': 14_400_000, '1d': 86_400_000,
  };
  const ms  = msPer[timeframe];
  const now = Date.now();
  return Array.from({ length: limit }, (_, i) => {
    const o   = p;
    const chg = (Math.random() - 0.49) * base * 0.004;
    p = +(p + chg).toFixed(base > 100 ? 2 : 4);
    const hi = +(Math.max(o, p) + Math.random() * base * 0.0015).toFixed(base > 100 ? 2 : 4);
    const lo = +(Math.min(o, p) - Math.random() * base * 0.0015).toFixed(base > 100 ? 2 : 4);
    return { ts: now - (limit - i) * ms, open: o, high: hi, low: lo, close: p, vol: Math.floor(Math.random() * 5000 + 500) };
  });
}

function lastIndicators(candles: Candle[]): Indicators {
  const closes  = candles.map(c => c.close);
  const rsiArr  = calcRSI(closes, 14).filter(isFinite);
  const macdArr = calcMACD(closes);
  const bbArr   = calcBB(closes);
  const lastMacd = macdArr.length ? macdArr[macdArr.length - 1] : null;
  const lastBB   = bbArr.length   ? bbArr[bbArr.length - 1]     : null;
  return {
    rsi:      rsiArr.length ? rsiArr[rsiArr.length - 1] : undefined,
    macd:     lastMacd?.macd,
    signal:   lastMacd?.signal,
    hist:     lastMacd?.hist,
    bb_mid:   lastBB?.mid,
    bb_upper: lastBB?.upper,
    bb_lower: lastBB?.lower,
  };
}

// ── Extracted queryFn implementations (reused by hooks + prefetch) ────

async function fetchAllPrices(twelveKey: string): Promise<PriceData> {
  const results = await Promise.allSettled(ASSETS.map(a => fetchPrice(a, twelveKey)));
  const prices: PriceData = {};
  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value) {
      prices[ASSETS[i].id] = {
        price:   r.value.price,
        chg:     r.value.chg,
        chg_pct: r.value.chg,
      };
    }
  });
  return prices;
}

async function fetchFearGreedIndex(): Promise<FearGreedData> {
  const res = await fetch('https://api.alternative.me/fng/?limit=1');
  if (!res.ok) throw new Error('Fear & Greed fetch failed');
  const json = await res.json() as {
    data: Array<{ value: string; value_classification: string; timestamp: string }>;
  };
  const entry = json.data[0];
  return {
    value: parseInt(entry.value, 10),
    label: entry.value_classification,
    ts:    parseInt(entry.timestamp, 10) * 1000,
  };
}

async function fetchMacroData(serverUrl: string, isDemoMode: boolean): Promise<MacroData> {
  if (isDemoMode || !serverUrl) return MACRO_DEMO_DATA;
  const res = await fetch(`${backendBase(serverUrl)}/enrichment/data`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<MacroData>;
}

// ── Backend hooks — BACKEND cache policy ─────────────────────────────

export function useTradeLog(serverUrl: string, isDemoMode: boolean) {
  const { data, isLoading, error } = useQuery<Trade[], Error>({
    queryKey: ['trade-log', serverUrl, isDemoMode],
    queryFn: async (): Promise<Trade[]> => {
      if (isDemoMode || !serverUrl) return DEMO_LOGS;
      const res = await fetch(`${backendBase(serverUrl)}/log?limit=50`);
      if (!res.ok) throw new Error('Failed to fetch trade log');
      return res.json() as Promise<Trade[]>;
    },
    ...CACHE.BACKEND,
    refetchInterval: isDemoMode || !serverUrl ? false : 15_000,
  });

  const exportCSV = () => {
    const headers = [
      'trade_id', 'ts', 'closed_at', 'symbol', 'direction', 'entry', 'sl',
      'action', 'quality', 'regime', 'h4_adx', 'lot_adj', 'bonus_count',
      'confidence', 'news_impact', 'outcome', 'profit', 'pips', 'is_fallback', 'reason',
    ];
    const rows = data?.map(l =>
      headers.map(k => JSON.stringify(l[k as keyof Trade] ?? '')).join(',')
    ) ?? [];
    const csv  = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `trades_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return { data, isLoading, error, exportCSV };
}

export function useEquity(serverUrl: string, isDemoMode: boolean, limit = 200) {
  const { data, isLoading, error } = useQuery<EquityPoint[], Error>({
    queryKey: ['equity', serverUrl, isDemoMode, limit],
    queryFn: async (): Promise<EquityPoint[]> => {
      if (isDemoMode || !serverUrl) return DEMO_EQUITY;
      const res = await fetch(`${backendBase(serverUrl)}/equity?limit=${limit}`);
      if (!res.ok) throw new Error('Failed to fetch equity');
      const raw = await res.json() as EquityPoint[];
      return raw.reverse();
    },
    ...CACHE.BACKEND,
    refetchInterval: isDemoMode || !serverUrl ? false : 15_000,
  });

  return { data, isLoading, error };
}

export function useFtmoData(serverUrl: string, isDemoMode: boolean) {
  const equity = useQuery<EquityPoint[], Error>({
    queryKey: ['ftmo-equity', serverUrl, isDemoMode],
    queryFn: async (): Promise<EquityPoint[]> => {
      if (isDemoMode || !serverUrl) return DEMO_FTMO_EQUITY;
      const res = await fetch(`${backendBase(serverUrl)}/equity?limit=500`);
      if (!res.ok) throw new Error('Failed to fetch FTMO equity');
      const raw = await res.json() as EquityPoint[];
      return raw.reverse();
    },
    ...CACHE.BACKEND,
    refetchInterval: isDemoMode || !serverUrl ? false : 20_000,
  });

  const portfolio = useQuery<FtmPortfolio, Error>({
    queryKey: ['ftmo-portfolio', serverUrl, isDemoMode],
    queryFn: async (): Promise<FtmPortfolio> => {
      if (isDemoMode || !serverUrl) return DEMO_PORTFOLIO;
      const res = await fetch(`${backendBase(serverUrl)}/portfolio`);
      if (!res.ok) throw new Error('Failed to fetch portfolio');
      return res.json() as Promise<FtmPortfolio>;
    },
    ...CACHE.BACKEND,
    refetchInterval: isDemoMode || !serverUrl ? false : 20_000,
  });

  const stats = useQuery<StatsResponse, Error>({
    queryKey: ['ftmo-stats', serverUrl, isDemoMode],
    queryFn: async (): Promise<StatsResponse> => {
      if (isDemoMode || !serverUrl) return DEMO_FTMO_STATS;
      const res = await fetch(`${backendBase(serverUrl)}/stats`);
      if (!res.ok) throw new Error('Failed to fetch FTMO stats');
      return res.json() as Promise<StatsResponse>;
    },
    ...CACHE.BACKEND,
    refetchInterval: isDemoMode || !serverUrl ? false : 20_000,
  });

  const isLoading = equity.isLoading || portfolio.isLoading || stats.isLoading;
  const error     = equity.error ?? portfolio.error ?? stats.error;

  return {
    equity:    equity.data    ?? (isDemoMode ? DEMO_FTMO_EQUITY : []),
    portfolio: portfolio.data ?? (isDemoMode ? DEMO_PORTFOLIO   : null),
    stats:     stats.data     ?? (isDemoMode ? DEMO_FTMO_STATS  : null),
    isLoading,
    error: error instanceof Error ? error.message : null,
  };
}

export function useServerHealth(serverUrl: string, isDemoMode: boolean) {
  const { data, isLoading, error } = useQuery<ServerHealth, Error>({
    queryKey: ['server-health', serverUrl, isDemoMode],
    queryFn: async (): Promise<ServerHealth> => {
      if (isDemoMode || !serverUrl) return DEMO_HEALTH;
      const res = await fetch(`${backendBase(serverUrl)}/health`);
      if (!res.ok) throw new Error('Health check failed');
      return res.json() as Promise<ServerHealth>;
    },
    ...CACHE.BACKEND,
    refetchInterval: isDemoMode || !serverUrl ? false : 30_000,
  });

  return { data, isLoading, error };
}

export function useMarketStats(serverUrl: string, isDemoMode: boolean) {
  const { data, isLoading, error } = useQuery<StatsResponse, Error>({
    queryKey: ['market-stats', serverUrl, isDemoMode],
    queryFn: async (): Promise<StatsResponse> => {
      if (isDemoMode || !serverUrl) return DEMO_STATS;
      const res = await fetch(`${backendBase(serverUrl)}/stats`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json() as Promise<StatsResponse>;
    },
    ...CACHE.BACKEND,
    refetchInterval: isDemoMode || !serverUrl ? false : 15_000,
  });

  return { data, isLoading, error };
}

// ── Market data hooks — PRICE cache policy ────────────────────────────

export function useAssetPrices(twelveKey: string) {
  const { data, isLoading, error } = useQuery<PriceData, Error>({
    queryKey: ['asset-prices', twelveKey],
    queryFn:  () => fetchAllPrices(twelveKey),
    ...CACHE.PRICE,
    refetchInterval: 60_000,
  });

  return { prices: data ?? {}, isLoading, error };
}

export function useFearGreed() {
  const { data, isLoading, error } = useQuery<FearGreedData, Error>({
    queryKey: ['fear-greed'],
    queryFn:  fetchFearGreedIndex,
    ...CACHE.PRICE,
    refetchInterval: 5 * 60_000,
  });

  return { fearGreed: data ?? null, isLoading, error };
}

export function useAssetCandles(
  assetId: string,
  twelveKey: string,
  timeframe: Timeframe,
  enabled = true,
) {
  const asset = ASSETS.find(a => a.id === assetId);

  const { data, isLoading, error } = useQuery<Candle[], Error>({
    queryKey: ['candles', assetId, timeframe],
    queryFn:  async (): Promise<Candle[]> => {
      if (!asset) throw new Error(`Unknown asset: ${assetId}`);
      return fetchCandles(asset, twelveKey, timeframe);
    },
    ...CACHE.PRICE,
    refetchInterval: timeframe === '15m' ? 60_000 : 5 * 60_000,
    enabled: enabled && !!asset,
  });

  return { candles: data ?? [], isLoading, error };
}

export function useAssetIndicators(
  assetId: string,
  twelveKey: string,
  timeframe: Timeframe = '1h',
  enabled = true,
) {
  const asset = ASSETS.find(a => a.id === assetId);

  const { data, isLoading, error } = useQuery<Indicators, Error>({
    queryKey: ['indicators', assetId, timeframe],
    queryFn:  async (): Promise<Indicators> => {
      if (!asset) throw new Error(`Unknown asset: ${assetId}`);
      const candles = await fetchCandles(asset, twelveKey, timeframe, 100);
      return lastIndicators(candles);
    },
    ...CACHE.PRICE,
    refetchInterval: 2 * 60_000,
    enabled: enabled && !!asset,
  });

  return { indicators: data ?? null, isLoading, error };
}

// ── AI mutation — AI cache policy ─────────────────────────────────────

export interface AnalyzeArgs {
  asset:        Asset;
  indicators:   Indicators;
  price:        number;
  fearGreed:    FearGreedData | null;
  anthropicKey: string;
}

export function useAnalyzeSignal() {
  return useMutation<ClaudeSignal, Error, AnalyzeArgs>({
    gcTime: CACHE.AI.gcTime,
    mutationFn: async ({ asset, indicators, price, fearGreed, anthropicKey }): Promise<ClaudeSignal> => {
      if (!anthropicKey) throw new Error('Anthropic API key mancante');
      const prompt =
        `Asset: ${asset.label} | Price: ${price}\n` +
        `RSI:${indicators.rsi?.toFixed(1)} MACD:${(indicators.macd ?? 0) > 0 ? '+' : ''}${indicators.macd?.toFixed(2)} Signal:${indicators.signal?.toFixed(2)}\n` +
        `BB: L${indicators.bb_lower?.toFixed(2)} M${indicators.bb_mid?.toFixed(2)} U${indicators.bb_upper?.toFixed(2)}\n` +
        `F&G: ${fearGreed?.value ?? '?'} (${fearGreed?.label ?? '?'})\n` +
        `Give a brief trading signal with BUY/SELL/WAIT, confidence 0-100, and short reason.\n` +
        `JSON: {"signal":"BUY"|"SELL"|"WAIT","confidence":0-100,"reasoning":"<120chars","tp_pct":0,"sl_pct":0}`;

      const res = await fetch(ANTHROPIC_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model:      'claude-sonnet-4-20250514',
          max_tokens: 200,
          system:     'Expert trader. Reply ONLY with valid JSON. No markdown.',
          messages:   [{ role: 'user', content: prompt }],
        }),
      });
      if (!res.ok) throw new Error(`Claude HTTP ${res.status}`);
      const d   = await res.json() as { content?: Array<{ text?: string }> };
      const raw = (d.content?.[0]?.text ?? '').replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(raw) as Omit<ClaudeSignal, 'generated_at'>;
      return { ...parsed, generated_at: Date.now() };
    },
  });
}

// ── News feeds — NEWS cache policy ───────────────────────────────────

export function useNewsFeeds() {
  const results = useQueries({
    queries: NEWS_SOURCES.map(src => ({
      queryKey: ['news', src.id] as const,
      queryFn:  (): Promise<ProxyFetchResult> => fetchWithProxyFallback(src),
      ...CACHE.NEWS,
    })),
  });

  return NEWS_SOURCES.map((src, i) => ({
    src,
    data:      results[i].data ?? null,
    isPending: results[i].isPending,
    isError:   results[i].isError,
  }));
}

// ── Macro enrichment — MACRO cache policy ────────────────────────────

export function useMacroEnrichment() {
  // Reactive store subscriptions — queryKey updates when config changes
  const serverUrl  = useAppStore(state => state.serverUrl);
  const isDemoMode = useAppStore(state => state.isDemoMode);

  const { data, isLoading, error } = useQuery<MacroData, Error>({
    queryKey: ['macro-enrichment', serverUrl, isDemoMode],
    queryFn:  () => fetchMacroData(serverUrl, isDemoMode),
    ...CACHE.MACRO,
    placeholderData: MACRO_DEMO_DATA,
  });

  return {
    data:      data ?? null,
    isLoading,
    error: error instanceof Error ? error.message : null,
  };
}

// ── Prefetch helpers (call from providers — fire-and-forget) ──────────

/** Warms asset-prices + fear-greed cache at app start. */
export function prefetchMarketData(qc: QueryClient): void {
  const { twelveKey } = useAppStore.getState();
  void qc.prefetchQuery<PriceData>({
    queryKey: ['asset-prices', twelveKey],
    queryFn:  () => fetchAllPrices(twelveKey),
    ...CACHE.PRICE,
  });
  void qc.prefetchQuery<FearGreedData>({
    queryKey: ['fear-greed'],
    queryFn:  fetchFearGreedIndex,
    ...CACHE.PRICE,
  });
}

/** Warms all news-source + macro-enrichment caches at app start. */
export function prefetchNewsMacro(qc: QueryClient): void {
  const { serverUrl, isDemoMode } = useAppStore.getState();
  NEWS_SOURCES.forEach(src => {
    void qc.prefetchQuery<ProxyFetchResult>({
      queryKey: ['news', src.id],
      queryFn:  () => fetchWithProxyFallback(src),
      ...CACHE.NEWS,
    });
  });
  void qc.prefetchQuery<MacroData>({
    queryKey: ['macro-enrichment', serverUrl, isDemoMode],
    queryFn:  () => fetchMacroData(serverUrl, isDemoMode),
    ...CACHE.MACRO,
  });
}

/** Warms candle + indicator caches for the 4 top assets used by Market AI. */
export function prefetchAISignals(qc: QueryClient): void {
  const { twelveKey } = useAppStore.getState();
  const TF: Timeframe = '1h';
  const TOP = ['BTCUSDT', 'ETHUSDT', 'EURUSD', 'XAUUSD'];
  TOP.forEach(assetId => {
    const asset = ASSETS.find(a => a.id === assetId);
    if (!asset) return;
    void qc.prefetchQuery<Candle[]>({
      queryKey: ['candles', assetId, TF],
      queryFn:  () => fetchCandles(asset, twelveKey, TF),
      ...CACHE.PRICE,
    });
    void qc.prefetchQuery<Indicators>({
      queryKey: ['indicators', assetId, TF],
      queryFn:  async () => {
        const candles = await fetchCandles(asset, twelveKey, TF, 100);
        return lastIndicators(candles);
      },
      ...CACHE.PRICE,
    });
  });
}


