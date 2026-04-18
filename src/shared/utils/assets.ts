import type { Asset } from '@/shared/types';

export const ASSETS: Asset[] = [
  // ── CRYPTO ──────────────────────────────────────────────────────────
  { id: 'BTCUSDT', label: 'BTC/USD',  type: 'crypto',    binance: true,  twelveSymbol: null,       color: '#f97316', icon: '₿',  category: 'crypto'  },
  { id: 'ETHUSDT', label: 'ETH/USD',  type: 'crypto',    binance: true,  twelveSymbol: null,       color: '#a78bfa', icon: 'Ξ',  category: 'crypto'  },
  { id: 'BNBUSDT', label: 'BNB/USD',  type: 'crypto',    binance: true,  twelveSymbol: null,       color: '#f0b90b', icon: 'B',  category: 'crypto'  },
  { id: 'SOLUSDT', label: 'SOL/USD',  type: 'crypto',    binance: true,  twelveSymbol: null,       color: '#9945ff', icon: '◎',  category: 'crypto'  },
  // ── FOREX MAJORS ────────────────────────────────────────────────────
  { id: 'EURUSD',  label: 'EUR/USD',  type: 'forex',     binance: false, twelveSymbol: 'EUR/USD',  color: '#5eead4', icon: '€',  category: 'forex'   },
  { id: 'GBPUSD',  label: 'GBP/USD',  type: 'forex',     binance: false, twelveSymbol: 'GBP/USD',  color: '#818cf8', icon: '£',  category: 'forex'   },
  { id: 'USDJPY',  label: 'USD/JPY',  type: 'forex',     binance: false, twelveSymbol: 'USD/JPY',  color: '#f472b6', icon: '¥',  category: 'forex'   },
  { id: 'USDCHF',  label: 'USD/CHF',  type: 'forex',     binance: false, twelveSymbol: 'USD/CHF',  color: 'var(--cyan)', icon: '₣', category: 'forex' },
  { id: 'AUDUSD',  label: 'AUD/USD',  type: 'forex',     binance: false, twelveSymbol: 'AUD/USD',  color: '#86efac', icon: 'A$', category: 'forex'   },
  { id: 'USDCAD',  label: 'USD/CAD',  type: 'forex',     binance: false, twelveSymbol: 'USD/CAD',  color: '#fdba74', icon: 'C$', category: 'forex'   },
  { id: 'NZDUSD',  label: 'NZD/USD',  type: 'forex',     binance: false, twelveSymbol: 'NZD/USD',  color: '#6ee7b7', icon: 'N$', category: 'forex'   },
  // ── FOREX CROSSES ───────────────────────────────────────────────────
  { id: 'EURJPY',  label: 'EUR/JPY',  type: 'forex',     binance: false, twelveSymbol: 'EUR/JPY',  color: '#c084fc', icon: '€¥', category: 'forex'   },
  { id: 'GBPJPY',  label: 'GBP/JPY',  type: 'forex',     binance: false, twelveSymbol: 'GBP/JPY',  color: '#fb7185', icon: '£¥', category: 'forex'   },
  { id: 'EURGBP',  label: 'EUR/GBP',  type: 'forex',     binance: false, twelveSymbol: 'EUR/GBP',  color: '#7dd3fc', icon: '€£', category: 'forex'   },
  // ── INDICES ─────────────────────────────────────────────────────────
  { id: 'SPX',     label: 'S&P 500',  type: 'index',     binance: false, twelveSymbol: 'SPY',      color: '#34d399', icon: 'US', category: 'indices' },
  { id: 'NDX',     label: 'NASDAQ',   type: 'index',     binance: false, twelveSymbol: 'QQQ',      color: '#22d3ee', icon: '⬡',  category: 'indices' },
  { id: 'IDAX',    label: 'DAX',      type: 'index',     binance: false, twelveSymbol: 'DAX',      color: '#a3e635', icon: 'DE', category: 'indices' },
  { id: 'IFTSE',   label: 'FTSE 100', type: 'index',     binance: false, twelveSymbol: 'FTSE',     color: '#60a5fa', icon: 'UK', category: 'indices' },
  { id: 'NKY',     label: 'Nikkei',   type: 'index',     binance: false, twelveSymbol: 'JP225',    color: '#f9a8d4', icon: 'JP', category: 'indices' },
  // ── METALLI / COMMODITIES ───────────────────────────────────────────
  { id: 'XAUUSD',  label: 'XAU/USD',  type: 'metal',     binance: false, twelveSymbol: 'XAUUSD',   color: '#fbbf24', icon: 'Au', category: 'metals'  },
  { id: 'XAGUSD',  label: 'XAG/USD',  type: 'metal',     binance: false, twelveSymbol: 'XAGUSD',   color: '#d1d5db', icon: 'Ag', category: 'metals'  },
  { id: 'WTIUSD',  label: 'WTI Oil',  type: 'commodity', binance: false, twelveSymbol: 'WTI',      color: '#a78bfa', icon: '⛽', category: 'metals'  },
];
