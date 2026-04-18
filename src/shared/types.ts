// ── TRADE & MARKET DATA TYPES ───────────────────────────────────────

export interface Trade {
  trade_id: string;
  ts: number;
  closed_at?: number;
  symbol: string;
  direction: "BUY" | "SELL";
  entry: number;
  sl: number;
  action: "GO_FULL" | "NOGO";
  quality: number;
  regime: string;
  h4_adx: number;
  lot_adj: number;
  bonus_count: number;
  confidence: number;
  news_impact: number;
  outcome?: "WIN" | "LOSS" | "BREAKEVEN";
  blocked_by?: "news_filter" | "circuit_breaker";
  profit?: number;
  pips?: number;
  is_fallback: boolean;
  reason?: string;
}

export interface EquityPoint {
  ts: number;
  equity: number;
  balance: number;
}

export interface ServerHealth {
  status: "ok" | "error";
  version: string;
  uptime_s: number;
  claude_status: "ok" | "error";
  news_status: "ok" | "error";
  portfolio_status: "ok" | "error";
}

export interface Signal {
  signal: "BUY" | "SELL" | "WAIT";
  confidence: number;
  reasoning: string;
  tp_pct?: number;
  sl_pct?: number;
}

export interface NewsItem {
  title: string;
  desc: string;
  link: string;
  timeAgo: string;
  impact: "low" | "med" | "high";
  fallback?: boolean;
  news_headline_type?: "editorial" | "hard_data";
}

export interface Asset {
  id: string;
  label: string;
  type: "crypto" | "forex" | "index" | "commodity" | "metal";
  binance: boolean;
  twelveSymbol?: string | null;
  color: string;
  icon: string;
  category: "crypto" | "forex" | "indices" | "metals";
}

export type Timeframe = '15m' | '1h' | '4h' | '1d';

export interface Candle {
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
  vol: number;
}

export interface FearGreedData {
  value: number;
  label: string;
  ts: number;
}

export interface ClaudeSignal {
  signal: 'BUY' | 'SELL' | 'WAIT';
  confidence: number;
  reasoning: string;
  tp_pct?: number;
  sl_pct?: number;
  generated_at: number;
}

// ── FTMO & PERFORMANCE TYPES ─────────────────────────────────────────

export interface FtmPosition {
  symbol: string;
  direction: 'BULL' | 'BEAR';
  entry: number;
  lot_adj: number;
  open_min: number;
}

export interface FtmPortfolio {
  count: number;
  positions: FtmPosition[];
}

export interface FTMOState {
  equity: number;
  target: number;
  daily_loss: number;
  daily_loss_pct: number;
  total_loss: number;
  total_loss_pct: number;
  daily_buffer: number;
  drawdown: number;
  drawdown_pct: number;
  profit: number;
  profit_pct: number;
  challenge_days: number;
  status: "active" | "passed" | "failed";
}

// ─── MACRO & SENTIMENT TYPES ─────────────────────────────────────────

export interface COTPosition {
  net: number;
  change: number;
  pct_long: number;
}

export interface SentimentEntry {
  score: number;
  label: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  articles: number;
}

export interface CalendarEvent {
  time: string;
  event: string;
  impact: 'HIGH' | 'MED' | 'LOW';
  currency: string;
  forecast: string;
  previous: string;
}

export interface CacheAges {
  fred?: string;
  cot?: string;
  finnhub?: string;
  calendar?: string;
}

export interface FredData {
  fed_rate?: number;
  cpi_yoy?: number;
  nfp_last?: number;
  m2_growth?: number;
  fetched_at?: number;
}

export interface MacroData {
  fred?: FredData;
  cot?: Record<string, COTPosition>;
  sentiment?: Record<string, SentimentEntry>;
  calendar?: CalendarEvent[];
  cache_ages?: CacheAges;
}

export interface SentimentData {
  [key: string]: {
    bias: 'BULL' | 'BEAR' | 'NEUT';
    score: number;
    articles: number;
  };
}

// ─── UI & STATE TYPES ───────────────────────────────────────────────

export type TabId =
  | 'LIVE MONITOR'
  | 'PERFORMANCE'
  | 'FTMO 100K'
  | 'MARKET AI'
  | 'NEWS FEED'
  | 'MACRO'
  | 'CONFIG'
  | '⭐ CONSIGLI';

// ─── CONSIGLI / SIGNAL TYPES ────────────────────────────────────────

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type FilterId  = 'TUTTI' | 'BUY' | 'SELL' | 'M15' | 'SWING' | 'LOW' | 'HIGH_CONF';

export interface AssetConfig {
  id:       string;
  label:    string;
  icon:     string;
  color:    string;
  category: string;
}

export interface TradingSignal {
  id:         string;
  asset:      AssetConfig;
  dir:        'BUY' | 'SELL';
  tf:         string;
  conf:       number;
  risk:       RiskLevel;
  entryLo:    number;
  entryHi:    number;
  sl:         number;
  tp1:        number;
  tp2:        number;
  slPips:     number;
  tp1Pips:    number;
  tp2Pips:    number;
  dec:        number;
  indicators: string[];
  ts:         number;
  rrRatio:    number;
}

export interface AiSignal {
  asset:       string;
  direction:   string;
  entry?:      string;
  tp1?:        string;
  tp2?:        string;
  sl?:         string;
  confidence?: number;
  reason?:     string;
}

export interface Toast {
  id: number;
  icon: string;
  msg: string;
  fading: boolean;
}

export interface PriceData {
  [key: string]: {
    price: number;
    chg: number;
    chg_pct: number;
    volume?: number;
  };
}

export interface Indicators {
  rsi?: number;
  macd?: number;
  signal?: number;
  hist?: number;
  bb_mid?: number;
  bb_upper?: number;
  bb_lower?: number;
  trend?: "UP" | "DOWN" | "SIDE";
  regime?: "BULL" | "BEAR" | "SIDE";
}

// ─── CONFIG TYPES ───────────────────────────────────────────────────

export interface ApiEndpoint {
  method: 'GET' | 'POST';
  path: string;
  description: string;
}

// ─── API & CONFIG TYPES ─────────────────────────────────────────────

export interface StatsResponse {
  total_trades: number;
  wins: number;
  losses: number;
  win_rate_pct: number;
  total_profit: number;
  avg_win: number;
  avg_loss: number;
  profit_factor: number;
  drawdown: number;
  sharpe: number;
  trades_month: number;
  nogo_count: number;
  fallback_rate_pct: number;
}

export interface AppConfig {
  serverUrl: string;
  anthropicKey: string;
  twelveKey: string;
  isDemoMode: boolean;
  activeTab: string;
}

export interface APIResponse<T> {
  data?: T;
  error?: string;
  status?: number;
}