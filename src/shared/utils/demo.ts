import type { StatsResponse, FtmPortfolio, EquityPoint, MacroData } from '@/shared/types';

const symbols = ["BTCUSDT", "ETHUSDT", "EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "SPX500"];
const dirs = ["BUY", "SELL"];

function generateDemoLogs(n: number) {
  const now = Date.now();
  return Array.from({ length: n }, (_, i) => {
    const action = Math.random() < 0.85 ? "GO_FULL" : "NOGO";
    const outcome = action === "GO_FULL" ? (Math.random() < 0.65 ? "WIN" : "LOSS") : undefined;
    const profit = outcome === "WIN"
      ? Math.random() * 200 + 50
      : outcome === "LOSS"
        ? -(Math.random() * 150 + 30)
        : 0;

    return {
      trade_id: `TRD-${String(n - i).padStart(4, "0")}`,
      ts: now - i * 1000 * 60 * (15 + Math.floor(Math.random() * 30)),
      symbol: symbols[Math.floor(Math.random() * symbols.length)],
      direction: dirs[Math.floor(Math.random() * dirs.length)],
      entry: 45000 + Math.random() * 10000,
      sl: 44000 + Math.random() * 2000,
      action,
      quality: Math.random() * 0.4 + 0.6,
      regime: Math.random() < 0.7 ? "BULL" : "BEAR",
      h4_adx: Math.random() * 30 + 15,
      lot_adj: Math.random() * 0.3 + 0.1,
      bonus_count: Math.floor(Math.random() * 3),
      confidence: Math.floor(Math.random() * 40 + 60),
      news_impact: Math.random() < 0.3 ? Math.floor(Math.random() * 5 + 1) : 0,
      outcome,
      profit,
      pips: Math.floor(Math.random() * 100 - 50),
      is_fallback: Math.random() < 0.2,
      reason: action === "NOGO" ? "Filter triggered" : undefined,
    };
  });
}

function generateDemoEquity(n: number) {
  const now = Date.now();
  let eq = 10000;
  return Array.from({ length: n }, (_, i) => {
    eq += (Math.random() - 0.42) * 80;
    return {
      ts: now - (n - i) * 1000 * 60 * 60,
      equity: +eq.toFixed(2),
      balance: +eq.toFixed(2),
    };
  });
}

export const DEMO_LOGS = generateDemoLogs(40);
export const DEMO_EQUITY = generateDemoEquity(120);
export const DEMO_STATS: StatsResponse = {
  total_trades: 156,
  wins: 101,
  losses: 55,
  win_rate_pct: 64.7,
  profit_factor: 1.42,
  avg_win: 187.3,
  avg_loss: -98.5,
  total_profit: 8934.2,
  drawdown: -12.4,
  sharpe: 1.87,
  trades_month: 42,
  nogo_count: 23,
  fallback_rate_pct: 12.5,
};

// FTMO-specific demo: 80 punti equity a partire da 100K
export const DEMO_FTMO_EQUITY: EquityPoint[] = Array.from({ length: 80 }, (_, i) => ({
  ts:      Date.now() - (80 - i) * 3_600_000,
  equity:  +(100_000 + Math.sin(i / 8) * 800 + i * 42).toFixed(2),
  balance: +(100_000 + i * 40).toFixed(2),
}));

export const DEMO_PORTFOLIO: FtmPortfolio = {
  count: 1,
  positions: [
    { symbol: 'XAUUSD', direction: 'BULL', entry: 2340.5, lot_adj: 1.0, open_min: 47 },
  ],
};

export const DEMO_FTMO_STATS: StatsResponse = {
  total_trades: 14,
  wins: 7,
  losses: 5,
  win_rate_pct: 58,
  profit_factor: 1.28,
  avg_win: 420.0,
  avg_loss: -215.0,
  total_profit: 2840.5,
  drawdown: -3.2,
  sharpe: 1.1,
  trades_month: 14,
  nogo_count: 4,
  fallback_rate_pct: 8.0,
};

export const DEMO_HEALTH = {
  status: "ok" as const,
  version: "4.15",
  uptime_s: 7243,
  claude_status: "ok" as const,
  news_status: "ok" as const,
  portfolio_status: "ok" as const,
};
export const MACRO_DEMO_DATA: MacroData = {
  fred: { fed_rate: 5.33, cpi_yoy: 3.2, nfp_last: 187000, m2_growth: 1.8, fetched_at: Date.now() - 3_600_000 },
  cot: {
    EUR:    { net:  42300, change:  1200, pct_long: 58 },
    GBP:    { net:  -8700, change:  -400, pct_long: 44 },
    JPY:    { net: -91200, change: -3100, pct_long: 29 },
    CHF:    { net:  -4200, change:   320, pct_long: 47 },
    AUD:    { net:  -6100, change:  -780, pct_long: 42 },
    CAD:    { net:  -3500, change:   150, pct_long: 46 },
    NZD:    { net:  -2800, change:  -230, pct_long: 43 },
    GOLD:   { net: 183400, change:  5200, pct_long: 72 },
    SILVER: { net:  21400, change:  1100, pct_long: 63 },
    OIL:    { net:  94700, change: -2300, pct_long: 61 },
  },
  sentiment: {
    BTCUSDT: { score:  0.41, label: 'BULLISH',  articles: 38 },
    ETHUSDT: { score:  0.22, label: 'BULLISH',  articles: 24 },
    BNBUSDT: { score:  0.08, label: 'NEUTRAL',  articles: 11 },
    SOLUSDT: { score:  0.31, label: 'BULLISH',  articles: 19 },
    EURUSD:  { score:  0.28, label: 'BULLISH',  articles: 14 },
    GBPUSD:  { score: -0.12, label: 'NEUTRAL',  articles:  9 },
    USDJPY:  { score:  0.54, label: 'BULLISH',  articles: 21 },
    USDCHF:  { score: -0.18, label: 'BULLISH',  articles:  7 },
    AUDUSD:  { score: -0.09, label: 'NEUTRAL',  articles:  6 },
    USDCAD:  { score:  0.14, label: 'NEUTRAL',  articles:  5 },
    NZDUSD:  { score: -0.21, label: 'BEARISH',  articles:  4 },
    EURJPY:  { score:  0.33, label: 'BULLISH',  articles:  8 },
    GBPJPY:  { score:  0.19, label: 'NEUTRAL',  articles:  6 },
    EURGBP:  { score:  0.07, label: 'NEUTRAL',  articles:  5 },
    SPX:     { score:  0.45, label: 'BULLISH',  articles: 28 },
    NDX:     { score:  0.38, label: 'BULLISH',  articles: 22 },
    IDAX:    { score:  0.17, label: 'NEUTRAL',  articles: 10 },
    IFTSE:   { score: -0.05, label: 'NEUTRAL',  articles:  7 },
    NKY:     { score:  0.29, label: 'BULLISH',  articles: 12 },
    XAUUSD:  { score:  0.67, label: 'BULLISH',  articles: 31 },
    XAGUSD:  { score:  0.44, label: 'BULLISH',  articles: 13 },
    WTIUSD:  { score: -0.31, label: 'BEARISH',  articles: 17 },
  },
  calendar: [
    { time: '14:30', event: 'US CPI m/m',         impact: 'HIGH', currency: 'USD', forecast: '0.3%',   previous: '0.4%'   },
    { time: '16:00', event: 'Fed Chair Speech',    impact: 'HIGH', currency: 'USD', forecast: '—',      previous: '—'      },
    { time: '08:30', event: 'ECB Minutes',         impact: 'MED',  currency: 'EUR', forecast: '—',      previous: '—'      },
    { time: '10:00', event: 'UK GDP m/m',          impact: 'HIGH', currency: 'GBP', forecast: '0.1%',  previous: '0.0%'   },
    { time: '23:50', event: 'Japan Trade Balance', impact: 'MED',  currency: 'JPY', forecast: '¥312B',  previous: '¥248B'  },
    { time: '12:30', event: 'EIA Crude Oil',       impact: 'MED',  currency: 'OIL', forecast: '-1.2M',  previous: '+3.4M'  },
  ],
  cache_ages: { fred: '5h 12m', cot: '18h 44m', finnhub: '22m', calendar: '4m' },
};
