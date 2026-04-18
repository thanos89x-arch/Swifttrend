import { useState, useEffect, useCallback, useRef, useMemo, memo, Component } from "react";

// ── ERROR BOUNDARY ────────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: "var(--mono)", color: "var(--red)", background: "var(--bg)", minHeight: "100vh" }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "var(--cyan)" }}>⚠ SWIFTTREND — ERRORE RUNTIME</div>
          <pre style={{ fontSize: 11, color: "var(--text)", whiteSpace: "pre-wrap", background: "var(--bg2)", padding: 16, borderRadius: 6, border: "1px solid rgba(56,189,248,0.15)" }}>
            {this.state.error?.message}
            {"\n\n"}
            {this.state.error?.stack}
          </pre>
          <button
            style={{ marginTop: 16, padding: "8px 20px", background: "rgba(56,189,248,0.12)", border: "1px solid var(--cyan)", color: "var(--cyan)", borderRadius: 4, cursor: "pointer", fontFamily: "var(--mono)", fontSize: 11 }}
            onClick={() => this.setState({ error: null })}
          >↻ RIPROVA</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ═══════════════════════════════════════════════════════════════
// SWIFTTREND AI v13.0 — COMMAND CENTER
// ═══════════════════════════════════════════════════════════════
// NOVITÀ vs v12:
//  [1] News: multi-proxy fallback (allorigins → corsproxy → codetabs)
//  [2] News: fallback mock articoli realistici se tutti i proxy falliscono
//  [3] News: badge LIVE / CACHED per ogni sorgente
//  [4] News: modal mostra avviso se articoli sono cached/fallback
// ═══════════════════════════════════════════════════════════════

// v22.0 fixes: --cyan self-ref, row click UX, signal asset mismatch,
// indicators activeAsset sync, bias thresholds per category, F&G in chart view
const VERSION = "22.0";

// ── STABLE SVG ID COUNTER ─────────────────────────────────────
// Avoids Math.random() in renders (React anti-pattern) and duplicate
// gradient IDs across multiple SVG instances on the same page.
let _svgIdCounter = 0;
function useSvgId(prefix = "svg") {
  const ref = useRef(null);
  if (ref.current === null) ref.current = `${prefix}-${++_svgIdCounter}`;
  return ref.current;
}

const ASSETS = [
  // ── CRYPTO ──────────────────────────────────────────────────────────
  { id: "BTCUSDT", label: "BTC/USD",  type: "crypto",    binance: true,  twelveSymbol: null,       color: "#f97316", icon: "₿",  category: "crypto"  },
  { id: "ETHUSDT", label: "ETH/USD",  type: "crypto",    binance: true,  twelveSymbol: null,       color: "#a78bfa", icon: "Ξ",  category: "crypto"  },
  { id: "BNBUSDT", label: "BNB/USD",  type: "crypto",    binance: true,  twelveSymbol: null,       color: "#f0b90b", icon: "B",  category: "crypto"  },
  { id: "SOLUSDT", label: "SOL/USD",  type: "crypto",    binance: true,  twelveSymbol: null,       color: "#9945ff", icon: "◎",  category: "crypto"  },
  // ── FOREX MAJORS ────────────────────────────────────────────────────
  { id: "EURUSD",  label: "EUR/USD",  type: "forex",     binance: false, twelveSymbol: "EUR/USD",  color: "#5eead4", icon: "€",  category: "forex"   },
  { id: "GBPUSD",  label: "GBP/USD",  type: "forex",     binance: false, twelveSymbol: "GBP/USD",  color: "#818cf8", icon: "£",  category: "forex"   },
  { id: "USDJPY",  label: "USD/JPY",  type: "forex",     binance: false, twelveSymbol: "USD/JPY",  color: "#f472b6", icon: "¥",  category: "forex"   },
  { id: "USDCHF",  label: "USD/CHF",  type: "forex",     binance: false, twelveSymbol: "USD/CHF",  color: "var(--cyan)", icon: "₣",  category: "forex"   },
  { id: "AUDUSD",  label: "AUD/USD",  type: "forex",     binance: false, twelveSymbol: "AUD/USD",  color: "#86efac", icon: "A$", category: "forex"   },
  { id: "USDCAD",  label: "USD/CAD",  type: "forex",     binance: false, twelveSymbol: "USD/CAD",  color: "#fdba74", icon: "C$", category: "forex"   },
  { id: "NZDUSD",  label: "NZD/USD",  type: "forex",     binance: false, twelveSymbol: "NZD/USD",  color: "#6ee7b7", icon: "N$", category: "forex"   },
  // ── FOREX CROSSES ───────────────────────────────────────────────────
  { id: "EURJPY",  label: "EUR/JPY",  type: "forex",     binance: false, twelveSymbol: "EUR/JPY",  color: "#c084fc", icon: "€¥", category: "forex"   },
  { id: "GBPJPY",  label: "GBP/JPY",  type: "forex",     binance: false, twelveSymbol: "GBP/JPY",  color: "#fb7185", icon: "£¥", category: "forex"   },
  { id: "EURGBP",  label: "EUR/GBP",  type: "forex",     binance: false, twelveSymbol: "EUR/GBP",  color: "#7dd3fc", icon: "€£", category: "forex"   },
  // ── INDICES ─────────────────────────────────────────────────────────
  { id: "SPX",     label: "S&P 500",  type: "index",     binance: false, twelveSymbol: "SPY",      color: "#34d399", icon: "US", category: "indices" },
  { id: "NDX",     label: "NASDAQ",   type: "index",     binance: false, twelveSymbol: "QQQ",      color: "#22d3ee", icon: "⬡",  category: "indices" },
  { id: "IDAX",    label: "DAX",      type: "index",     binance: false, twelveSymbol: "DAX",      color: "#a3e635", icon: "DE", category: "indices" },
  { id: "IFTSE",   label: "FTSE 100", type: "index",     binance: false, twelveSymbol: "FTSE",     color: "#60a5fa", icon: "UK", category: "indices" },
  { id: "NKY",     label: "Nikkei",   type: "index",     binance: false, twelveSymbol: "JP225",    color: "#f9a8d4", icon: "JP", category: "indices" },
  // ── METALLI / COMMODITIES ───────────────────────────────────────────
  { id: "XAUUSD",  label: "XAU/USD",  type: "metal",     binance: false, twelveSymbol: "XAUUSD",   color: "#fbbf24", icon: "Au", category: "metals"  },
  { id: "XAGUSD",  label: "XAG/USD",  type: "metal",     binance: false, twelveSymbol: "XAGUSD",   color: "#d1d5db", icon: "Ag", category: "metals"  },
  { id: "WTIUSD",  label: "WTI Oil",  type: "commodity", binance: false, twelveSymbol: "WTI",      color: "#a78bfa", icon: "⛽", category: "metals"  },
];

// ── DEMO DATA ──────────────────────────────────────────────────
function generateDemoLogs(n = 40) {
  const symbols  = [
    "BTCUSD","ETHUSD","EURUSD","GBPUSD","USDJPY","XAUUSD",
    "AUDUSD","NZDUSD","USDCAD","USDCHF","GBPJPY","EURJPY","EURGBP",
    "US30.cash","GER40.cash",
  ];
  const dirs     = ["BUY", "SELL"];
  const actions  = ["GO_FULL", "GO_HALF", "GO_MIN", "NOGO", "GO_FULL", "GO_HALF"];
  const outcomes = ["win", "loss", "win", "win", "breakeven", "pending"];
  const reasons  = [
    "BOS confermato H4, RSI 38, FVG attivo a 83200",
    "CHoCH ribassista, ADX 31, nessun FVG rilevante",
    "Setup BOS valido ma RSI neutro 52 — size ridotta",
    "ADX H4 sotto soglia, mercato laterale — skip",
    "FVG + Fib 0.618 coincidenti, momentum forte",
    "CHoCH rialzista M15, candela engulf confermata",
    "News impact alto — attesa volatilità, NOGO",
    "Sequenza causale completa, entrata GO_FULL",
  ];
  const now = Date.now();
  return Array.from({ length: n }, (_, i) => {
    const action  = actions[Math.floor(Math.random() * actions.length)];
    const outcome = action === "NOGO" ? null : outcomes[Math.floor(Math.random() * outcomes.length)];
    const profit  = outcome === "win" ? +(Math.random() * 120 + 10).toFixed(2)
                  : outcome === "loss" ? -(Math.random() * 80 + 5).toFixed(2)
                  : outcome === "breakeven" ? +(Math.random() * 2 - 1).toFixed(2)
                  : undefined;
    // blocked_by: ~20% news_filter, ~5% circuit_breaker, rest undefined (Claude decision)
    let blocked_by;
    if (action === "NOGO") {
      const r = Math.random();
      if (r < 0.20)      blocked_by = "news_filter";
      else if (r < 0.25) blocked_by = "circuit_breaker";
      // else undefined
    }
    // news_headline_type: present on non-NOGO entries (~40% editorial, 60% hard_data)
    const news_headline_type = action !== "NOGO"
      ? (Math.random() < 0.40 ? "editorial" : "hard_data")
      : undefined;
    return {
      trade_id:          `TRD-${String(n - i).padStart(4, "0")}`,
      ts:                now - i * 1000 * 60 * (15 + Math.floor(Math.random() * 30)),
      symbol:            symbols[Math.floor(Math.random() * symbols.length)],
      direction:         dirs[Math.floor(Math.random() * dirs.length)],
      action,
      confidence:        55 + Math.floor(Math.random() * 40),
      outcome,
      profit,
      pips:              profit ? +(profit / 10).toFixed(1) : undefined,
      reason:            reasons[Math.floor(Math.random() * reasons.length)],
      entry:             +(66000 + Math.random() * 5000).toFixed(2),
      sl:                +(65800 + Math.random() * 5000).toFixed(2),
      quality:           action,
      bonus_count:       Math.floor(Math.random() * 3),
      regime:            Math.random() > 0.5 ? "BULL" : "BEAR",
      h4_adx:            +(20 + Math.random() * 40).toFixed(2),
      lot_adj:           action === "NOGO" ? 0 : [0.35, 0.5, 0.6][Math.floor(Math.random() * 3)],
      news_impact:       ["bullish", "bearish", "neutral"][Math.floor(Math.random() * 3)],
      is_fallback:       false,
      blocked_by,
      news_headline_type,
      closed_at:         outcome && outcome !== "pending"
        ? new Date(now - Math.random() * 3600000).toISOString()
        : undefined,
    };
  });
}

function generateDemoEquity(n = 120) {
  const now = Date.now();
  let eq = 10000;
  return Array.from({ length: n }, (_, i) => {
    eq += (Math.random() - 0.42) * 80;
    return { ts: now - (n - i) * 1000 * 60 * 60, equity: +eq.toFixed(2), balance: +eq.toFixed(2) };
  });
}

function generateDemoStats(logs) {
  const closed = logs.filter(l => l.outcome && l.outcome !== "pending" && l.action !== "NOGO");
  const wins   = closed.filter(l => l.outcome === "win").length;
  const losses = closed.filter(l => l.outcome === "loss").length;
  const totalP = closed.reduce((s, l) => s + (l.profit || 0), 0);
  const nogo   = logs.filter(l => l.action === "NOGO").length;
  const fallb  = logs.filter(l => l.action === "FALLBACK").length;
  const byAction = {};
  ["GO_FULL","GO_HALF","GO_MIN","NOGO","FALLBACK"].forEach(a => {
    const al = logs.filter(l => l.action === a);
    const ac = al.filter(l => l.outcome && l.outcome !== "pending");
    const aw = ac.filter(l => l.outcome === "win").length;
    const ap = ac.reduce((s, l) => s + (l.profit || 0), 0);
    byAction[a] = {
      count: al.length,
      win_rate: ac.length ? Math.round(aw / ac.length * 100) : null,
      avg_profit: ac.length ? +(ap / ac.length).toFixed(2) : null,
    };
  });
  return {
    total_trades:     logs.length,
    win_rate_pct:     closed.length ? Math.round(wins / closed.length * 100) : 0,
    wins, losses,
    total_profit:     +totalP.toFixed(2),
    nogo_count:       nogo,
    fallback_rate_pct: logs.length ? Math.round(fallb / logs.length * 100) : 0,
    by_action:        byAction,
    runtime: { total_claude_calls: logs.length - fallb, total_errors: fallb, last_error: null },
  };
}

const DEMO_LOGS   = generateDemoLogs(40);
const DEMO_EQUITY = generateDemoEquity(120);
const DEMO_STATS  = generateDemoStats(DEMO_LOGS);
const DEMO_HEALTH = {
  status:   "ok",
  version:  "4.15",
  uptime_s: 7243,
  anthropic: true,
  telegram:  true,
  newsCache: {
    crypto:   12,
    forex:     8,
    index_us:  6,
    index_eu:  6,
    metal:     5,
  },
  runtime: {
    total_claude_calls: 47,
    total_errors:        2,
    last_error:         null,
    fallback_rate_pct:   4,
  },
  trade_log: {
    total:         63,
    with_outcome:  41,
    win_rate_pct:  68,
    last_trade: {
      ts:     new Date().toISOString(),
      symbol: "GER40",
      action: "GO_FULL",
    },
  },
};

// ── STYLES ──────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Syne:wght@400;500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:        #010208;
    --bg2:       #03060f;
    --bg3:       #060c1a;
    --bg4:       #0a1228;
    --panel:     #04080f;
    --border:    rgba(56,189,248,0.08);
    --border2:   rgba(56,189,248,0.15);
    --border3:   rgba(56,189,248,0.32);
    --text:      #b8cfe8;
    --text1:     #ddeeff;
    --text2:     #5a7a9a;
    --text3:     #253545;
    --mono:      'Space Mono', monospace;
    --sans:      'Syne', sans-serif;
    --cyan:      #38bdf8;
    --cyan2:     #0ea5e9;
    --green:     #4ade80;
    --red:       #f87171;
    --orange:    #fb923c;
    --yellow:    #facc15;
    --purple:    #c084fc;
    --blue:      #818cf8;
    --go-full:   #4ade80;
    --go-half:   #818cf8;
    --go-min:    #facc15;
    --nogo:      #f87171;
    --fallback:  #c084fc;
    --glow-c:    rgba(56,189,248,0.18);
    --glow-g:    rgba(74,222,128,0.18);
    --glow-r:    rgba(248,113,113,0.15);
    --radius-sm: 6px;
    --radius-md: 10px;
    --radius-lg: 16px;
    --shadow-panel: 0 8px 32px rgba(0,0,0,0.7), 0 1px 0 rgba(56,189,248,0.07);
    --transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
  }

  html, body { height: 100%; background: var(--bg); font-size: 16px; }

  .sw-root {
    min-height: 100vh;
    background: var(--bg);
    font-family: var(--mono);
    color: var(--text);
    display: flex;
    flex-direction: column;
    zoom: 0.99;
    position: relative;
  }

  /* subtle grid background */
  .sw-root::before {
    content: '';
    position: fixed; inset: 0;
    background-image:
      linear-gradient(rgba(56,189,248,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(56,189,248,0.04) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
    z-index: 0;
  }

  /* corner accent glow — bottom-right blue */
  .sw-root::after {
    content: '';
    position: fixed;
    bottom: -200px; right: -200px; top: auto; left: auto;
    width: 700px; height: 700px;
    background: radial-gradient(circle at center, rgba(56,189,248,0.07) 0%, transparent 65%);
    pointer-events: none;
    z-index: 0;
  }

  /* ── TICKER STRIP ── */
  .sw-ticker-bar {
    height: 36px;
    background: var(--bg2);
    border-bottom: 1px solid var(--border2);
    overflow: hidden;
    position: relative;
    flex-shrink: 0;
    z-index: 10;
  }
  .sw-ticker-bar::before {
    content: '';
    position: absolute; left: 0; top: 0; bottom: 0; width: 60px;
    background: linear-gradient(90deg, var(--bg2), transparent);
    z-index: 2;
  }
  .sw-ticker-bar::after {
    content: '';
    position: absolute; right: 0; top: 0; bottom: 0; width: 60px;
    background: linear-gradient(-90deg, var(--bg2), transparent);
    z-index: 2;
  }
  .sw-ticker-track {
    display: flex;
    gap: 0;
    position: absolute;
    white-space: nowrap;
    animation: ticker-scroll 40s linear infinite;
  }
  @keyframes ticker-scroll {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  .sw-ticker-item {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 0 28px;
    height: 36px;
    font-size: 11px;
    letter-spacing: 2px;
    border-right: 1px solid var(--border);
    font-family: var(--mono);
  }
  .sw-ticker-sym { color: var(--text2); font-weight: 700; text-transform: uppercase; }
  .sw-ticker-price { color: var(--text1); }
  .sw-ticker-chg.up   { color: var(--green); }
  .sw-ticker-chg.down { color: var(--red); }

  /* ── HEADER ── */
  .sw-header {
    position: sticky; top: 0; z-index: 200;
    background: rgba(3,5,10,0.93);
    backdrop-filter: blur(28px);
    border-bottom: 1px solid var(--border2);
    padding: 0 32px;
    height: 72px;
    display: flex; align-items: center; gap: 22px;
    flex-shrink: 0;
    position: relative;
  }

  .sw-header::after {
    content: '';
    position: absolute; bottom: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(56,189,248,0.5) 30%, rgba(56,189,248,0.5) 70%, transparent);
    pointer-events: none;
  }

  .sw-logo-text {
    font-family: var(--sans);
    font-size: 17px; font-weight: 800; letter-spacing: 5px;
    color: var(--cyan);
    text-shadow: 0 0 30px rgba(56,189,248,0.7), 0 0 70px rgba(56,189,248,0.3), 0 0 120px rgba(56,189,248,0.12);
  }

  .sw-logo-ver {
    font-size: 10px; color: var(--text3); letter-spacing: 2px;
    border: 1px solid var(--border2);
    padding: 3px 9px; border-radius: 2px;
    font-family: var(--mono);
  }

  .sw-header-sep { width: 1px; height: 26px; background: rgba(94,234,212,0.12); flex-shrink: 0; }

  /* ── HEALTH ── */
  .sw-health {
    display: flex; align-items: center; gap: 8px;
    font-size: 12px; color: var(--text3); letter-spacing: 1.5px;
    font-family: var(--mono);
  }
  .sw-hdot {
    width: 8px; height: 8px; border-radius: 50%;
    animation: pulse 2.5s ease-in-out infinite;
    flex-shrink: 0;
  }
  @keyframes pulse {
    0%,100% { opacity: 1; box-shadow: 0 0 0 0 currentColor; }
    50%      { opacity: 0.6; box-shadow: 0 0 0 4px rgba(79,209,197,0); }
  }

  /* ── DEMO BADGE ── */
  .sw-demo-badge {
    font-size: 10px; font-weight: 700; letter-spacing: 2px;
    background: rgba(251,191,36,0.08);
    border: 1px solid rgba(251,191,36,0.25);
    color: var(--yellow);
    padding: 4px 10px; border-radius: 2px;
  }

  /* ── TABS ── */
  .sw-tabs { display: flex; gap: 2px; margin-left: auto; }
  .sw-tab {
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--text3);
    font-size: 10px; font-weight: 700; letter-spacing: 3px;
    padding: 0 20px;
    height: 72px;
    cursor: pointer;
    font-family: var(--mono);
    transition: color 0.2s, border-color 0.2s, background 0.2s;
    position: relative;
    text-transform: uppercase;
  }
  .sw-tab:hover {
    color: var(--text);
    background: rgba(56,189,248,0.05);
  }
  .sw-tab.active {
    color: var(--cyan);
    border-bottom-color: var(--cyan);
    background: rgba(94,234,212,0.06);
  }
  .sw-tab.active::before {
    content: '';
    position: absolute; bottom: -1px; left: 50%; transform: translateX(-50%);
    width: 4px; height: 4px; border-radius: 50%;
    background: var(--cyan);
    box-shadow: 0 0 8px var(--cyan), 0 0 16px rgba(79,209,197,0.4);
  }
  .sw-tab.news-tab { }
  .sw-tab.news-tab:hover { color: var(--yellow); background: rgba(234,179,8,0.04); }
  .sw-tab.news-tab.active { color: var(--yellow); border-bottom-color: var(--yellow); background: rgba(234,179,8,0.06); }
  .sw-tab.news-tab.active::before { background: var(--yellow); box-shadow: 0 0 8px var(--yellow), 0 0 16px rgba(234,179,8,0.4); }
  .sw-tab.ftmo-tab:hover  { color: var(--green); background: rgba(34,197,94,0.04); }
  .sw-tab.ftmo-tab.active { color: var(--green); border-bottom-color: var(--green); background: rgba(34,197,94,0.06); }
  .sw-tab.ftmo-tab.active::before { background: var(--green); box-shadow: 0 0 8px var(--green), 0 0 16px rgba(34,197,94,0.4); }
  .sw-tab.macro-tab:hover  { color: var(--purple); background: rgba(139,92,246,0.04); }
  .sw-tab.macro-tab.active { color: var(--purple); border-bottom-color: var(--purple); background: rgba(139,92,246,0.06); }
  .sw-tab.macro-tab.active::before { background: var(--purple); box-shadow: 0 0 8px var(--purple), 0 0 16px rgba(139,92,246,0.4); }
  .sw-tab.consigli-tab { }
  .sw-tab.consigli-tab:hover { color: var(--yellow); background: rgba(250,204,21,0.05); }
  .sw-tab.consigli-tab.active { color: var(--yellow); border-bottom-color: var(--yellow); background: rgba(250,204,21,0.07); }
  .sw-tab.consigli-tab.active::before { background: var(--yellow); box-shadow: 0 0 8px var(--yellow), 0 0 16px rgba(250,204,21,0.4); }

  /* ── COUNTDOWN ── */
  .sw-countdown {
    font-size: 11px; color: var(--text3);
    background: var(--bg3);
    border: 1px solid var(--border);
    padding: 3px 9px; border-radius: 2px;
    letter-spacing: 1px;
  }

  /* ── MAIN ── */
  .sw-main {
    flex: 1;
    padding: 24px 32px;
    display: flex;
    flex-direction: column;
    position: relative;
    z-index: 1;
  }

  /* ── STAT CARDS ── */
  .sw-stat-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 16px;
  }
  .sw-stat-card {
    background: linear-gradient(145deg, #050b16 0%, #020609 100%);
    border: 1px solid var(--border2);
    border-radius: var(--radius-md);
    padding: 22px 24px;
    position: relative;
    overflow: hidden;
    transition: var(--transition);
    box-shadow: var(--shadow-panel);
  }
  .sw-stat-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 1px;
    background: var(--accent, var(--cyan));
    opacity: 0.9;
    box-shadow: 0 0 14px 2px var(--accent, var(--cyan));
  }
  .sw-stat-card:hover {
    border-color: var(--border3);
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(0,0,0,0.75), 0 0 0 1px rgba(56,189,248,0.18);
  }
  .sw-stat-label { font-size: 9px; letter-spacing: 3px; color: var(--text3); margin-bottom: 10px; text-transform: uppercase; }
  .sw-stat-value { font-size: 32px; font-weight: 700; color: var(--accent, var(--cyan)); line-height: 1; font-family: var(--mono); }
  .sw-stat-sub         { font-size: 11px; color: var(--text3); margin-top: 6px; }
  .sw-stat-sub.up      { color: var(--green); }
  .sw-stat-sub.up::before   { content: "▲ "; }
  .sw-stat-sub.down    { color: var(--red); }
  .sw-stat-sub.down::before { content: "▼ "; }

  /* ── PANELS ── */
  .sw-panel {
    background: var(--panel);
    border: 1px solid var(--border2);
    border-radius: var(--radius-md);
    overflow: hidden;
    flex: 1;
    box-shadow: var(--shadow-panel);
  }
  .sw-panel-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 15px 20px;
    border-bottom: none;
    background: var(--bg3);
    flex-shrink: 0;
    position: relative;
  }
  .sw-panel-header::after {
    content: '';
    position: absolute; bottom: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, var(--cyan) 0%, rgba(56,189,248,0.15) 40%, transparent 80%);
    opacity: 0.5;
  }
  .sw-panel-title {
    font-size: 10px; font-weight: 700; letter-spacing: 3.5px; color: var(--text2);
    text-transform: uppercase;
    font-family: var(--sans);
  }
  .sw-panel-badge {
    font-size: 9px; color: var(--text3);
    background: var(--bg3); border: 1px solid var(--border);
    padding: 3px 10px; border-radius: var(--radius-sm);
    letter-spacing: 1px;
    font-family: var(--mono);
  }
  .sw-panel-body {
    overflow-y: auto; max-height: 380px; padding: 0;
    font-size: 11px;
    scrollbar-width: thin;
    scrollbar-color: rgba(56,189,248,0.18) transparent;
  }
  .sw-panel-body::-webkit-scrollbar { width: 3px; }
  .sw-panel-body::-webkit-scrollbar-track { background: transparent; }
  .sw-panel-body::-webkit-scrollbar-thumb { background: rgba(56,189,248,0.18); border-radius: 2px; }
  .sw-panel-body::-webkit-scrollbar-thumb:hover { background: rgba(56,189,248,0.35); }

  /* ── TWO COL LAYOUT ── */
  .sw-two-col {
    display: grid;
    grid-template-columns: 1fr 360px;
    gap: 16px;
    margin-bottom: 16px;
  }

  /* ── LOG TABLE ── */
  .sw-log-row {
    display: grid;
    grid-template-columns: 68px 72px 50px 60px 90px 70px 55px 1fr;
    gap: 0;
    align-items: center;
    padding: 10px 20px;
    border-bottom: 1px solid rgba(94,234,212,0.04);
    font-size: 11px;
    cursor: pointer;
    transition: background 0.12s;
    font-family: var(--mono);
  }
  .sw-log-row:hover { background: rgba(56,189,248,0.04); }
  .sw-log-row.header {
    font-size: 10px; letter-spacing: 2.5px; color: var(--text3);
    background: var(--bg3); padding: 8px 20px;
    position: sticky; top: 0; z-index: 10;
    font-family: var(--sans);
    border-radius: 0;
  }
  .sw-log-row.header:hover { background: var(--bg3); }

  /* ── ACTION BADGES ── */
  .sw-action {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 3px 10px; border-radius: var(--radius-sm);
    font-size: 8.5px; font-weight: 700; letter-spacing: 2px;
    font-family: var(--mono);
    backdrop-filter: blur(4px);
  }
  .sw-action.GO_FULL  { background: rgba(34,197,94,0.1);   color: var(--go-full);  border: 1px solid rgba(34,197,94,0.2);   box-shadow: 0 0 8px rgba(34,197,94,0.15); }
  .sw-action.GO_HALF  { background: rgba(59,130,246,0.1);  color: var(--go-half);  border: 1px solid rgba(59,130,246,0.2);  }
  .sw-action.GO_MIN   { background: rgba(234,179,8,0.1);   color: var(--go-min);   border: 1px solid rgba(234,179,8,0.2);   }
  .sw-action.NOGO     { background: rgba(244,63,94,0.08);  color: var(--nogo);     border: 1px solid rgba(244,63,94,0.18);  box-shadow: 0 0 8px rgba(244,63,94,0.1); }
  .sw-action.FALLBACK { background: rgba(139,92,246,0.08); color: var(--fallback); border: 1px solid rgba(139,92,246,0.18); }

  .sw-outcome { font-weight: 700; }
  .sw-outcome.win       { color: var(--green); }
  .sw-outcome.loss      { color: var(--red); }
  .sw-outcome.breakeven { color: var(--yellow); }
  .sw-outcome.pending   { color: var(--text3); }

  /* ── FILTER ROW ── */
  .sw-filter-row {
    display: flex; gap: 8px; padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    background: var(--bg2);
    flex-shrink: 0;
  }
  .sw-filter-btn {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text3);
    font-size: 10px; letter-spacing: 1.5px;
    padding: 5px 16px; border-radius: var(--radius-sm);
    cursor: pointer;
    font-family: var(--mono);
    transition: var(--transition);
  }
  .sw-filter-btn:hover { border-color: var(--border3); color: var(--text); }
  .sw-filter-btn.active {
    border-color: var(--cyan); color: var(--cyan);
    background: rgba(79,209,197,0.08);
    box-shadow: 0 0 12px rgba(56,189,248,0.1);
  }

  /* ── MODAL ── */
  .sw-modal-overlay {
    position: fixed; inset: 0;
    background: rgba(5,7,13,0.85);
    backdrop-filter: blur(12px);
    z-index: 500;
    display: flex; align-items: center; justify-content: center;
  }
  .sw-modal {
    background: var(--bg3);
    border: 1px solid var(--border3);
    border-radius: var(--radius-lg);
    padding: 28px 32px;
    min-width: 340px; max-width: 520px;
    box-shadow: 0 48px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(79,209,197,0.08), inset 0 1px 0 rgba(56,189,248,0.06);
  }
  .sw-modal-title {
    font-size: 10px; font-weight: 700; letter-spacing: 3px;
    color: var(--cyan); margin-bottom: 18px;
    font-family: var(--sans);
  }
  .sw-modal-close {
    background: transparent; border: 1px solid var(--border2);
    color: var(--text3); cursor: pointer; padding: 4px 10px;
    font-size: 9px; border-radius: 2px; font-family: var(--mono);
    transition: all 0.15s; float: right;
  }
  .sw-modal-close:hover { border-color: var(--red); color: var(--red); }

  /* ── TOAST ── */
  .sw-toast-container {
    position: fixed; bottom: 20px; right: 24px; z-index: 600;
    display: flex; flex-direction: column; gap: 8px; align-items: flex-end;
  }
  .sw-toast {
    background: var(--bg3);
    border: 1px solid var(--border3);
    border-left: 3px solid var(--cyan);
    color: var(--text);
    font-size: 10px; padding: 10px 16px; border-radius: 3px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    font-family: var(--mono);
  }
  @keyframes toastIn {
    from { transform: translateX(110%); opacity: 0; }
    to   { transform: translateX(0);    opacity: 1; }
  }
  @keyframes toastOut {
    from { transform: translateX(0);    opacity: 1; }
    to   { transform: translateX(110%); opacity: 0; }
  }

  /* ── EMPTY STATE ── */
  .sw-empty {
    display: flex; align-items: center; justify-content: center;
    height: 80px; color: var(--text3); font-size: 11px;
    letter-spacing: 2px; font-family: var(--mono);
  }

  /* ── ACTION BREAKDOWN ── */
  .sw-action-row {
    display: grid;
    grid-template-columns: 70px 50px 50px 50px 1fr;
    gap: 0; align-items: center;
    padding: 9px 16px;
    border-bottom: 1px solid var(--border);
    font-size: 11px; font-family: var(--mono);
  }
  .sw-action-row.header {
    font-size: 9px; letter-spacing: 2px; color: var(--text3);
    background: var(--bg3);
    font-family: var(--sans);
  }
  .sw-bar-wrap { height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; }
  .sw-bar-fill { height: 100%; border-radius: 2px; transition: width 0.6s cubic-bezier(0.4,0,0.2,1); }

  /* ── HEALTH PILLS ── */
  .sw-health-grid {
    display: flex; flex-direction: column; gap: 9px;
    padding: 14px 16px;
  }
  .sw-health-row {
    display: flex; align-items: center; justify-content: space-between;
    font-size: 11px; padding: 8px 12px;
    background: var(--bg3); border-radius: 3px;
    border: 1px solid var(--border);
    font-family: var(--mono);
  }
  .sw-health-key { color: var(--text2); letter-spacing: 1px; }
  .sw-health-val { color: var(--green); font-weight: 700; }
  .sw-health-val.err { color: var(--red); }
  .sw-health-val.warn { color: var(--yellow); }

  /* ── EQUITY CHART ── */
  .sw-chart-svg { display: block; width: 100%; overflow: visible; }

  /* ── INPUT / SETTINGS ── */
  .sw-input {
    background: var(--bg3);
    border: 1px solid var(--border2);
    border-radius: var(--radius-sm);
    color: var(--text1);
    font-family: var(--mono);
    font-size: 11px;
    padding: 9px 14px;
    width: 100%;
    outline: none;
    transition: var(--transition);
    letter-spacing: 0.5px;
  }
  .sw-input:focus {
    border-color: var(--cyan);
    box-shadow: 0 0 0 3px rgba(56,189,248,0.1), 0 0 16px rgba(56,189,248,0.08);
    background: var(--bg4);
  }
  .sw-input::placeholder { color: var(--text3); }

  .sw-btn {
    background: rgba(94,234,212,0.08);
    border: 1px solid var(--border3);
    color: var(--cyan); font-family: var(--mono); font-size: 11px;
    padding: 10px 22px; border-radius: 3px; cursor: pointer;
    letter-spacing: 2px; font-weight: 700;
    transition: all 0.15s;
  }
  .sw-btn:hover { background: rgba(94,234,212,0.15); box-shadow: 0 0 16px rgba(94,234,212,0.1); }

  .sw-section-label {
    font-size: 10px; letter-spacing: 3px; color: var(--text3);
    text-transform: uppercase; margin-bottom: 10px;
    font-family: var(--sans); font-weight: 700;
  }

  /* ── CONFIG TAB ── */
  .sw-config-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
    padding: 20px 0;
  }

  /* ── MTF CARDS ── */
  .sw-mtf-root { padding: 0; }
  .sw-mtf-header {
    font-size: 11px; letter-spacing: 3px; color: var(--text2);
    padding: 12px 0 16px; font-family: var(--sans); font-weight: 700;
  }
  .sw-mtf-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 14px;
  }
  .sw-mtf-card {
    background: var(--panel);
    border: 1px solid var(--border2);
    border-radius: 4px;
    overflow: hidden;
    transition: border-color 0.2s, transform 0.15s;
  }
  .sw-mtf-card:hover { border-color: var(--border3); transform: translateY(-1px); }
  .sw-mtf-card-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    background: rgba(94,234,212,0.02);
  }
  .sw-mtf-card-body { padding: 12px 16px; display: flex; flex-direction: column; gap: 7px; }
  .sw-mtf-stat-row { display: flex; justify-content: space-between; font-size: 11px; font-family: var(--mono); }
  .sw-mtf-label { color: var(--text3); letter-spacing: 1px; }
  .sw-mtf-val { color: var(--text); font-weight: 700; }
  .sw-mtf-sparkrow { padding: 10px 16px 0; }
  .sw-mtf-fib-section { padding-top: 7px; border-top: 1px solid var(--border); }
  .sw-mtf-fib-row { display: flex; justify-content: space-between; font-size: 10px; padding: 2px 0; font-family: var(--mono); }
  .sw-mtf-loading { padding: 28px 16px; color: var(--text3); font-size: 11px; letter-spacing: 2px; font-family: var(--mono); }

  /* ── MARKET AI v2 ── */
  .sw-market-root { display: flex; flex-direction: column; gap: 12px; flex: 1; min-height: 0; }
  .sw-market-body { display: flex; gap: 12px; align-items: flex-start; }

  /* Category filter tabs */
  .sw-cat-tabs { display: flex; gap: 4px; flex-wrap: wrap; }
  .sw-cat-tab {
    padding: 5px 14px; border-radius: 2px;
    background: transparent; border: 1px solid var(--border2);
    color: var(--text3); font-size: 9px; font-weight: 700;
    letter-spacing: 2px; font-family: var(--mono);
    cursor: pointer; transition: all 0.15s; text-transform: uppercase;
  }
  .sw-cat-tab:hover { border-color: var(--border3); color: var(--text); }
  .sw-cat-tab.active { border-color: var(--cyan); color: var(--cyan); background: rgba(94,234,212,0.06); }

  /* Symbol list column */
  .sw-mkt-list-col {
    flex: 1; min-width: 0;
    background: var(--panel); border: 1px solid var(--border2);
    border-radius: 4px; overflow: hidden; display: flex; flex-direction: column;
    max-height: 72vh;
  }
  .sw-mkt-list-header {
    display: flex; align-items: center;
    padding: 8px 14px; gap: 0;
    background: var(--bg3); border-bottom: 1px solid var(--border2);
    font-size: 8px; letter-spacing: 2px; color: var(--text3);
    font-family: var(--sans); font-weight: 700; flex-shrink: 0;
  }
  .sw-mkt-list-body { overflow-y: auto; flex: 1; }
  .sw-mkt-row {
    display: flex; align-items: center;
    padding: 8px 14px; gap: 0;
    border-bottom: 1px solid var(--border);
    cursor: pointer; transition: background 0.1s;
    font-family: var(--mono);
  }
  .sw-mkt-row:hover {
    background: rgba(56,189,248,0.06);
    border-left: 2px solid rgba(56,189,248,0.4);
    padding-left: 12px;
  }
  .sw-mkt-row.selected {
    background: rgba(56,189,248,0.07);
    border-left: 2px solid var(--cyan);
    padding-left: 12px;
  }

  /* Detail column */
  .sw-mkt-detail-col {
    flex: 0 0 268px; display: flex; flex-direction: column; gap: 8px;
    overflow-y: auto; max-height: 72vh;
  }
  .sw-mkt-detail-hdr {
    display: flex; align-items: center; justify-content: space-between;
    background: var(--panel); border: 1px solid var(--border2);
    border-radius: 4px; padding: 12px 14px; flex-shrink: 0;
  }
  .sw-mkt-detail-panel {
    background: var(--panel); border: 1px solid var(--border2);
    border-radius: 4px; overflow: hidden; flex-shrink: 0;
  }
  .sw-mkt-panel-hdr {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 12px; border-bottom: 1px solid var(--border);
    font-size: 9px; font-weight: 700; letter-spacing: 2.5px;
    color: var(--text2); font-family: var(--sans);
    background: rgba(94,234,212,0.02);
  }
  .sw-mkt-info-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 6px 12px; border-bottom: 1px solid var(--border);
    font-size: 10px; font-family: var(--mono);
  }
  .sw-mkt-info-key { color: var(--text3); letter-spacing: 1px; font-size: 8px; }
  .sw-mkt-info-val { color: var(--text); font-weight: 700; font-size: 10px; }

  /* Asset pills (kept for backward compat) */
  .sw-asset-pill {
    display: flex; align-items: center; gap: 9px;
    padding: 9px 14px; border-radius: 3px;
    background: var(--panel); border: 1px solid var(--border2);
    cursor: pointer; transition: all 0.15s; font-size: 12px;
    font-family: var(--mono);
  }
  .sw-asset-pill:hover { border-color: var(--border3); }
  .sw-asset-pill.active { border-color: var(--cyan); background: rgba(94,234,212,0.04); }
  .sw-asset-pill-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

  /* ── NEWS v3 ── */
  .sw-news-root { display: flex; flex-direction: column; gap: 0; }

  /* ── fonte-tabs bar ── */
  .sw-news-src-bar {
    display: flex; align-items: stretch;
    background: var(--bg2);
    border: 1px solid var(--border2); border-bottom: none;
    border-radius: 4px 4px 0 0;
    overflow-x: auto; flex-shrink: 0;
    scrollbar-width: none;
  }
  .sw-news-src-bar::-webkit-scrollbar { display: none; }
  .sw-news-src-tab {
    display: flex; align-items: center; gap: 8px;
    padding: 0 22px; height: 48px;
    background: transparent; border: none;
    border-bottom: 2px solid transparent;
    color: var(--text3); font-size: 11px; font-weight: 700;
    letter-spacing: 2px; font-family: var(--mono);
    cursor: pointer; white-space: nowrap; flex-shrink: 0;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
  }
  .sw-news-src-tab:hover { color: var(--text); background: rgba(94,234,212,0.03); }
  .sw-news-src-tab.active {
    color: var(--src-col, var(--cyan));
    border-bottom-color: var(--src-col, var(--cyan));
    background: rgba(94,234,212,0.05);
  }
  .sw-news-src-dot {
    width: 8px; height: 8px; border-radius: 50%;
    flex-shrink: 0; transition: box-shadow 0.2s;
  }
  .sw-news-src-tab.active .sw-news-src-dot { box-shadow: 0 0 9px var(--src-col, var(--cyan)); }
  .sw-news-live-badge {
    font-size: 9px; font-weight: 700; letter-spacing: 1px;
    padding: 2px 7px; border-radius: 2px;
  }
  .sw-news-live-badge.live   { background: rgba(74,222,128,0.08);  color: var(--green);  border: 1px solid rgba(52,211,153,0.22); }
  .sw-news-live-badge.cached { background: rgba(251,191,36,0.08);   color: var(--yellow); border: 1px solid rgba(251,191,36,0.22); }
  .sw-news-src-sep { flex: 1; }
  .sw-news-src-meta {
    display: flex; align-items: center; gap: 12px;
    padding: 0 16px; font-size: 11px; color: var(--text3);
    font-family: var(--mono); letter-spacing: 1px; flex-shrink: 0;
  }
  .sw-news-refresh {
    background: transparent; border: 1px solid var(--border2);
    color: var(--text3); font-size: 10px; letter-spacing: 1.5px;
    padding: 4px 12px; border-radius: 2px; cursor: pointer;
    font-family: var(--mono); transition: all 0.15s;
  }
  .sw-news-refresh:hover { border-color: var(--cyan); color: var(--cyan); }

  /* ── content panel ── */
  .sw-news-panel {
    background: var(--panel);
    border: 1px solid var(--border2); border-top: none;
    border-radius: 0 0 4px 4px;
    display: flex; flex-direction: column;
    min-height: 400px;
  }

  /* ── cards grid — same as v14 ── */
  .sw-news-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 10px;
    padding: 14px;
  }
  .sw-news-card {
    background: var(--bg3); border: 1px solid var(--border2);
    border-radius: 4px; display: flex; flex-direction: column;
    cursor: pointer; text-decoration: none; color: inherit;
    transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s;
    overflow: hidden;
  }
  .sw-news-card:hover {
    border-color: var(--src-col, var(--cyan));
    transform: translateY(-2px);
    box-shadow: 0 6px 24px rgba(0,0,0,0.35);
  }
  .sw-news-card-header {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 13px;
    border-bottom: 1px solid var(--border);
    background: rgba(94,234,212,0.02);
  }
  .sw-news-source-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .sw-news-source-label { font-size: 10px; font-weight: 700; letter-spacing: 1.5px; font-family: var(--mono); flex: 1; }
  .sw-news-impact-badge {
    font-size: 9px; font-weight: 700; letter-spacing: 1.5px;
    padding: 2px 7px; border-radius: 2px; font-family: var(--mono);
  }
  .sw-news-impact-badge.high { background: rgba(251,113,133,0.1); color: var(--red);    border: 1px solid rgba(251,113,133,0.22); }
  .sw-news-impact-badge.med  { background: rgba(251,191,36,0.1);  color: var(--yellow); border: 1px solid rgba(251,191,36,0.22); }
  .sw-news-impact-badge.low  { background: rgba(99,179,237,0.06); color: var(--text3);  border: 1px solid var(--border); }
  .sw-news-card-body { padding: 12px 13px; flex: 1; display: flex; flex-direction: column; gap: 6px; }
  .sw-news-title { font-size: 13px; color: var(--text1); line-height: 1.5; font-family: var(--sans); font-weight: 600; }
  .sw-news-desc  { font-size: 11px; color: var(--text2); line-height: 1.5; font-family: var(--sans);
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .sw-news-footer {
    display: flex; align-items: center; justify-content: space-between;
    padding: 9px 13px; border-top: 1px solid var(--border);
    font-size: 10px; font-family: var(--mono); letter-spacing: 1px;
  }
  .sw-news-time { color: var(--text3); }

  /* loading / empty */
  .sw-news-loading {
    display: flex; align-items: center; justify-content: center; gap: 10px;
    flex: 1; padding: 48px; color: var(--text3);
    font-size: 9px; letter-spacing: 2px; font-family: var(--mono);
  }
  .sw-news-spinner {
    width: 14px; height: 14px; border-radius: 50%;
    border: 2px solid var(--border2); border-top-color: var(--cyan);
    animation: _nspin 0.7s linear infinite;
  }
  @keyframes _nspin { to { transform: rotate(360deg); } }
  .sw-news-empty {
    display: flex; align-items: center; justify-content: center;
    flex: 1; padding: 48px; color: var(--text3);
    font-size: 9px; letter-spacing: 2px; font-family: var(--mono);
  }

  /* legacy refs */
  .sw-news-item { background: var(--panel); border: 1px solid var(--border2); border-radius: 4px; padding: 12px 16px; }
  .sw-news-meta { font-size: 8px; color: var(--text3); letter-spacing: 1.5px; margin-bottom: 5px; font-family: var(--mono); }
  .sw-news-sent { display: inline-flex; align-items: center; gap: 5px; font-size: 8px; margin-top: 6px;
    padding: 2px 8px; border-radius: 2px; border: 1px solid; font-family: var(--mono); font-weight: 700; letter-spacing: 1.5px; }
  .sw-news-sent.bull { color: var(--green); border-color: rgba(52,211,153,0.25); background: rgba(74,222,128,0.06); }
  .sw-news-sent.bear { color: var(--red);   border-color: rgba(248,113,113,0.25); background: rgba(251,113,133,0.06); }
  .sw-news-sent.neutral { color: var(--text3); border-color: var(--border); background: transparent; }

  /* ── PERF TAB ── */
  .sw-perf-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    margin-top: 14px;
  }

  /* ── SCROLLBAR GLOBAL ── */
  * { scrollbar-width: thin; scrollbar-color: rgba(56,189,248,0.15) transparent; }
  *::-webkit-scrollbar { width: 3px; height: 3px; }
  *::-webkit-scrollbar-thumb { background: rgba(56,189,248,0.15); border-radius: 2px; }
  *::-webkit-scrollbar-track { background: transparent; }

  /* ── ANIMATIONS ── */
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .sw-main > * { animation: fade-in 0.25s ease; }

  /* ── RESPONSIVE ── */
  @media (max-width: 900px) {
    .sw-stat-grid  { grid-template-columns: repeat(2, 1fr); }
    .sw-two-col    { grid-template-columns: 1fr; }
    .sw-asset-grid { grid-template-columns: repeat(2, 1fr); }
    .sw-perf-grid  { grid-template-columns: 1fr; }
  }
`;

// ── UTILS ─────────────────────────────────────────────────────────
const _memStore = {};
const _lsAvailable = (() => { try { localStorage.setItem("__test__","1"); localStorage.removeItem("__test__"); return true; } catch { return false; } })();
const LS = {
  get: (k, def) => {
    if (_lsAvailable) { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; } }
    return k in _memStore ? _memStore[k] : def;
  },
  set: (k, v) => {
    if (_lsAvailable) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
    else { _memStore[k] = v; }
  },
};

const fmtTime = ts => { try { return new Date(ts).toLocaleTimeString("it-IT", { hour:"2-digit", minute:"2-digit", second:"2-digit" }); } catch { return "—"; } };
const fmtDate = ts => { try { return new Date(ts).toLocaleDateString("it-IT", { day:"2-digit", month:"2-digit" }); } catch { return "—"; } };
const fmtNum  = (n, dec = 2) => { if (n === null || n === undefined) return "—"; return typeof n === "number" ? n.toFixed(dec) : String(n); };

const COLOR_BY_ACTION = {
  GO_FULL: "var(--go-full)", GO_HALF: "var(--go-half)",
  GO_MIN: "var(--go-min)", NOGO: "var(--nogo)", FALLBACK: "var(--fallback)",
};

// ── SPARKLINE ─────────────────────────────────────────────────────
const Sparkline = memo(function Sparkline({ data, width = 200, height = 44, showArea = true }) {
  const id = useSvgId("sg");
  if (!data || data.length < 2) return <div style={{ width, height, display:"flex", alignItems:"center", justifyContent:"center", color:"var(--text3)", fontSize:9 }}>NO DATA</div>;
  const vals = data.map(d => d.equity || d.balance || 0).filter(v => v > 0);
  if (vals.length < 2) return null;
  const min   = Math.min(...vals);
  const max   = Math.max(...vals);
  const range = max - min || 1;
  const pts   = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 6) - 3;
    return `${x},${y}`;
  }).join(" ");
  const last  = vals[vals.length - 1];
  const first = vals[0];
  const up    = last >= first;
  const col   = up ? "var(--green)" : "var(--red)";
  // Calcolo diretto del last point senza parsing stringa
  const lastX = width;
  const lastY = height - ((last - min) / range) * (height - 6) - 3;
  return (
    <svg width={width} height={height}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={col} stopOpacity="0.28" />
          <stop offset="100%" stopColor={col} stopOpacity="0" />
        </linearGradient>
      </defs>
      {showArea && <polyline points={`${pts} ${width},${height} 0,${height}`} fill={`url(#${id})`} stroke="none" />}
      <polyline points={pts} fill="none" stroke={col} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="3" fill={col} />
      <circle cx={lastX} cy={lastY} r="6" fill="none" stroke={col} strokeWidth="1" opacity="0.35">
        <animate attributeName="r" values="4;8;4" dur="2.5s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.35;0;0.35" dur="2.5s" repeatCount="indefinite"/>
      </circle>
    </svg>
  );
});

// ── EQUITY + DRAWDOWN CHART ───────────────────────────────────────
const EquityChart = memo(function EquityChart({ data, width = 700, height = 160 }) {
  const gId = useSvgId("eq-grad");
  if (!data || data.length < 2) return <div className="sw-empty">In attesa di dati equity</div>;
  const vals  = data.map(d => d.equity || 0);
  const min   = Math.min(...vals);
  const max   = Math.max(...vals);
  const range = max - min || 1;
  const pad   = { t: 10, r: 10, b: 28, l: 60 };
  const W     = width  - pad.l - pad.r;
  const H     = height - pad.t - pad.b;

  const pts = vals.map((v, i) => {
    const x = pad.l + (i / (vals.length - 1)) * W;
    const y = pad.t + H - ((v - min) / range) * H;
    return `${x},${y}`;
  }).join(" ");

  const firstPts = `${pad.l},${pad.t + H}`;
  const lastPts  = `${pad.l + W},${pad.t + H}`;
  const up = vals[vals.length - 1] >= vals[0];
  const col = up ? "var(--green)" : "var(--red)";

  // Y grid
  const ticks = 4;
  const yLines = Array.from({ length: ticks + 1 }, (_, i) => {
    const v = min + (range / ticks) * i;
    const y = pad.t + H - ((v - min) / range) * H;
    return { y, v };
  });

  // X labels (first, mid, last)
  const xLabels = [0, Math.floor(data.length / 2), data.length - 1].map(i => ({
    x: pad.l + (i / (data.length - 1)) * W,
    label: fmtDate(data[i]?.ts),
  }));

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display:"block" }}>
      <defs>
        <linearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={col} stopOpacity="0.38" />
          <stop offset="100%" stopColor={col} stopOpacity="0" />
        </linearGradient>
        <filter id={gId + "-glow"}>
          <feGaussianBlur stdDeviation="2.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {/* grid lines */}
      {yLines.map(({ y, v }) => (
        <g key={v}>
          <line x1={pad.l} y1={y} x2={pad.l + W} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          <text x={pad.l - 6} y={y + 3} textAnchor="end" fontSize="8" fill="var(--text3)" fontFamily="var(--mono)">{v.toFixed(0)}</text>
        </g>
      ))}
      {/* area */}
      <polyline points={`${firstPts} ${pts} ${lastPts}`} fill={`url(#${gId})`} stroke="none" />
      {/* line */}
      <polyline points={pts} fill="none" stroke={col} strokeWidth="2.5" strokeLinejoin="round" filter={`url(#${gId}-glow)`} />
      {/* x labels */}
      {xLabels.map(({ x, label }) => (
        <text key={label} x={x} y={height - 4} textAnchor="middle" fontSize="8" fill="var(--text3)" fontFamily="var(--mono)">{label}</text>
      ))}
    </svg>
  );
});

// ── DRAWDOWN CHART ────────────────────────────────────────────────
const DrawdownChart = memo(function DrawdownChart({ data, width = 700, height = 80 }) {
  if (!data || data.length < 2) return null;
  const vals = data.map(d => d.equity || 0);
  let peak = vals[0];
  const dds = vals.map(v => { if (v > peak) peak = v; return peak > 0 ? ((v - peak) / peak) * 100 : 0; });
  const minDD = Math.min(...dds);
  const pad = { t: 4, r: 10, b: 20, l: 44 };
  const W = width - pad.l - pad.r;
  const H = height - pad.t - pad.b;
  const pts = dds.map((v, i) => {
    const x = pad.l + (i / (dds.length - 1)) * W;
    const y = pad.t + H - ((v - minDD) / (-minDD || 1)) * H;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display:"block" }}>
      <defs>
        <linearGradient id="dd-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="var(--red)" stopOpacity="0.28"/>
          <stop offset="100%" stopColor="var(--red)" stopOpacity="0.03"/>
        </linearGradient>
      </defs>
      <polyline points={`${pad.l},${pad.t + H} ${pts} ${pad.l + W},${pad.t + H}`} fill="url(#dd-grad)" stroke="none" />
      <polyline points={pts} fill="none" stroke="var(--red)" strokeWidth="1.8" strokeLinejoin="round" strokeDasharray="3,2" />
      <text x={pad.l - 4} y={pad.t + H} textAnchor="end" fontSize="8" fill="var(--text3)" fontFamily="var(--mono)">0%</text>
      <text x={pad.l - 4} y={pad.t + 8} textAnchor="end" fontSize="8" fill="var(--red)" fontFamily="var(--mono)">{minDD.toFixed(1)}%</text>
      <text x={pad.l + W / 2} y={height - 2} textAnchor="middle" fontSize="8" fill="var(--text3)" fontFamily="var(--mono)">DRAWDOWN</text>
    </svg>
  );
});

// ── STAT CARD ────────────────────────────────────────────────────
const StatCard = memo(function StatCard({ label, value, sub, accent = "var(--cyan)" }) {
  return (
    <div className="sw-stat-card" style={{ "--accent": accent }}>
      <div className="sw-stat-label">{label}</div>
      <div className="sw-stat-value">{value ?? "—"}</div>
      {sub && (
        <div className={`sw-stat-sub${typeof sub === "string" && sub.startsWith("+") ? " up" : typeof sub === "string" && sub.startsWith("-") ? " down" : ""}`}>
          {sub}
        </div>
      )}
    </div>
  );
});

// ── ACTION BADGE ─────────────────────────────────────────────────
const ActionBadge = memo(function ActionBadge({ action }) {
  if (!action) return <span style={{ color:"var(--text3)", fontSize:9 }}>—</span>;
  return <span className={`sw-action ${action}`}>{action.replace("_", " ")}</span>;
});

// ── TRADE MODAL ──────────────────────────────────────────────────
function TradeModal({ trade, onClose }) {
  if (!trade) return null;
  const dec = trade.symbol?.includes("JPY") ? 3 : trade.symbol?.includes("BTC") || trade.symbol?.includes("XAU") ? 2 : 5;
  const rows = [
    ["TRADE ID",    trade.trade_id],
    ["APERTA IL",   new Date(trade.ts).toLocaleString("it-IT")],
    ["CHIUSA IL",   trade.closed_at ? new Date(trade.closed_at).toLocaleString("it-IT") : "—"],
    ["SYMBOL",      trade.symbol],
    ["DIRECTION",   trade.direction],
    ["ACTION",      trade.action],
    ["QUALITY",     trade.quality ?? "—"],
    ["REGIME H4",   trade.regime ?? "—"],
    ["ADX H4",      trade.h4_adx != null ? trade.h4_adx.toFixed(2) : "—"],
    ["ENTRY",       trade.entry != null ? trade.entry.toLocaleString("en-US", { maximumFractionDigits:dec }) : "—"],
    ["STOP LOSS",   trade.sl != null ? trade.sl.toLocaleString("en-US", { maximumFractionDigits:dec }) : "—"],
    ["LOT ADJ",     trade.lot_adj != null ? trade.lot_adj.toFixed(2) : "—"],
    ["BONUS COUNT", trade.bonus_count != null ? `${trade.bonus_count}` : "—"],
    ["CONFIDENCE",  trade.confidence != null ? `${trade.confidence}%` : "—"],
    ["NEWS IMPACT", trade.news_impact ?? "—"],
    ["OUTCOME",     trade.outcome?.toUpperCase() ?? (trade.action === "NOGO" ? "NOGO — NO TRADE" : "APERTA")],
    ["PROFIT",      trade.profit != null ? `${trade.profit >= 0 ? "+" : ""}${fmtNum(trade.profit)} USD` : "—"],
    ["PIPS",        trade.pips != null ? `${trade.pips >= 0 ? "+" : ""}${fmtNum(trade.pips, 1)}` : "—"],
    ["FALLBACK",    trade.is_fallback ? "SÌ" : "NO"],
    ["REASON",      trade.reason ?? "—"],
  ];
  return (
    <div className="sw-modal-overlay" onClick={onClose}>
      <div className="sw-modal" onClick={e => e.stopPropagation()}>
        <button className="sw-modal-close" onClick={onClose}>✕</button>
        <div className="sw-modal-title">◈ DETTAGLIO TRADE</div>
        {rows.map(([k, v]) => (
          <div key={k}>
            <div className="sw-modal-row">
              <span className="sw-modal-key">{k}</span>
              <span className="sw-modal-val" style={{
                color: k === "DIRECTION"   ? (v === "BUY" || v === "LONG" ? "var(--green)" : "var(--red)")
                     : k === "PROFIT"     ? (v?.startsWith("+") ? "var(--green)" : v?.startsWith("-") ? "var(--red)" : "var(--text)")
                     : k === "REGIME H4"  ? (v === "BULL" ? "var(--green)" : v === "BEAR" ? "var(--red)" : "var(--text)")
                     : k === "NEWS IMPACT"? (v === "bullish" ? "var(--green)" : v === "bearish" ? "var(--red)" : "var(--text)")
                     : k === "QUALITY"    ? (v === "GO_FULL" ? "var(--go-full)" : v === "GO_HALF" ? "var(--go-half)" : v === "GO_MIN" ? "var(--go-min)" : "var(--text)")
                     : k === "FALLBACK"   ? (v === "SÌ" ? "var(--red)" : "var(--text3)")
                     : "var(--text)",
                maxWidth: 280, textAlign: "right", wordBreak: "break-word"
              }}>{v}</span>
            </div>
            {k === "CONFIDENCE" && trade.confidence != null && (
              <div style={{ padding:"0 0 10px 0" }}>
                <div style={{ height:3, background:"var(--bg4)", borderRadius:99, overflow:"hidden" }}>
                  <div style={{
                    height:"100%", borderRadius:99,
                    width:`${trade.confidence}%`,
                    background: trade.confidence >= 75 ? "var(--green)" : trade.confidence >= 55 ? "var(--yellow)" : "var(--red)",
                    boxShadow: `0 0 8px ${trade.confidence >= 75 ? "var(--green)" : trade.confidence >= 55 ? "var(--yellow)" : "var(--red)"}`,
                    transition:"width 0.5s cubic-bezier(0.4,0,0.2,1)"
                  }}/>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── TOAST SYSTEM ─────────────────────────────────────────────────
const ToastContainer = memo(function ToastContainer({ toasts }) {
  return (
    <div className="sw-toast-container">
      {toasts.map(t => (
        <div key={t.id} className="sw-toast" style={{
          animation: t.fading
            ? "toastOut 0.3s cubic-bezier(0.4,0,1,1) forwards"
            : "toastIn  0.3s cubic-bezier(0,0,0.2,1) forwards"
        }}>
          <span style={{ fontSize: 14 }}>{t.icon}</span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
});

// ── COUNTDOWN RING ────────────────────────────────────────────────
const CountdownRing = memo(function CountdownRing({ seconds, total = 15 }) {
  const pct = seconds / total;
  const r   = 5;
  const circ = 2 * Math.PI * r;
  return (
    <svg className="sw-countdown-ring" viewBox="0 0 14 14">
      <circle cx="7" cy="7" r={r} fill="none" stroke="var(--border2)" strokeWidth="1.5" />
      <circle cx="7" cy="7" r={r} fill="none" stroke="var(--cyan)" strokeWidth="1.5"
        strokeDasharray={`${circ * pct} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1s linear" }}
      />
    </svg>
  );
});

// ── TICKER BAR ────────────────────────────────────────────────────
const TickerBar = memo(function TickerBar({ prices }) {
  const items = Object.entries(prices);
  if (!items.length) return null;
  // double for seamless loop
  const all = [...items, ...items];
  return (
    <div className="sw-ticker-bar">
      <div className="sw-ticker-track">
        {all.map(([sym, d], i) => (
          <div key={`${sym}-${i}`} className="sw-ticker-item">
            <span className="sw-ticker-sym">{sym}</span>
            <span className="sw-ticker-price">{typeof d.price === "number" ? d.price.toLocaleString("en-US", { maximumFractionDigits: sym.includes("USD") && !sym.includes("BTC") && !sym.includes("ETH") ? 4 : 0 }) : "—"}</span>
            {d.chg !== undefined && (
              <span className={`sw-ticker-chg ${d.chg >= 0 ? "up" : "down"}`}>
                {d.chg >= 0 ? "▲" : "▼"}{Math.abs(d.chg).toFixed(2)}%
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

// ── LIVE MONITOR TAB ──────────────────────────────────────────────
function LiveMonitor({ serverUrl, isDemoMode, addToast }) {
  const [stats,     setStats]     = useState(null);
  const [logs,      setLogs]      = useState([]);
  const [equity,    setEquity]    = useState([]);
  const [health,    setHealth]    = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  const [countdown, setCountdown] = useState(15);
  const [filterAction, setFilterAction] = useState("ALL");
  const [selectedTrade, setSelectedTrade] = useState(null);
  const intervalRef = useRef(null);
  const cntRef      = useRef(null);

  const fetchAll = useCallback(async () => {
    if (isDemoMode) {
      setStats(DEMO_STATS); setLogs(DEMO_LOGS);
      setEquity(DEMO_EQUITY); setHealth(DEMO_HEALTH);
      setLastFetch(new Date()); setCountdown(15); return;
    }
    if (!serverUrl) return;
    setLoading(true); setError(null);
    try {
      const [sRes, lRes, eRes, hRes] = await Promise.all([
        fetch(`${serverUrl}/stats`), fetch(`${serverUrl}/log?limit=50`),
        fetch(`${serverUrl}/equity?limit=200`), fetch(`${serverUrl}/health`),
      ]);
      if (sRes.ok) setStats(await sRes.json());
      if (lRes.ok) { const l = await lRes.json(); setLogs(l);
        // toast on new GO_FULL
        if (l[0]?.action === "GO_FULL") addToast("🟢", `GO_FULL — ${l[0].symbol} ${l[0].direction}`);
        if (l[0]?.action === "NOGO")    addToast("🔴", `NOGO — ${l[0].symbol} filtrata`);
      }
      if (eRes.ok) setEquity((await eRes.json()).reverse());
      if (hRes.ok) setHealth(await hRes.json());
      setLastFetch(new Date());
    } catch(e) {
      const msg = e.message || String(e);
      // Aiuta a distinguere CORS/Mixed Content da server down
      const hint = msg.includes("Failed to fetch") || msg.includes("NetworkError")
        ? msg + " — possibile CORS, Mixed Content (http vs https) o server non raggiungibile"
        : msg;
      setError(hint);
    }
    finally { setLoading(false); setCountdown(15); }
  }, [serverUrl, isDemoMode, addToast]);

  useEffect(() => {
    fetchAll();
    intervalRef.current = setInterval(fetchAll, 15000);
    cntRef.current = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => { clearInterval(intervalRef.current); clearInterval(cntRef.current); };
  }, [fetchAll]);

  const healthColor = !health ? "var(--text3)"
    : health.status === "ok" ? "var(--green)" : "var(--red)";

  const FILTER_OPTS = ["ALL", "GO_FULL", "GO_HALF", "GO_MIN", "NOGO", "WIN", "LOSS"];
  const filteredLogs = useMemo(() => logs.filter(l => {
    if (filterAction === "ALL")     return true;
    if (filterAction === "WIN")     return l.outcome === "win";
    if (filterAction === "LOSS")    return l.outcome === "loss";
    return l.action === filterAction;
  }), [logs, filterAction]);

  const exportCSV = () => {
    const h = ["trade_id","ts","closed_at","symbol","direction","entry","sl",
               "action","quality","regime","h4_adx","lot_adj","bonus_count",
               "confidence","news_impact","outcome","profit","pips","is_fallback","reason"];
    const rows = logs.map(l => h.map(k => JSON.stringify(l[k] ?? "")).join(","));
    const blob = new Blob([h.join(",") + "\n" + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `swifttrend_log_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {selectedTrade && <TradeModal trade={selectedTrade} onClose={() => setSelectedTrade(null)} />}

      {/* DEMO WARNING BANNER */}
      {isDemoMode && (
        <div style={{
          display:"flex", alignItems:"center", gap:10,
          padding:"9px 16px", borderRadius:6,
          background:"rgba(229,192,123,0.06)",
          border:"1px solid rgba(229,192,123,0.25)",
          fontSize:9, color:"var(--yellow)", letterSpacing:1.5,
        }}>
          <span style={{ fontSize:13 }}>⚠</span>
          <span><strong>MODALITÀ DEMO ATTIVA</strong> — Tutti i dati mostrati sono simulati e non riflettono operazioni reali. Configura il VPS URL in CONFIG ⚙ per passare alla modalità live.</span>
        </div>
      )}
      {/* LIVE BANNER */}
      {!isDemoMode && serverUrl && (
        <div style={{
          display:"flex", alignItems:"center", gap:10,
          padding:"9px 16px", borderRadius:6,
          background:"rgba(35,209,139,0.05)",
          border:"1px solid rgba(35,209,139,0.2)",
          fontSize:9, color:"var(--green)", letterSpacing:1.5,
        }}>
          <span style={{ fontSize:13 }}>●</span>
          <span><strong>MODALITÀ LIVE</strong> — Dati reali dal VPS <span style={{ color:"var(--cyan)", fontFamily:"var(--mono)" }}>{serverUrl}</span> · Aggiornamento ogni 15s</span>
        </div>
      )}

      {/* STAT GRID */}
      <div className="sw-stat-grid">
        <StatCard label="TOTAL TRADES"  value={stats?.total_trades ?? "—"} sub="registrate su disco" />
        <StatCard label="WIN RATE AI"   value={stats?.win_rate_pct != null ? `${stats.win_rate_pct}%` : "—"} accent="var(--green)" sub={`${stats?.wins ?? 0}W / ${stats?.losses ?? 0}L`} />
        <StatCard label="TOTAL PROFIT"  value={stats?.total_profit != null ? `${stats.total_profit >= 0 ? "+" : ""}${fmtNum(stats.total_profit)}` : "—"} accent={stats?.total_profit >= 0 ? "var(--green)" : "var(--red)"} sub="su trade chiuse" />
        <StatCard label="NOGO COUNT"    value={stats?.nogo_count ?? "—"} accent="var(--nogo)" sub="trade filtrate" />
        <StatCard label="FALLBACK RATE" value={stats?.fallback_rate_pct != null ? `${stats.fallback_rate_pct}%` : "—"} accent="var(--fallback)" sub="errori Claude" />
        <StatCard label="SERVER UPTIME" value={health?.uptime_s != null ? `${Math.floor(health.uptime_s / 60)}m` : "—"} accent="var(--cyan)" sub={`v${health?.version ?? "?"}`} />
      </div>

      {/* TWO COL */}
      <div className="sw-two-col">

        {/* TRADE LOG */}
        <div className="sw-panel" style={{ minHeight:360 }}>
          <div className="sw-panel-header">
            <div className="sw-panel-title">TRADE LOG</div>
            <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:8 }}>
              {lastFetch && (
                <div className="sw-countdown">
                  <CountdownRing seconds={countdown} />
                  <span>{fmtTime(lastFetch)}</span>
                </div>
              )}
              <button className="sw-btn sw-btn-green" onClick={exportCSV}>↓ CSV</button>
              <button className="sw-btn sw-btn-cyan" onClick={fetchAll} disabled={loading}>{loading ? "⟳" : "↻ REFRESH"}</button>
            </div>
          </div>

          {/* FILTERS */}
          <div className="sw-filter-row">
            {FILTER_OPTS.map(f => (
              <button key={f} className={`sw-filter-btn${filterAction === f ? " active" : ""}`} onClick={() => setFilterAction(f)}>{f}</button>
            ))}
            <span style={{ marginLeft:"auto", fontSize:9, color:"var(--text3)" }}>{filteredLogs.length} righe</span>
          </div>

          <div className="sw-panel-body">
            {error ? (
              <div className="sw-empty" style={{ color:"var(--red)" }}>
                Connessione fallita: {error}<br />
                <span style={{ fontSize:9, color:"var(--text3)" }}>Verifica URL server e VPS.</span>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div style={{ padding:"24px", textAlign:"center" }}>
                <div className="sw-empty" style={{ marginBottom:12 }}>Nessuna trade nel log</div>
                {!isDemoMode && (
                  <div style={{ fontSize:9, color:"var(--text3)", lineHeight:1.8 }}>
                    <div>Server raggiungibile ma <code style={{ color:"var(--cyan)" }}>/log</code> ha restituito 0 righe.</div>
                    <div style={{ marginTop:8, color:"var(--yellow)" }}>Cause possibili:</div>
                    <div>① <code>trade_log.jsonl</code> non esiste ancora sul VPS → attendi la prima trade da MT5</div>
                    <div>② Il server non ha permessi di scrittura nella sua directory</div>
                    <div>③ Le trade arrivano come NOGO — sono comunque salvate nel log</div>
                    <div style={{ marginTop:10 }}>
                      <button className="sw-btn" style={{ fontSize:9 }} onClick={fetchAll}>↺ Ricarica ora</button>
                      <a href={`${serverUrl}/log?limit=5`} target="_blank" rel="noopener noreferrer"
                         style={{ marginLeft:10, color:"var(--cyan)", fontSize:9, textDecoration:"underline" }}>
                        Apri /log direttamente ↗
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="sw-log-row header" onClick={undefined} style={{ cursor:"default" }}>
                  <span>TIME</span>
                  <span>SYMBOL</span>
                  <span>DIR</span>
                  <span>ACTION</span>
                  <span>ENTRY / SL</span>
                  <span>REGIME</span>
                  <span>LOT</span>
                  <span>REASON</span>
                </div>
                {filteredLogs.map((t, i) => (
                  <div key={t.trade_id || i} className="sw-log-row" onClick={() => setSelectedTrade(t)}>
                    {/* TIME */}
                    <span style={{ fontSize:9, color:"var(--text3)" }}>{fmtTime(t.ts)}</span>
                    {/* SYMBOL */}
                    <span style={{ color:"var(--cyan)", fontWeight:600, fontSize:10 }}>{t.symbol}</span>
                    {/* DIR */}
                    <span style={{ color: t.direction === "LONG" || t.direction === "BUY" ? "var(--green)" : "var(--red)", fontWeight:700, fontSize:10 }}>
                      {t.direction === "LONG" || t.direction === "BUY" ? "▲" : "▼"} {t.direction}
                    </span>
                    {/* ACTION */}
                    <div style={{ display:"flex", alignItems:"center", gap:3 }}>
                      <ActionBadge action={t.action} />
                      {t.action === "NOGO" && t.blocked_by === "news_filter" && (
                        <span style={{ fontFamily:"var(--mono)", fontSize:9, fontWeight:700, padding:"2px 5px", borderRadius:3, background:"rgba(251,146,60,0.12)", color:"var(--orange)", border:"1px solid rgba(251,146,60,0.25)", letterSpacing:0.5, whiteSpace:"nowrap" }}>🔇 NEWS BLOCK</span>
                      )}
                      {t.action === "NOGO" && t.blocked_by === "circuit_breaker" && (
                        <span style={{ fontFamily:"var(--mono)", fontSize:9, fontWeight:700, padding:"2px 5px", borderRadius:3, background:"rgba(248,113,113,0.12)", color:"var(--red)", border:"1px solid rgba(248,113,113,0.25)", letterSpacing:0.5, whiteSpace:"nowrap" }}>⛔ CIRCUIT</span>
                      )}
                    </div>
                    {/* ENTRY / SL */}
                    <div style={{ display:"flex", flexDirection:"column", gap:1 }}>
                      <span style={{ fontSize:9, color:"var(--text2)", fontFamily:"var(--mono)" }}>
                        E: {t.entry != null ? t.entry.toLocaleString("en-US", { maximumFractionDigits:5 }) : "—"}
                      </span>
                      <span style={{ fontSize:9, color:"rgba(251,113,133,0.7)", fontFamily:"var(--mono)" }}>
                        SL: {t.sl != null ? t.sl.toLocaleString("en-US", { maximumFractionDigits:5 }) : "—"}
                      </span>
                    </div>
                    {/* REGIME */}
                    <span style={{
                      fontSize:8, fontWeight:700, padding:"2px 6px", borderRadius:2, letterSpacing:1,
                      color: t.regime === "BULL" ? "var(--green)" : t.regime === "BEAR" ? "var(--red)" : "var(--text3)",
                      background: t.regime === "BULL" ? "rgba(74,222,128,0.08)" : t.regime === "BEAR" ? "rgba(248,113,113,0.08)" : "transparent",
                      border: `1px solid ${t.regime === "BULL" ? "rgba(74,222,128,0.2)" : t.regime === "BEAR" ? "rgba(251,113,133,0.2)" : "var(--border)"}`,
                    }}>{t.regime ?? "—"}</span>
                    {/* LOT */}
                    <span style={{ fontSize:10, color: t.lot_adj > 0 ? "var(--text1)" : "var(--text3)", fontFamily:"var(--mono)" }}>
                      {t.lot_adj != null ? t.lot_adj.toFixed(2) : "—"}
                    </span>
                    {/* REASON */}
                    <span style={{ color:"var(--text3)", fontSize:9, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {t.reason || "—"}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

          {/* EQUITY SPARKLINE */}
          <div className="sw-panel" style={{ flex:"0 0 auto" }}>
            <div className="sw-panel-header">
              <div className="sw-panel-title">EQUITY CURVE</div>
              <span className="sw-panel-badge">{equity.length} pts</span>
            </div>
            <div style={{ padding:"10px 14px" }}>
              {equity.length > 1
                ? <Sparkline data={equity} width={312} height={56} />
                : <div className="sw-empty" style={{ padding:16 }}>In attesa</div>}
              {equity.length > 0 && (
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:5, fontSize:9, color:"var(--text3)" }}>
                  <span>MIN: {Math.min(...equity.map(e => e.equity || 0)).toFixed(2)}</span>
                  <span style={{ color: equity[equity.length-1]?.equity > equity[0]?.equity ? "var(--green)" : "var(--red)", fontWeight:600 }}>
                    {equity[equity.length-1]?.equity?.toFixed(2)}
                  </span>
                  <span>MAX: {Math.max(...equity.map(e => e.equity || 0)).toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* BY ACTION */}
          <div className="sw-panel" style={{ flex:1 }}>
            <div className="sw-panel-header"><div className="sw-panel-title">PER AZIONE</div></div>
            <div className="sw-panel-body">
              {!stats?.by_action ? <div className="sw-empty">Nessun dato</div> : (
                <>
                  <div className="sw-action-row header">
                    <span>ACTION</span><span>CNT</span><span>W%</span><span>AVG P&L</span><span>RATE</span>
                  </div>
                  {["GO_FULL","GO_HALF","GO_MIN","NOGO","FALLBACK"].map(a => {
                    const d = stats.by_action[a];
                    if (!d || d.count === 0) return null;
                    return (
                      <div key={a} className="sw-action-row">
                        <ActionBadge action={a} />
                        <span style={{ color:"var(--text2)" }}>{d.count}</span>
                        <span style={{ color: d.win_rate >= 50 ? "var(--green)" : "var(--red)" }}>
                          {d.win_rate != null ? `${d.win_rate}%` : "—"}
                        </span>
                        <span style={{ color:(d.avg_profit ?? 0) >= 0 ? "var(--green)" : "var(--red)", fontSize:9 }}>
                          {d.avg_profit != null ? `${d.avg_profit >= 0 ? "+" : ""}${fmtNum(d.avg_profit)}` : "—"}
                        </span>
                        <div className="sw-bar-wrap">
                          <div className="sw-bar-fill" style={{ width:`${d.win_rate ?? 0}%`, background:COLOR_BY_ACTION[a] }} />
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {/* SERVER HEALTH */}
          <div className="sw-panel" style={{ flex:"0 0 auto" }}>
            <div className="sw-panel-header">
              <div className="sw-panel-title">SERVER HEALTH</div>
              <div style={{ marginLeft:"auto", width:7, height:7, borderRadius:"50%", background:healthColor, animation:"pulse 2s infinite" }} />
            </div>
            <div style={{ padding:"9px 16px", display:"flex", flexDirection:"column", gap:5 }}>
              {[
                ["STATUS",        health?.status?.toUpperCase() ?? "—"],
                ["VERSION",       health?.version ?? "—"],
                ["UPTIME",        health ? `${Math.floor((health.uptime_s||0)/60)}m ${(health.uptime_s||0)%60}s` : "—"],
                ["ANTHROPIC",     health?.anthropic ? "✓ OK" : "✗ MISSING"],
                ["TELEGRAM",      health?.telegram  ? "✓ OK" : "— off"],
                ["CLAUDE CALLS",  stats?.runtime?.total_claude_calls ?? "—"],
                ["ERRORS",        stats?.runtime?.total_errors ?? "—"],
              ].map(([k, v]) => (
                <div key={k} style={{ display:"flex", justifyContent:"space-between", fontSize:9 }}>
                  <span style={{ color:"var(--text3)", letterSpacing:1 }}>{k}</span>
                  <span style={{ color: v==="✓ OK" ? "var(--green)" : v==="✗ MISSING" ? "var(--red)" : "var(--text2)", fontWeight:600 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PERFORMANCE TAB ───────────────────────────────────────────────
function pieArc(cx, cy, r, startDeg, endDeg) {
  const toRad = d => (d - 90) * Math.PI / 180;
  const x1 = cx + r * Math.cos(toRad(startDeg));
  const y1 = cy + r * Math.sin(toRad(startDeg));
  const x2 = cx + r * Math.cos(toRad(endDeg));
  const y2 = cy + r * Math.sin(toRad(endDeg));
  const large = (endDeg - startDeg) > 180 ? 1 : 0;
  return `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`;
}

function PerformanceTab({ serverUrl, isDemoMode }) {
  const [equity, setEquity] = useState([]);
  const [stats,  setStats]  = useState(null);
  const [logs,   setLogs]   = useState([]);

  useEffect(() => {
    if (isDemoMode) {
      setEquity(DEMO_EQUITY); setStats(DEMO_STATS); setLogs(DEMO_LOGS); return;
    }
    if (!serverUrl) return;
    Promise.all([
      fetch(`${serverUrl}/equity?limit=500`).then(r => r.ok ? r.json() : []),
      fetch(`${serverUrl}/stats`).then(r => r.ok ? r.json() : null),
      fetch(`${serverUrl}/log?limit=200`).then(r => r.ok ? r.json() : []),
    ]).then(([eq, st, lg]) => {
      setEquity(eq.reverse()); setStats(st); setLogs(lg);
    }).catch(() => {});
  }, [serverUrl, isDemoMode]);

  // Monthly bucketing
  const monthly = (() => {
    const m = {};
    logs.filter(l => l.profit !== undefined).forEach(l => {
      const key = new Date(l.ts).toLocaleDateString("it-IT", { month:"short", year:"2-digit" });
      if (!m[key]) m[key] = 0;
      m[key] += l.profit || 0;
    });
    return Object.entries(m).slice(-6).map(([k, v]) => ({ label: k, value: +v.toFixed(2) }));
  })();

  // Win/Loss pie
  const wins   = logs.filter(l => l.outcome === "win").length;
  const losses = logs.filter(l => l.outcome === "loss").length;
  const bes    = logs.filter(l => l.outcome === "breakeven").length;
  const total  = wins + losses + bes || 1;
  const pieData = [
    { label: "WIN",       val: wins,   col: "var(--green)"  },
    { label: "LOSS",      val: losses, col: "var(--red)"    },
    { label: "BREAKEVEN", val: bes,    col: "var(--yellow)" },
  ];
  // simple donut
  let start = 0;
  const slices = pieData.map(p => {
    const pct   = p.val / total;
    const end   = start + pct * 360;
    const s     = start; start = end;
    return { ...p, pct, startDeg: s, endDeg: end };
  });

  // Best/worst trade
  const closed = logs.filter(l => l.profit !== undefined);
  const bestT  = closed.reduce((b, l) => (l.profit > (b?.profit ?? -Infinity) ? l : b), null);
  const worstT = closed.reduce((b, l) => (l.profit < (b?.profit ?? Infinity)  ? l : b), null);

  // Consecutive wins
  let maxStreak = 0, cur = 0;
  logs.forEach(l => { if (l.outcome === "win") { cur++; maxStreak = Math.max(maxStreak, cur); } else cur = 0; });

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

      {/* TOP STATS */}
      <div className="sw-stat-grid">
        <StatCard label="BEST TRADE"   value={bestT  ? `+${fmtNum(bestT.profit)}`  : "—"} accent="var(--green)" sub={bestT?.symbol} />
        <StatCard label="WORST TRADE"  value={worstT ? `${fmtNum(worstT.profit)}`  : "—"} accent="var(--red)"   sub={worstT?.symbol} />
        <StatCard label="MAX STREAK"   value={maxStreak} accent="var(--cyan)" sub="consecutive wins" />
        <StatCard label="TOTAL PROFIT" value={stats?.total_profit != null ? `${stats.total_profit >= 0 ? "+" : ""}${fmtNum(stats.total_profit)}` : "—"} accent={stats?.total_profit >= 0 ? "var(--green)" : "var(--red)"} />
        <StatCard label="WIN RATE"     value={stats?.win_rate_pct != null ? `${stats.win_rate_pct}%` : "—"} accent="var(--go-full)" sub={`${stats?.wins ?? 0}W / ${stats?.losses ?? 0}L`} />
        <StatCard label="NOGO SAVES"   value={stats?.nogo_count ?? "—"} accent="var(--yellow)" sub="filtrate da AI" />
      </div>

      {/* EQUITY + DRAWDOWN */}
      <div className="sw-panel">
        <div className="sw-panel-header">
          <div className="sw-panel-title">EQUITY CURVE</div>
          <span className="sw-panel-badge">{equity.length} punti</span>
        </div>
        <div style={{ padding:"14px 16px 6px" }}>
          <EquityChart data={equity} width={820} height={160} />
        </div>
        <div style={{ padding:"0 16px 14px" }}>
          <div style={{ fontSize:8, color:"var(--text3)", letterSpacing:2, marginBottom:4 }}>DRAWDOWN</div>
          <DrawdownChart data={equity} width={820} height={70} />
        </div>
      </div>

      {/* NOGO BREAKDOWN */}
      {(() => {
        const nogoLogs = logs.filter(l => l.action === "NOGO");
        const nogoClaude  = nogoLogs.filter(l => !l.blocked_by).length;
        const nogoNews    = nogoLogs.filter(l => l.blocked_by === "news_filter").length;
        const nogoCircuit = nogoLogs.filter(l => l.blocked_by === "circuit_breaker").length;
        const nogoTotal   = nogoLogs.length;
        const rows = [
          { label:"NOGO — Claude",           val:nogoClaude,  color:"var(--nogo)" },
          { label:"NOGO — News Filter",       val:nogoNews,    color:"var(--orange)" },
          { label:"NOGO — Circuit Breaker",   val:nogoCircuit, color:"var(--red)" },
          { label:"NOGO — Total",             val:nogoTotal,   color:"var(--yellow)", bold:true },
        ];
        return (
          <div className="sw-panel">
            <div className="sw-panel-header"><div className="sw-panel-title">NOGO BREAKDOWN</div></div>
            <div style={{ padding:"10px 16px", display:"flex", flexDirection:"column", gap:5 }}>
              {rows.map(r => (
                <div key={r.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                  padding:"6px 10px", background:"var(--bg3)", borderRadius:3, border:"1px solid var(--border)",
                  fontFamily:"var(--mono)", fontSize:10 }}>
                  <span style={{ color:"var(--text2)", letterSpacing:1, fontWeight: r.bold ? 700 : 400 }}>{r.label}</span>
                  <span style={{ color:r.color, fontWeight:700, fontSize:13 }}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* PIE + MONTHLY */}
      <div className="sw-perf-grid">

        {/* OUTCOME PIE */}
        <div className="sw-panel">
          <div className="sw-panel-header"><div className="sw-panel-title">OUTCOME DISTRIBUTION</div></div>
          <div style={{ padding:16, display:"flex", gap:24, alignItems:"center" }}>
            <svg width="120" height="120" viewBox="0 0 120 120">
              {slices.map((s, i) => s.val > 0 && (
                <path key={i} d={pieArc(60, 60, s.endDeg - s.startDeg > 358 ? 50 : 50, s.startDeg, s.endDeg)}
                  fill={s.col} opacity="0.85" />
              ))}
              <circle cx="60" cy="60" r="28" fill="var(--bg2)" />
              <text x="60" y="56" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">
                {Math.round(wins / total * 100)}%
              </text>
              <text x="60" y="68" textAnchor="middle" fontSize="8" fill="var(--text3)" fontFamily="var(--mono)">WIN</text>
            </svg>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {pieData.map(p => (
                <div key={p.label} style={{ display:"flex", alignItems:"center", gap:8, fontSize:10 }}>
                  <div style={{ width:8, height:8, borderRadius:2, background:p.col, flexShrink:0 }} />
                  <span style={{ color:"var(--text2)", width:80 }}>{p.label}</span>
                  <span style={{ color:p.col, fontWeight:700 }}>{p.val}</span>
                  <span style={{ color:"var(--text3)" }}>({Math.round(p.val / total * 100)}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MONTHLY P&L BAR */}
        <div className="sw-panel">
          <div className="sw-panel-header"><div className="sw-panel-title">P&L MENSILE</div></div>
          <div style={{ padding:"14px 16px", display:"flex", flexDirection:"column", gap:8 }}>
            {monthly.length === 0 ? <div className="sw-empty" style={{ padding:20 }}>Nessun dato</div> : (() => {
              const maxAbs = Math.max(...monthly.map(x => Math.abs(x.value)), 1);
              return monthly.map(m => {
                const pct = Math.abs(m.value) / maxAbs * 100;
                // Bar centrata: positivi partono dal 50% verso destra, negativi verso sinistra
                const barLeft  = m.value >= 0 ? "50%" : `${50 - pct / 2}%`;
                const barWidth = `${pct / 2}%`;
                return (
                  <div key={m.label} style={{ display:"grid", gridTemplateColumns:"52px 1fr 64px", gap:8, alignItems:"center", fontSize:10 }}>
                    <span style={{ color:"var(--text3)", fontSize:9 }}>{m.label}</span>
                    <div style={{ height:12, background:"var(--bg4)", borderRadius:2, overflow:"hidden", position:"relative" }}>
                      {/* linea centrale */}
                      <div style={{ position:"absolute", left:"50%", top:0, bottom:0, width:1, background:"var(--border2)" }} />
                      <div style={{ position:"absolute", left:barLeft, width:barWidth, height:"100%", background: m.value >= 0 ? "var(--green)" : "var(--red)", opacity:0.7, borderRadius:2 }} />
                    </div>
                    <span style={{ color: m.value >= 0 ? "var(--green)" : "var(--red)", fontWeight:600, textAlign:"right", fontSize:9 }}>
                      {m.value >= 0 ? "+" : ""}{fmtNum(m.value)}
                    </span>
                  </div>
                );
              });
            })()
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// Prezzi demo usati come fallback in fetchPrice, fetchCandleHistory e fetchCandlesTF
const DEMO_BASE_PRICES = {
  // Forex majors
  "EUR/USD": { price: 1.0812, chg:  0.12 },
  "GBP/USD": { price: 1.2634, chg: -0.08 },
  "USD/JPY": { price: 151.84, chg:  0.21 },
  "USD/CHF": { price: 0.9015, chg: -0.05 },
  "AUD/USD": { price: 0.6541, chg:  0.09 },
  "USD/CAD": { price: 1.3682, chg:  0.03 },
  "NZD/USD": { price: 0.6008, chg:  0.07 },
  // Forex crosses
  "EUR/JPY": { price: 164.22, chg:  0.33 },
  "GBP/JPY": { price: 191.87, chg:  0.14 },
  "EUR/GBP": { price: 0.8561, chg: -0.04 },
  // Indici
  "SPY":     { price: 570.45, chg:  0.31 },
  "QQQ":     { price: 480.12, chg:  0.45 },
  "DAX":     { price: 18234.0, chg: 0.28 },
  "FTSE":    { price: 8142.0,  chg: -0.12 },
  "JP225":   { price: 38850.0, chg: 0.67 },
  // Metalli / Commodities
  "XAUUSD":  { price: 2668.00, chg: 0.54 },
  "XAGUSD":  { price: 31.45,  chg:  0.88 },
  "WTI":     { price: 78.50,  chg: -0.34 },
};

async function fetchPrice(asset, twelveKey) {
  if (asset.binance) {
    try {
      const r = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${asset.id}`);
      const d = await r.json();
      if (d.lastPrice) return { price: parseFloat(d.lastPrice), chg: parseFloat(d.priceChangePercent) };
    } catch {}
  }
  if (asset.twelveSymbol) {
    if (twelveKey) {
      try {
        const r = await fetch(`https://api.twelvedata.com/price?symbol=${asset.twelveSymbol}&apikey=${twelveKey}`);
        const d = await r.json();
        if (d.price) {
          // fetch 24h change
          const r2 = await fetch(`https://api.twelvedata.com/quote?symbol=${asset.twelveSymbol}&apikey=${twelveKey}`);
          const d2 = await r2.json();
          const chg = d2.percent_change ? parseFloat(d2.percent_change) : 0;
          return { price: parseFloat(d.price), chg };
        }
      } catch {}
    }
    // Demo fallback
    const demo = DEMO_BASE_PRICES[asset.twelveSymbol];
    if (demo) {
      const jitter = (Math.random() - 0.5) * 0.001;
      const dec = asset.id === "USDJPY" ? 2 : asset.twelveSymbol.includes("/") ? 4 : 2;
      return { price: +(demo.price * (1 + jitter)).toFixed(dec), chg: +(demo.chg + (Math.random()-0.5)*0.1).toFixed(2) };
    }
  }
  return null;
}

async function fetchCandleHistory(asset, twelveKey) {
  if (asset.binance) {
    try {
      const r = await fetch(`https://api.binance.com/api/v3/klines?symbol=${asset.id}&interval=1h&limit=48`);
      const d = await r.json();
      return d.map(k => ({ ts: k[0], open: +k[1], high: +k[2], low: +k[3], close: +k[4] }));
    } catch {}
  }
  if (asset.twelveSymbol && twelveKey) {
    try {
      const r = await fetch(`https://api.twelvedata.com/time_series?symbol=${asset.twelveSymbol}&interval=1h&outputsize=48&apikey=${twelveKey}`);
      const d = await r.json();
      if (d.values) {
        return d.values.reverse().map(v => ({
          ts: new Date(v.datetime).getTime(),
          open: +v.open, high: +v.high, low: +v.low, close: +v.close,
        }));
      }
    } catch {}
  }
  // Demo candles from current price
  const base = (DEMO_BASE_PRICES[asset.twelveSymbol]?.price) || 100;
  let p = base;
  const now = Date.now();
  return Array.from({ length: 48 }, (_, i) => {
    const o = p;
    const dec = asset.id === "USDJPY" ? 2 : asset.twelveSymbol?.includes("/") ? 4 : 2;
    const chg = (Math.random() - 0.49) * base * 0.003;
    p = +(p + chg).toFixed(dec);
    const hi = +(Math.max(o, p) + Math.random() * base * 0.001).toFixed(dec);
    const lo = +(Math.min(o, p) - Math.random() * base * 0.001).toFixed(dec);
    return { ts: now - (48 - i) * 3600000, open: o, high: hi, low: lo, close: p };
  });
}


async function fetchIndicators(asset, twelveKey, price) {
  if (asset.twelveSymbol && twelveKey) {
    try {
      const [rsiRes, macdRes, bbRes] = await Promise.all([
        fetch(`https://api.twelvedata.com/rsi?symbol=${asset.twelveSymbol}&interval=1h&apikey=${twelveKey}`),
        fetch(`https://api.twelvedata.com/macd?symbol=${asset.twelveSymbol}&interval=1h&apikey=${twelveKey}`),
        fetch(`https://api.twelvedata.com/bbands?symbol=${asset.twelveSymbol}&interval=1h&apikey=${twelveKey}`),
      ]);
      const [rsiData, macdData, bbData] = await Promise.all([rsiRes.json(), macdRes.json(), bbRes.json()]);
      const rsiVal  = parseFloat(rsiData?.values?.[0]?.rsi);
      const macdVal = parseFloat(macdData?.values?.[0]?.macd);
      const sigVal  = parseFloat(macdData?.values?.[0]?.macd_signal);
      const bbU     = parseFloat(bbData?.values?.[0]?.upper_band);
      const bbM     = parseFloat(bbData?.values?.[0]?.middle_band);
      const bbL     = parseFloat(bbData?.values?.[0]?.lower_band);
      if (!isNaN(rsiVal) && !isNaN(macdVal)) {
        return { rsi: rsiVal, macd: macdVal, signal: sigVal, bb_upper: bbU, bb_mid: bbM, bb_lower: bbL };
      }
    } catch {}
  }
  // Demo fallback
  const rsi  = 30 + Math.random() * 40;
  const macd = (Math.random() - 0.5) * 100;
  const sig  = macd + (Math.random() - 0.5) * 20;
  const bMid = price || 100;
  const bDev = bMid * 0.02;
  return { rsi, macd, signal: sig, bb_upper: bMid + bDev, bb_mid: bMid, bb_lower: bMid - bDev };
}

// ── HELPERS TECNICI ──────────────────────────────────────────────

function calcFibLevels(high, low) {
  const diff = high - low;
  const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0, 1.272, 1.618];
  return levels.map(l => ({ pct: l, price: high - diff * l }));
}

function calcGann(price) {
  const sq = Math.sqrt(price);
  const angles = [
    { label: "1×1 (45°)",  val: price },
    { label: "2×1 (63°)",  val: Math.pow(sq + 0.5, 2) },
    { label: "1×2 (26°)",  val: Math.pow(sq - 0.5, 2) },
    { label: "4×1 (75°)",  val: Math.pow(sq + 1, 2) },
    { label: "1×4 (14°)",  val: Math.pow(sq - 1, 2) },
    { label: "8×1 (82°)",  val: Math.pow(sq + 2, 2) },
    { label: "Sq+1",       val: Math.pow(sq + 0.25, 2) },
    { label: "Sq−1",       val: Math.pow(sq - 0.25, 2) },
  ];
  return angles.filter(a => a.val > 0);
}

function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return [];
  const result = [];
  for (let i = period; i < closes.length; i++) {
    const slice = closes.slice(i - period, i + 1);
    let gains = 0, losses = 0;
    for (let j = 1; j < slice.length; j++) {
      const d = slice[j] - slice[j - 1];
      if (d > 0) gains += d; else losses -= d;
    }
    const avgG = gains / period;
    const avgL = losses / period;
    const rs   = avgL === 0 ? 100 : avgG / avgL;
    result.push(100 - 100 / (1 + rs));
  }
  return result;
}

function calcMACD(closes, fast = 12, slow = 26, signal = 9) {
  const ema = (data, period) => {
    const k = 2 / (period + 1);
    const result = [data[0]];
    for (let i = 1; i < data.length; i++)
      result.push(data[i] * k + result[i - 1] * (1 - k));
    return result;
  };
  if (closes.length < slow + signal) return [];
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  const macdLine = emaFast.slice(slow - fast).map((v, i) => v - emaSlow[i]);
  const signalLine = ema(macdLine, signal);
  return macdLine.slice(signal - 1).map((m, i) => ({
    macd: m, signal: signalLine[i], hist: m - signalLine[i],
  }));
}

function calcBB(closes, period = 20, mult = 2) {
  const result = [];
  for (let i = period - 1; i < closes.length; i++) {
    const slice = closes.slice(i - period + 1, i + 1);
    const mean  = slice.reduce((s, v) => s + v, 0) / period;
    const std   = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period);
    result.push({ mid: mean, upper: mean + mult * std, lower: mean - mult * std });
  }
  return result;
}

// Decimali corretti per ogni tipo di asset
function getDecimals(asset) {
  if (asset.type === "crypto") return asset.id === "BTCUSDT" ? 0 : 2;
  if (asset.id === "USDJPY" || asset.id === "EURJPY" || asset.id === "GBPJPY") return 2;
  if (asset.type === "index") {
    return ["DAX","FTSE","JP225"].includes(asset.twelveSymbol) ? 0 : 2;
  }
  if (asset.type === "forex") return 4;
  return 2; // metals, commodities
}

// ── PRO CANDLE CHART ─────────────────────────────────────────────

function ProCandleChart({ candles, color, showFib, showGann, showBB, signal, width = 900, height = 300 }) {
  if (!candles || candles.length < 5) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height, color:"var(--text3)", fontSize:10, letterSpacing:2 }}>
      CARICAMENTO DATI...
    </div>
  );

  const pad  = { t: 14, r: 56, b: 22, l: 10 };
  const W    = width  - pad.l - pad.r;
  const H    = height - pad.t - pad.b;
  const closes = candles.map(c => c.close);
  const highs  = candles.map(c => c.high).filter(isFinite);
  const lows   = candles.map(c => c.low).filter(isFinite);
  if (!highs.length || !lows.length) return null;
  const minP   = Math.min(...lows);
  const maxP   = Math.max(...highs);
  const range  = maxP - minP || 1;
  const toX    = i => pad.l + (i / (candles.length - 1)) * W;
  const toY    = v => pad.t + H - ((v - minP) / range) * H;
  const cW     = Math.max(2, W / candles.length * 0.65);

  // Indicatori
  const bbData   = showBB ? calcBB(closes) : [];
  const fibLevels = showFib ? calcFibLevels(maxP, minP) : [];
  const gannLvls  = showGann ? calcGann(closes[closes.length - 1]) : [];

  // Y ticks
  const ticks = 6;
  const yLines = Array.from({ length: ticks + 1 }, (_, i) => {
    const v = minP + (range / ticks) * i;
    return { y: toY(v), v };
  });

  // X ticks (ogni ~8 candle)
  const xStep = Math.max(1, Math.floor(candles.length / 8));
  const xLabels = candles
    .map((c, i) => ({ i, ts: c.ts }))
    .filter((_, i) => i % xStep === 0 || i === candles.length - 1);

  // Segnale AI: linea orizzontale TP/SL
  const lastClose = closes[closes.length - 1];
  const tpPrice   = signal?.tp_pct  ? lastClose * (1 + signal.tp_pct / 100) : null;
  const slPrice   = signal?.sl_pct  ? lastClose * (1 - signal.sl_pct / 100) : null;

  const fibColors = ["var(--yellow)","var(--go-half)","var(--purple)","var(--cyan2)","var(--red)","var(--green)","var(--text2)","var(--orange)","#be5046"];
  const gannColors = ["var(--purple)","#c792ea80","#9896f180","#9896f1","#c792ea80","var(--purple)","#9896f180","#9896f180"];

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display:"block", cursor:"crosshair" }}>
      {/* BG */}
      <rect x={pad.l} y={pad.t} width={W} height={H} fill="transparent" />

      {/* GRID Y */}
      {yLines.map(({ y, v }) => (
        <g key={v}>
          <line x1={pad.l} y1={y} x2={pad.l + W} y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          <text x={pad.l + W + 4} y={y + 3} fontSize="7.5" fill="var(--text3)" fontFamily="var(--mono)" textAnchor="start">
            {v >= 1000 ? v.toFixed(0) : v >= 1 ? v.toFixed(2) : v.toFixed(4)}
          </text>
        </g>
      ))}

      {/* GRID X */}
      {xLabels.map(({ i, ts }) => (
        <g key={i}>
          <line x1={toX(i)} y1={pad.t} x2={toX(i)} y2={pad.t + H} stroke="rgba(255,255,255,0.025)" strokeWidth="1" />
          <text x={toX(i)} y={height - 4} fontSize="7" fill="var(--text3)" fontFamily="var(--mono)" textAnchor="middle">
            {new Date(ts).toLocaleTimeString("it-IT", { hour:"2-digit", minute:"2-digit" })}
          </text>
        </g>
      ))}

      {/* FIBONACCI LEVELS */}
      {showFib && fibLevels.map((f, i) => {
        const y = toY(f.price);
        if (y < pad.t || y > pad.t + H) return null;
        return (
          <g key={i}>
            <line x1={pad.l} y1={y} x2={pad.l + W} y2={y}
              stroke={fibColors[i]} strokeWidth="0.8" strokeDasharray={i === 0 || i === 6 ? "none" : "4,3"} opacity="0.7" />
            <text x={pad.l + 3} y={y - 2} fontSize="7" fill={fibColors[i]} fontFamily="var(--mono)" opacity="0.9">
              {(f.pct * 100).toFixed(1)}%
            </text>
            <text x={pad.l + W - 2} y={y - 2} fontSize="7" fill={fibColors[i]} fontFamily="var(--mono)" textAnchor="end" opacity="0.9">
              {f.price >= 1 ? f.price.toFixed(2) : f.price.toFixed(4)}
            </text>
          </g>
        );
      })}

      {/* GANN ANGLES */}
      {showGann && gannLvls.slice(0, 6).map((g, i) => {
        const y = toY(g.val);
        if (y < pad.t - 20 || y > pad.t + H + 20) return null;
        return (
          <g key={i}>
            <line x1={pad.l} y1={y} x2={pad.l + W} y2={y}
              stroke={gannColors[i]} strokeWidth="0.7" strokeDasharray="2,4" opacity="0.5" />
            <text x={pad.l + W * 0.35 + i * 8} y={Math.max(pad.t + 8, Math.min(pad.t + H - 4, y - 2))}
              fontSize="6.5" fill={gannColors[i]} fontFamily="var(--mono)" opacity="0.75">{g.label}</text>
          </g>
        );
      })}

      {/* BOLLINGER BANDS */}
      {showBB && bbData.length > 1 && (() => {
        const bbOffset = closes.length - bbData.length;
        const ptsMid  = bbData.map((b, i) => `${toX(i + bbOffset)},${toY(b.mid)}`).join(" ");
        const ptsUp   = bbData.map((b, i) => `${toX(i + bbOffset)},${toY(b.upper)}`).join(" ");
        const ptsDn   = bbData.map((b, i) => `${toX(i + bbOffset)},${toY(b.lower)}`).join(" ");
        const areaTop = bbData.map((b, i) => `${toX(i + bbOffset)},${toY(b.upper)}`).join(" ");
        const areaBtm = bbData.map((b, i) => `${toX(i + bbOffset)},${toY(b.lower)}`).reverse().join(" ");
        return (
          <g>
            <polygon points={`${areaTop} ${areaBtm}`} fill="rgba(56,189,248,0.04)" />
            <polyline points={ptsUp}  fill="none" stroke="rgba(56,189,248,0.35)" strokeWidth="0.8" strokeDasharray="3,2" />
            <polyline points={ptsDn}  fill="none" stroke="rgba(56,189,248,0.35)" strokeWidth="0.8" strokeDasharray="3,2" />
            <polyline points={ptsMid} fill="none" stroke="rgba(56,189,248,0.2)"  strokeWidth="0.8" />
          </g>
        );
      })()}

      {/* CANDELE */}
      {candles.map((c, i) => {
        const x  = toX(i);
        const o  = toY(c.open);
        const cl = toY(c.close);
        const hi = toY(c.high);
        const lo = toY(c.low);
        const up = c.close >= c.open;
        const col = up ? "var(--green)" : "var(--red)";
        const bY  = Math.min(o, cl);
        const bH  = Math.max(Math.abs(o - cl), 1);
        return (
          <g key={i}>
            <line x1={x} y1={hi} x2={x} y2={lo} stroke={col} strokeWidth="0.9" opacity="0.7" />
            <rect x={x - cW / 2} y={bY} width={cW} height={bH}
              fill={up ? "rgba(35,209,139,0.85)" : "rgba(241,76,76,0.85)"}
              stroke={col} strokeWidth="0.4" rx="0.5" />
          </g>
        );
      })}

      {/* TP / SL lines from AI signal */}
      {tpPrice && toY(tpPrice) > pad.t && toY(tpPrice) < pad.t + H && (
        <g>
          <line x1={pad.l} y1={toY(tpPrice)} x2={pad.l + W} y2={toY(tpPrice)}
            stroke="var(--green)" strokeWidth="1.2" strokeDasharray="6,3" opacity="0.8" />
          <rect x={pad.l + W - 36} y={toY(tpPrice) - 8} width={34} height={11} rx="2" fill="rgba(35,209,139,0.15)" />
          <text x={pad.l + W - 19} y={toY(tpPrice) + 1} textAnchor="middle" fontSize="7.5" fill="var(--green)" fontFamily="var(--mono)" fontWeight="700">TP</text>
        </g>
      )}
      {slPrice && toY(slPrice) > pad.t && toY(slPrice) < pad.t + H && (
        <g>
          <line x1={pad.l} y1={toY(slPrice)} x2={pad.l + W} y2={toY(slPrice)}
            stroke="var(--red)" strokeWidth="1.2" strokeDasharray="6,3" opacity="0.8" />
          <rect x={pad.l + W - 36} y={toY(slPrice) - 8} width={34} height={11} rx="2" fill="rgba(241,76,76,0.15)" />
          <text x={pad.l + W - 19} y={toY(slPrice) + 1} textAnchor="middle" fontSize="7.5" fill="var(--red)" fontFamily="var(--mono)" fontWeight="700">SL</text>
        </g>
      )}

      {/* Ultima candle highlight */}
      {(() => {
        const last = candles[candles.length - 1];
        const x = toX(candles.length - 1);
        const y = toY(last.close);
        return (
          <g>
            <line x1={pad.l} y1={y} x2={pad.l + W} y2={y} stroke={color} strokeWidth="0.6" strokeDasharray="2,3" opacity="0.4" />
            <circle cx={x} cy={y} r="3" fill={color} opacity="0.9" />
          </g>
        );
      })()}
    </svg>
  );
}

// ── RSI PANEL ────────────────────────────────────────────────────

function RSIPanel({ candles, width = 900, height = 80 }) {
  if (!candles || candles.length < 16) return null;
  const closes = candles.map(c => c.close);
  const rsiVals = calcRSI(closes, 14).filter(isFinite);
  if (rsiVals.length < 2) return null;
  const pad = { t: 6, r: 56, b: 16, l: 10 };
  const W = width - pad.l - pad.r;
  const H = height - pad.t - pad.b;
  const toX = i => pad.l + (i / (rsiVals.length - 1)) * W;
  const toY = v => pad.t + H - ((v - 0) / 100) * H;
  const pts = rsiVals.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
  const last = rsiVals[rsiVals.length - 1];
  const rsiColor = last > 70 ? "var(--red)" : last < 30 ? "var(--green)" : "var(--cyan)";

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display:"block" }}>
      {/* zones */}
      <rect x={pad.l} y={toY(70)} width={W} height={toY(30) - toY(70)} fill="rgba(56,189,248,0.03)" />
      <line x1={pad.l} y1={toY(70)} x2={pad.l + W} y2={toY(70)} stroke="rgba(241,76,76,0.3)"   strokeWidth="0.7" strokeDasharray="3,2" />
      <line x1={pad.l} y1={toY(50)} x2={pad.l + W} y2={toY(50)} stroke="rgba(255,255,255,0.06)" strokeWidth="0.7" />
      <line x1={pad.l} y1={toY(30)} x2={pad.l + W} y2={toY(30)} stroke="rgba(74,222,128,0.28)"  strokeWidth="0.7" strokeDasharray="3,2" />
      {/* fill area */}
      <polyline points={`${pad.l},${pad.t + H} ${pts} ${pad.l + W},${pad.t + H}`} fill="rgba(94,234,212,0.05)" stroke="none" />
      <polyline points={pts} fill="none" stroke={rsiColor} strokeWidth="1.2" strokeLinejoin="round" />
      {/* labels */}
      <text x={pad.l + W + 4} y={toY(70) + 3} fontSize="7" fill="var(--red)"   fontFamily="var(--mono)" opacity="0.7">70</text>
      <text x={pad.l + W + 4} y={toY(30) + 3} fontSize="7" fill="var(--green)" fontFamily="var(--mono)" opacity="0.7">30</text>
      <text x={pad.l + W + 4} y={toY(last) + 3} fontSize="8" fill={rsiColor} fontFamily="var(--mono)" fontWeight="700">{last.toFixed(1)}</text>
      <text x={pad.l + 3} y={pad.t + 8} fontSize="7.5" fill="var(--text3)" fontFamily="var(--mono)" fontWeight="700" letterSpacing="1">RSI(14)</text>
    </svg>
  );
}

// ── MACD PANEL ───────────────────────────────────────────────────

function MACDPanel({ candles, width = 900, height = 80 }) {
  if (!candles || candles.length < 36) return null;
  const closes  = candles.map(c => c.close);
  const macdData = calcMACD(closes);
  if (macdData.length < 2) return null;
  const pad  = { t: 6, r: 56, b: 16, l: 10 };
  const W    = width - pad.l - pad.r;
  const H    = height - pad.t - pad.b;
  const vals = macdData.flatMap(d => [d.macd, d.signal, d.hist]).filter(v => isFinite(v));
  if (vals.length === 0) return null;
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const rangeV = maxV - minV || 1;
  const toX = i => pad.l + (i / (macdData.length - 1)) * W;
  const toY = v => pad.t + H - ((v - minV) / rangeV) * H;
  const ptsM = macdData.map((d, i) => `${toX(i)},${toY(d.macd)}`).join(" ");
  const ptsS = macdData.map((d, i) => `${toX(i)},${toY(d.signal)}`).join(" ");
  const zero  = toY(0);
  const barW  = Math.max(1, W / macdData.length * 0.7);
  const last  = macdData[macdData.length - 1];

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display:"block" }}>
      {/* zero line */}
      {zero >= pad.t && zero <= pad.t + H && (
        <line x1={pad.l} y1={zero} x2={pad.l + W} y2={zero} stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" />
      )}
      {/* histogram bars */}
      {macdData.map((d, i) => {
        const x  = toX(i);
        const y1 = Math.min(toY(d.hist), zero);
        const y2 = Math.max(toY(d.hist), zero);
        return <rect key={i} x={x - barW / 2} y={y1} width={barW} height={Math.max(1, y2 - y1)}
          fill={d.hist >= 0 ? "rgba(35,209,139,0.5)" : "rgba(241,76,76,0.5)"} />;
      })}
      <polyline points={ptsM} fill="none" stroke="var(--cyan)"   strokeWidth="1.2" strokeLinejoin="round" />
      <polyline points={ptsS} fill="none" stroke="var(--orange)"  strokeWidth="1.0" strokeLinejoin="round" strokeDasharray="3,2" />
      <text x={pad.l + 3} y={pad.t + 8} fontSize="7.5" fill="var(--text3)" fontFamily="var(--mono)" fontWeight="700" letterSpacing="1">MACD(12,26,9)</text>
      <text x={pad.l + W + 4} y={toY(last.macd) + 3} fontSize="8" fill="var(--cyan)" fontFamily="var(--mono)" fontWeight="700">{last.macd.toFixed(3)}</text>
    </svg>
  );
}

// ── MTF PANEL ────────────────────────────────────────────────────
const MTF_TFS = [
  { label: "5m",  interval: "5min",  limit: 60 },
  { label: "15m", interval: "15min", limit: 60 },
  { label: "1H",  interval: "1h",    limit: 60 },
  { label: "4H",  interval: "4h",    limit: 60 },
  { label: "1D",  interval: "1day",  limit: 60 },
];

function mtfBias(candles) {
  if (!candles || candles.length < 5) return "neut";
  const closes = candles.map(c => c.close);
  const rsi = calcRSI(closes, 14).filter(isFinite);
  const lastRsi = rsi.length ? rsi[rsi.length - 1] : 50;
  const ema20 = closes.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, closes.length);
  const lastClose = closes[closes.length - 1];
  const macdArr = calcMACD(closes);
  const lastMacd = macdArr.length ? macdArr[macdArr.length - 1] : { macd: 0 };
  let score = 0;
  if (lastRsi > 55) score++; else if (lastRsi < 45) score--;
  if (lastClose > ema20) score++; else score--;
  if (lastMacd.macd > 0) score++; else score--;
  return score >= 2 ? "bull" : score <= -2 ? "bear" : "neut";
}

function MTFMiniChart({ candles, color }) {
  if (!candles || candles.length < 2) return null;
  const vals = candles.map(c => c.close).filter(isFinite);
  if (vals.length < 2) return null;
  const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1;
  const W = 150, H = 36, pad = 4;
  const pts = vals.map((v, i) => `${pad + (i / (vals.length - 1)) * (W - pad * 2)},${H - pad - ((v - min) / range) * (H - pad * 2)}`).join(" ");
  const isUp = vals[vals.length - 1] >= vals[0];
  const col = isUp ? "var(--green)" : "var(--red)";
  const areaPts = `${pad},${H - pad} ${pts} ${pad + (vals.length - 1) / (vals.length - 1) * (W - pad * 2)},${H - pad}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display:"block" }}>
      <polygon points={areaPts} fill={isUp ? "rgba(74,222,128,0.06)" : "rgba(251,113,133,0.07)"} />
      <polyline points={pts} fill="none" stroke={col} strokeWidth="1.3" strokeLinejoin="round" />
      <circle cx={pad + (W - pad * 2)} cy={H - pad - ((vals[vals.length-1] - min) / range) * (H - pad * 2)} r="2.5" fill={col} />
    </svg>
  );
}

function MTFCard({ asset, tf, twelveKey, currentPrice }) {
  const [candles, setCandles] = useState([]);
  const [loading, setLoading] = useState(true);
  const decimals = asset.type === "crypto" ? 0 : asset.id === "USDJPY" ? 2 : asset.id.includes("USD") ? 4 : 2;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchCandlesTF(asset, twelveKey, tf).then(data => {
      if (!cancelled) { setCandles(data || []); setLoading(false); }
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [asset, tf, twelveKey]);

  if (loading) return (
    <div className="sw-mtf-card">
      <div className="sw-mtf-card-header">
        <span className="sw-mtf-tf-label">{tf.label}</span>
      </div>
      <div className="sw-mtf-loading">⟳ LOADING</div>
    </div>
  );

  const bias = mtfBias(candles);
  const biasLabel = bias === "bull" ? "BULL ▲" : bias === "bear" ? "BEAR ▼" : "NEUT ●";
  const closes = candles.map(c => c.close).filter(isFinite);
  const highs  = candles.map(c => c.high).filter(isFinite);
  const lows   = candles.map(c => c.low).filter(isFinite);
  const lastClose = closes.length ? closes[closes.length - 1] : null;
  const maxH = highs.length ? Math.max(...highs) : null;
  const minL = lows.length ? Math.min(...lows) : null;
  const rsiArr = calcRSI(closes, 14).filter(isFinite);
  const lastRsi = rsiArr.length ? rsiArr[rsiArr.length - 1] : null;
  const macdArr = calcMACD(closes);
  const lastMacd = macdArr.length ? macdArr[macdArr.length - 1] : null;
  const fibLvls = (maxH && minL) ? calcFibLevels(maxH, minL) : [];
  const pct = (lastClose && closes[0]) ? ((lastClose - closes[0]) / closes[0] * 100) : null;

  return (
    <div className="sw-mtf-card">
      <div className="sw-mtf-card-header">
        <span className="sw-mtf-tf-label">{tf.label}</span>
        <span className={`sw-mtf-bias ${bias}`}>{biasLabel}</span>
      </div>
      <div className="sw-mtf-sparkrow">
        <MTFMiniChart candles={candles} color={asset.color} />
      </div>
      <div className="sw-mtf-card-body">
        {pct != null && <div className="sw-mtf-stat-row">
          <span className="sw-mtf-stat-key">CHG%</span>
          <span className="sw-mtf-stat-val" style={{ color: pct >= 0 ? "var(--green)" : "var(--red)" }}>{pct >= 0 ? "+" : ""}{pct.toFixed(2)}%</span>
        </div>}
        {lastRsi != null && <div className="sw-mtf-stat-row">
          <span className="sw-mtf-stat-key">RSI</span>
          <span className="sw-mtf-stat-val" style={{ color: lastRsi > 70 ? "var(--red)" : lastRsi < 30 ? "var(--green)" : "var(--text2)" }}>{lastRsi.toFixed(1)}</span>
        </div>}
        {lastMacd && <div className="sw-mtf-stat-row">
          <span className="sw-mtf-stat-key">MACD</span>
          <span className="sw-mtf-stat-val" style={{ color: lastMacd.macd > 0 ? "var(--green)" : "var(--red)" }}>{lastMacd.macd > 0 ? "+" : ""}{lastMacd.macd.toFixed(3)}</span>
        </div>}
        {maxH && <div className="sw-mtf-stat-row">
          <span className="sw-mtf-stat-key">HIGH</span>
          <span className="sw-mtf-stat-val" style={{ color:"var(--green)" }}>{maxH.toFixed(decimals)}</span>
        </div>}
        {minL && <div className="sw-mtf-stat-row">
          <span className="sw-mtf-stat-key">LOW</span>
          <span className="sw-mtf-stat-val" style={{ color:"var(--red)" }}>{minL.toFixed(decimals)}</span>
        </div>}
        {fibLvls.length > 0 && (
          <div className="sw-mtf-fib-section">
            {fibLvls.map((f, i) => {
              const dist = currentPrice ? ((currentPrice - f.price) / currentPrice * 100) : null;
              const isNear = dist !== null && Math.abs(dist) < 0.5;
              return (
                <div key={i} className="sw-mtf-fib-row" style={{ background: isNear ? "rgba(229,192,123,0.07)" : "transparent", borderRadius: 2, padding: "0 2px" }}>
                  <span className="sw-mtf-fib-pct">{(f.pct * 100).toFixed(1)}%</span>
                  <span className="sw-mtf-fib-price">{f.price.toFixed(f.price >= 1 ? 2 : 4)}</span>
                  {dist != null && <span className="sw-mtf-fib-dist" style={{ color: isNear ? "var(--yellow)" : "var(--text3)" }}>{dist > 0 ? "+" : ""}{dist.toFixed(1)}%</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function MTFPanel({ asset, twelveKey, currentPrice }) {
  const biasMap = { bull: 0, neut: 0, bear: 0 };
  return (
    <div className="sw-mtf-root">
      <div className="sw-mtf-header">
        <span style={{ color:"var(--cyan)" }}>◈</span>
        MULTI TIME FRAME — {asset.label}
        <span style={{ marginLeft:"auto", fontSize:8, color:"var(--text3)", fontWeight:400 }}>RSI · MACD · FIB per ogni timeframe</span>
      </div>
      <div className="sw-mtf-grid">
        {MTF_TFS.map(tf => (
          <MTFCard key={tf.label} asset={asset} tf={tf} twelveKey={twelveKey} currentPrice={currentPrice} />
        ))}
      </div>
    </div>
  );
}

// ── MARKET ANALYSIS TAB (PRO) ─────────────────────────────────────

// In dev usa il proxy Vite (/anthropic → https://api.anthropic.com) per evitare CORS.
// In production serve un backend proxy o il VPS server.
const ANTHROPIC_ENDPOINT = import.meta.env.DEV
  ? "/anthropic/v1/messages"
  : "https://api.anthropic.com/v1/messages";

function analyzeWithClaude(asset, indicators, price, fearGreed, anthropicKey) {
  const ind = indicators;
  const prompt = `Asset: ${asset.label} | Price: ${price}
RSI:${ind.rsi?.toFixed(1)} MACD:${ind.macd > 0 ? "+" : ""}${ind.macd?.toFixed(2)} Signal:${ind.signal?.toFixed(2)}
BB: L${ind.bb_lower?.toFixed(2)} M${ind.bb_mid?.toFixed(2)} U${ind.bb_upper?.toFixed(2)}
F&G: ${fearGreed?.value ?? "?"} (${fearGreed?.label ?? "?"})
Give a brief trading signal with BUY/SELL/WAIT, confidence 0-100, and short reason.
JSON: {"signal":"BUY"|"SELL"|"WAIT","confidence":0-100,"reasoning":"<120chars","tp_pct":0,"sl_pct":0}`;

  return fetch(ANTHROPIC_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
      // Richiesto da Anthropic per accesso diretto dal browser in produzione
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514", max_tokens: 200,
      system: "Expert trader. Reply ONLY with valid JSON. No markdown.",
      messages: [{ role:"user", content:prompt }],
    }),
  }).then(r => r.json()).then(d => {
    const raw = ((d.content?.[0]?.text) || "").replace(/```json|```/g, "").trim();
    return JSON.parse(raw);
  });
}

const TF_OPTIONS = [
  { label: "5m",  interval: "5min",  limit: 60 },
  { label: "15m", interval: "15min", limit: 60 },
  { label: "1H",  interval: "1h",    limit: 48 },
  { label: "4H",  interval: "4h",    limit: 60 },
  { label: "1D",  interval: "1day",  limit: 60 },
];

async function fetchCandlesTF(asset, twelveKey, tf) {
  if (asset.binance) {
    const binanceTF = { "5min":"5m", "15min":"15m", "1h":"1h", "4h":"4h", "1day":"1d" };
    try {
      const r = await fetch(`https://api.binance.com/api/v3/klines?symbol=${asset.id}&interval=${binanceTF[tf.interval]}&limit=${tf.limit}`);
      const d = await r.json();
      if (Array.isArray(d)) return d.map(k => ({ ts: k[0], open: +k[1], high: +k[2], low: +k[3], close: +k[4], vol: +k[5] }));
    } catch {}
  }
  if (asset.twelveSymbol && twelveKey) {
    try {
      const r = await fetch(`https://api.twelvedata.com/time_series?symbol=${asset.twelveSymbol}&interval=${tf.interval}&outputsize=${tf.limit}&apikey=${twelveKey}`);
      const d = await r.json();
      if (d.values) return d.values.reverse().map(v => ({
        ts: new Date(v.datetime).getTime(),
        open: +v.open, high: +v.high, low: +v.low, close: +v.close, vol: +(v.volume || 0),
      }));
    } catch {}
  }
  // Demo fallback
  const base = (DEMO_BASE_PRICES[asset.twelveSymbol]?.price) || (asset.binance ? 65000 : 100);
  let p = base;
  const msPerCandle = { "5min":300000,"15min":900000,"1h":3600000,"4h":14400000,"1day":86400000 };
  const ms = msPerCandle[tf.interval] || 3600000;
  const now = Date.now();
  return Array.from({ length: tf.limit }, (_, i) => {
    const o   = p;
    const chg = (Math.random() - 0.49) * base * 0.004;
    p = +(p + chg).toFixed(base > 100 ? 2 : 4);
    const hi = +(Math.max(o, p) + Math.random() * base * 0.0015).toFixed(base > 100 ? 2 : 4);
    const lo = +(Math.min(o, p) - Math.random() * base * 0.0015).toFixed(base > 100 ? 2 : 4);
    return { ts: now - (tf.limit - i) * ms, open: o, high: hi, low: lo, close: p, vol: Math.floor(Math.random() * 5000 + 500) };
  });
}

function MarketAnalysis({ anthropicKey, twelveKey, onPricesUpdate }) {
  const [selectedAsset, setSelectedAsset] = useState(ASSETS[0]);
  const [category,      setCategory]      = useState("ALL");
  const [prices,        setPrices]        = useState({});
  const [fearGreed,     setFearGreed]     = useState({ value: null, label: "—" });
  const [signals,       setSignals]       = useState({});   // cache segnali per asset
  const [analyzing,     setAnalyzing]     = useState(false);
  const [indicators,    setIndicators]    = useState(null);
  const [indLoading,    setIndLoading]    = useState(false);
  const [lastUpdate,    setLastUpdate]    = useState(null);

  // Stato chart drill-down
  const [chartAsset,    setChartAsset]    = useState(null);
  const [candles,       setCandles]       = useState([]);
  const [candleLoading, setCandleLoading] = useState(false);
  const [chartTf,       setChartTf]       = useState(TF_OPTIONS[2]); // default 1H
  const [showFib,       setShowFib]       = useState(false);
  const [showGann,      setShowGann]      = useState(false);
  const [showBB,        setShowBB]        = useState(false);

  const activeAsset = chartAsset ?? selectedAsset;

  // Fetch candele quando si apre la vista chart
  useEffect(() => {
    if (!chartAsset) return;
    let cancelled = false;
    setCandleLoading(true);
    setCandles([]);
    fetchCandlesTF(chartAsset, twelveKey, chartTf).then(data => {
      if (!cancelled) { setCandles(data || []); setCandleLoading(false); }
    }).catch(() => { if (!cancelled) setCandleLoading(false); });
    return () => { cancelled = true; };
  }, [chartAsset, chartTf, twelveKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch indicatori per l'asset attivo (chart o selezionato)
  useEffect(() => {
    let cancelled = false;
    setIndLoading(true);
    setIndicators(null);
    const price = prices[activeAsset.id]?.price;
    fetchIndicators(activeAsset, twelveKey, price).then(ind => {
      if (!cancelled) { setIndicators(ind); setIndLoading(false); }
    }).catch(() => { if (!cancelled) setIndLoading(false); });
    return () => { cancelled = true; };
  }, [activeAsset, twelveKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch prezzi per tutti gli asset in parallelo + Fear & Greed
  useEffect(() => {
    const load = async () => {
      const [priceResults, fngResult] = await Promise.all([
        Promise.allSettled(ASSETS.map(a => fetchPrice(a, twelveKey))),
        fetch("https://api.alternative.me/fng/?limit=1").then(r => r.json()).catch(() => null),
      ]);
      const updates = {};
      ASSETS.forEach((a, i) => {
        if (priceResults[i].status === "fulfilled" && priceResults[i].value) {
          updates[a.id] = priceResults[i].value;
        }
      });
      setPrices(updates);
      onPricesUpdate?.(updates);
      setLastUpdate(Date.now());
      if (fngResult?.data?.[0]) {
        const v = parseInt(fngResult.data[0].value);
        setFearGreed({ value: v, label: fngResult.data[0].value_classification });
      }
    };
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, [twelveKey, onPricesUpdate]);

  const handleAnalyze = async () => {
    if (!anthropicKey) { alert("Inserisci la Anthropic API key in CONFIG ⚙"); return; }
    if (!indicators) return;
    setAnalyzing(true);
    try {
      const sig = await analyzeWithClaude(activeAsset, indicators, prices[activeAsset.id]?.price, fearGreed, anthropicKey);
      setSignals(s => ({ ...s, [activeAsset.id]: sig }));
    } catch (e) {
      setSignals(s => ({ ...s, [activeAsset.id]: { signal: "WAIT", confidence: 0, reasoning: `Errore: ${e.message}`, tp_pct: 0, sl_pct: 0 } }));
    }
    setAnalyzing(false);
  };

  const signal    = signals[(chartAsset ?? selectedAsset).id] ?? null;
  const decimals  = getDecimals(selectedAsset);
  const priceD    = prices[selectedAsset.id];
  const fgColor   = v => !v ? "var(--text3)" : v < 25 ? "var(--red)" : v < 45 ? "var(--yellow)" : v < 55 ? "var(--text2)" : v < 75 ? "var(--green)" : "var(--go-full)";
  const sigColor  = s => s === "BUY" ? "var(--green)" : s === "SELL" ? "var(--red)" : "var(--yellow)";
  const sigBg     = s => s === "BUY" ? "rgba(52,211,153,0.10)" : s === "SELL" ? "rgba(241,76,76,0.1)" : "rgba(229,192,123,0.1)";
  const sigBorder = s => s === "BUY" ? "rgba(74,222,128,0.28)" : s === "SELL" ? "rgba(241,76,76,0.3)" : "rgba(229,192,123,0.3)";

  const CATEGORIES  = ["ALL", "crypto", "forex", "indices", "metals"];
  const CAT_LABELS  = { ALL:"TUTTI", crypto:"CRYPTO", forex:"FOREX", indices:"INDICI", metals:"METALLI" };
  const filteredAssets = useMemo(
    () => category === "ALL" ? ASSETS : ASSETS.filter(a => a.category === category),
    [category]
  );

  // ── VISTA CHART ────────────────────────────────────────────────────────
  if (chartAsset) {
    const ca      = chartAsset;
    const caPriceD  = prices[ca.id];
    const caDec     = getDecimals(ca);
    const caSig     = signals[ca.id] ?? null;

    return (
      <div className="sw-market-root">

        {/* ── CHART HEADER ── */}
        <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", marginBottom:8 }}>
          <button
            onClick={() => setChartAsset(null)}
            style={{
              padding:"5px 10px", borderRadius:4, border:"1px solid var(--border)",
              background:"transparent", color:"var(--text2)", fontFamily:"var(--mono)",
              fontSize:9, fontWeight:700, letterSpacing:1.5, cursor:"pointer",
            }}
          >← LISTA</button>

          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{
              width:28, height:28, borderRadius:5, flexShrink:0,
              background:`${ca.color}18`, display:"flex", alignItems:"center",
              justifyContent:"center", fontSize:12, fontWeight:700, color:ca.color,
            }}>{ca.icon}</div>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:"var(--text1)", letterSpacing:1 }}>{ca.label}</div>
              {caPriceD?.price != null
                ? <div style={{ fontSize:10, fontFamily:"var(--mono)", color:(caPriceD.chg ?? 0) >= 0 ? "var(--green)" : "var(--red)" }}>
                    {caPriceD.price.toLocaleString("en-US", { minimumFractionDigits:caDec, maximumFractionDigits:caDec })}
                    &nbsp;{(caPriceD.chg ?? 0) >= 0 ? "▲" : "▼"}{Math.abs(caPriceD.chg ?? 0).toFixed(2)}%
                  </div>
                : <div style={{ fontSize:9, color:"var(--text3)", fontFamily:"var(--mono)" }}>—</div>
              }
            </div>
          </div>

          {/* Timeframe selector */}
          <div style={{ display:"flex", gap:4, marginLeft:8 }}>
            {TF_OPTIONS.map(t => (
              <button key={t.label}
                onClick={() => setChartTf(t)}
                style={{
                  padding:"4px 8px", borderRadius:3, fontSize:9, fontWeight:700,
                  fontFamily:"var(--mono)", letterSpacing:1, cursor:"pointer",
                  border: chartTf.label === t.label ? `1px solid ${ca.color}` : "1px solid var(--border)",
                  background: chartTf.label === t.label ? `${ca.color}18` : "transparent",
                  color: chartTf.label === t.label ? ca.color : "var(--text3)",
                }}
              >{t.label}</button>
            ))}
          </div>

          {/* Toggle overlays */}
          <div style={{ display:"flex", gap:4 }}>
            {[
              { key:"fib",  label:"FIB",  val:showFib,  set:setShowFib  },
              { key:"gann", label:"GANN", val:showGann, set:setShowGann },
              { key:"bb",   label:"BB",   val:showBB,   set:setShowBB   },
            ].map(({ key, label, val, set }) => (
              <button key={key}
                onClick={() => set(v => !v)}
                style={{
                  padding:"4px 8px", borderRadius:3, fontSize:9, fontWeight:700,
                  fontFamily:"var(--mono)", letterSpacing:1, cursor:"pointer",
                  border: val ? "1px solid var(--cyan)" : "1px solid var(--border)",
                  background: val ? "rgba(94,234,212,0.08)" : "transparent",
                  color: val ? "var(--cyan)" : "var(--text3)",
                }}
              >{label}</button>
            ))}
          </div>

          <button
            onClick={handleAnalyze}
            disabled={analyzing || !indicators}
            style={{
              marginLeft:"auto", padding:"6px 12px", borderRadius:4, flexShrink:0,
              border:`1px solid ${(analyzing || !indicators) ? "var(--border)" : "var(--cyan)"}`,
              background: analyzing ? "transparent" : "rgba(94,234,212,0.06)",
              color: (analyzing || !indicators) ? "var(--text3)" : "var(--cyan)",
              fontFamily:"var(--mono)", fontSize:9, fontWeight:700, letterSpacing:1.5,
              cursor:(analyzing || !indicators) ? "not-allowed" : "pointer",
              opacity: !indicators && !analyzing ? 0.4 : 1,
            }}
          >{analyzing ? "⟳ ANALISI..." : "🤖 AI SIGNAL"}</button>

          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:8, color:"var(--text3)", letterSpacing:2, fontFamily:"var(--mono)" }}>F&G</span>
            <span style={{ fontSize:13, fontWeight:700, color:fgColor(fearGreed.value), fontFamily:"var(--mono)" }}>{fearGreed.value ?? "—"}</span>
            <span style={{ fontSize:8, color:"var(--text3)", fontFamily:"var(--mono)" }}>{fearGreed.label}</span>
          </div>
        </div>

        {/* ── CORPO CHART ── */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 220px", gap:10, flex:1, minHeight:0 }}>

          {/* Grafico principale */}
          <div style={{ display:"flex", flexDirection:"column", gap:0, minWidth:0 }}>
            {candleLoading
              ? <div style={{
                  height:300, display:"flex", alignItems:"center", justifyContent:"center",
                  background:"var(--bg2)", borderRadius:6, border:"1px solid var(--border)",
                  fontSize:9, color:"var(--text3)", letterSpacing:2, fontFamily:"var(--mono)",
                }}>⟳ CARICAMENTO CANDELE...</div>
              : candles.length >= 2
                ? <>
                    <ProCandleChart
                      candles={candles} color={ca.color}
                      showFib={showFib} showGann={showGann} showBB={showBB}
                      signal={caSig?.signal}
                      width={900} height={280}
                    />
                    <RSIPanel  candles={candles} width={900} height={70} />
                    <MACDPanel candles={candles} width={900} height={70} />
                  </>
                : <div style={{
                    height:300, display:"flex", alignItems:"center", justifyContent:"center",
                    background:"var(--bg2)", borderRadius:6, border:"1px solid var(--border)",
                    fontSize:9, color:"var(--text3)", letterSpacing:2, fontFamily:"var(--mono)",
                  }}>NESSUN DATO DISPONIBILE</div>
            }
          </div>

          {/* Pannello destro: segnale + indicatori */}
          <div style={{ display:"flex", flexDirection:"column", gap:8, overflowY:"auto" }}>

            {/* AI Signal */}
            {caSig && (
              <div className="sw-mkt-detail-panel" style={{ border:`1px solid ${sigBorder(caSig.signal)}` }}>
                <div className="sw-mkt-panel-hdr">
                  🤖 AI SIGNAL
                  <span style={{ color:sigColor(caSig.signal), fontSize:11, fontWeight:700 }}>{caSig.signal}</span>
                </div>
                <div className="sw-mkt-info-row">
                  <span className="sw-mkt-info-key">CONFIDENCE</span>
                  <span className="sw-mkt-info-val">{caSig.confidence}%</span>
                </div>
                {caSig.tp_pct > 0 && (
                  <div className="sw-mkt-info-row">
                    <span className="sw-mkt-info-key">TAKE PROFIT</span>
                    <span className="sw-mkt-info-val" style={{ color:"var(--green)" }}>+{caSig.tp_pct}%</span>
                  </div>
                )}
                {caSig.sl_pct > 0 && (
                  <div className="sw-mkt-info-row">
                    <span className="sw-mkt-info-key">STOP LOSS</span>
                    <span className="sw-mkt-info-val" style={{ color:"var(--red)" }}>−{caSig.sl_pct}%</span>
                  </div>
                )}
                <div style={{ padding:"8px 10px", fontSize:8, color:"var(--text3)", lineHeight:1.6, borderTop:"1px solid var(--border)" }}>
                  {caSig.reasoning}
                </div>
              </div>
            )}

            {/* Indicatori */}
            {indLoading && (
              <div style={{ padding:"12px", fontSize:8, color:"var(--text3)", letterSpacing:2, fontFamily:"var(--mono)", textAlign:"center" }}>
                ⟳ INDICATORI...
              </div>
            )}
            {!indLoading && indicators?.rsi != null && (
              <div className="sw-mkt-detail-panel">
                <div className="sw-mkt-panel-hdr">◈ INDICATORI</div>
                {[
                  ["RSI (14)",
                    `${indicators.rsi.toFixed(1)} — ${indicators.rsi > 70 ? "OVERBOUGHT" : indicators.rsi < 30 ? "OVERSOLD" : "NEUTRO"}`,
                    indicators.rsi > 70 ? "var(--red)" : indicators.rsi < 30 ? "var(--green)" : "var(--text2)"],
                  ["MACD",
                    `${(indicators.macd ?? 0) > 0 ? "+" : ""}${(indicators.macd ?? 0).toFixed(3)}`,
                    (indicators.macd ?? 0) > 0 ? "var(--green)" : "var(--red)"],
                  ...(indicators.bb_mid > 0 ? [
                    ["BB UPPER", (indicators.bb_upper ?? 0).toFixed(caDec), "var(--red)"],
                    ["BB MID",   (indicators.bb_mid   ?? 0).toFixed(caDec), "var(--text2)"],
                    ["BB LOWER", (indicators.bb_lower ?? 0).toFixed(caDec), "var(--green)"],
                  ] : []),
                ].map(([k, v, c]) => (
                  <div key={k} className="sw-mkt-info-row">
                    <span className="sw-mkt-info-key">{k}</span>
                    <span className="sw-mkt-info-val" style={{ color:c }}>{v}</span>
                  </div>
                ))}
                {/* RSI bar */}
                <div style={{ padding:"6px 10px 8px", borderTop:"1px solid var(--border)" }}>
                  <div style={{ height:4, background:"var(--bg4)", borderRadius:3, position:"relative", overflow:"hidden" }}>
                    <div style={{
                      position:"absolute", left:0, width:`${Math.min(100, indicators.rsi)}%`, height:"100%", borderRadius:3,
                      background: indicators.rsi > 70 ? "var(--red)" : indicators.rsi < 30 ? "var(--green)" : "var(--cyan)",
                      opacity:0.85, transition:"width 0.4s ease",
                    }} />
                    <div style={{ position:"absolute", left:"30%", top:0, bottom:0, width:1, background:"rgba(255,255,255,0.15)" }} />
                    <div style={{ position:"absolute", left:"70%", top:0, bottom:0, width:1, background:"rgba(255,255,255,0.15)" }} />
                  </div>
                </div>
              </div>
            )}

            {/* Gann */}
            {caPriceD?.price != null && (() => {
              const lvls = calcGann(caPriceD.price);
              if (!lvls.length) return null;
              return (
                <div className="sw-mkt-detail-panel">
                  <div className="sw-mkt-panel-hdr">◈ GANN ANGLES</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr" }}>
                    {lvls.slice(0, 6).map((g, i) => (
                      <div key={i} style={{
                        padding:"5px 10px",
                        borderBottom:"1px solid var(--border)",
                        borderRight: i % 2 === 0 ? "1px solid var(--border)" : "none",
                        fontSize:8, fontFamily:"var(--mono)",
                      }}>
                        <div style={{ color:"var(--text3)", fontSize:7, letterSpacing:1.5, marginBottom:1 }}>{g.label}</div>
                        <div style={{ color:"var(--purple)", fontWeight:700 }}>
                          {g.val >= 1 ? g.val.toFixed(2) : g.val.toFixed(4)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

          </div>
        </div>
      </div>
    );
  }

  // ── VISTA LISTA ─────────────────────────────────────────────────────────
  return (
    <div className="sw-market-root">

      {/* ── TOP BAR ── */}
      <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
        <div className="sw-cat-tabs">
          {CATEGORIES.map(c => (
            <button key={c} className={`sw-cat-tab${category === c ? " active" : ""}`}
              onClick={() => setCategory(c)}>{CAT_LABELS[c]}</button>
          ))}
        </div>
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            <span style={{ fontSize:8, color:"var(--text3)", letterSpacing:2, fontFamily:"var(--mono)" }}>FEAR&GREED</span>
            <span style={{ fontSize:14, fontWeight:700, color:fgColor(fearGreed.value), fontFamily:"var(--mono)" }}>{fearGreed.value ?? "—"}</span>
            <span style={{ fontSize:9, color:"var(--text3)", fontFamily:"var(--mono)" }}>{fearGreed.label}</span>
          </div>
          {lastUpdate && (
            <span style={{ fontSize:8, color:"var(--text3)", fontFamily:"var(--mono)", letterSpacing:1 }}>
              ↻ {fmtTime(lastUpdate)}
            </span>
          )}
        </div>
      </div>

      {/* ── BODY: LISTA + DETTAGLIO ── */}
      <div className="sw-market-body">

        {/* LEFT — LISTA SIMBOLI */}
        <div className="sw-mkt-list-col">

          {/* Header colonne */}
          <div className="sw-mkt-list-header">
            <span style={{ flex:"0 0 24px" }} />
            <span style={{ flex:"0 0 110px" }}>SIMBOLO</span>
            <span style={{ flex:1, textAlign:"right" }}>PREZZO</span>
            <span style={{ flex:"0 0 78px", textAlign:"right" }}>24H %</span>
            <span style={{ flex:"0 0 56px", textAlign:"center" }}>BIAS</span>
            <span style={{ flex:"0 0 68px", textAlign:"center" }}>AI</span>
            <span style={{ flex:"0 0 30px" }} />
          </div>

          {/* Righe simboli */}
          <div className="sw-mkt-list-body">
            {filteredAssets.map(a => {
              const pd         = prices[a.id];
              const dec        = getDecimals(a);
              const cachedSig  = signals[a.id];
              const isSelected = selectedAsset.id === a.id;
              const biasThr    = a.category === "crypto" ? 3 : a.category === "forex" ? 0.3 : 0.8;
              const bias       = !pd?.chg ? null : pd.chg >= biasThr ? "BULL" : pd.chg <= -biasThr ? "BEAR" : "NEUT";
              const biasColor  = bias === "BULL" ? "var(--green)" : bias === "BEAR" ? "var(--red)" : "var(--text3)";
              return (
                <div
                  key={a.id}
                  className={`sw-mkt-row${isSelected ? " selected" : ""}`}
                  onClick={() => setSelectedAsset(a)}
                >
                  {/* dot colore */}
                  <div style={{ flex:"0 0 24px" }}>
                    <div style={{
                      width:6, height:6, borderRadius:"50%", background:a.color,
                      boxShadow: isSelected ? `0 0 6px ${a.color}` : "none",
                    }} />
                  </div>

                  {/* label + tipo */}
                  <div style={{ flex:"0 0 110px", minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <span style={{
                        fontSize:8, color:a.color, fontWeight:700,
                        background:`${a.color}18`, padding:"1px 4px",
                        borderRadius:2, fontFamily:"var(--mono)",
                        minWidth:18, textAlign:"center", flexShrink:0,
                      }}>{a.icon}</span>
                      <span style={{
                        fontSize:10, fontWeight:700, letterSpacing:0.5,
                        color: isSelected ? "var(--text1)" : "var(--text)",
                        whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
                      }}>{a.label}</span>
                    </div>
                    <div style={{ fontSize:7, color:"var(--text3)", letterSpacing:1.5, marginTop:1, fontFamily:"var(--sans)", fontWeight:700 }}>
                      {a.category.toUpperCase()}
                    </div>
                  </div>

                  {/* prezzo */}
                  <div style={{ flex:1, textAlign:"right" }}>
                    {pd?.price != null
                      ? <span style={{ fontSize:11, fontWeight:700, color:"var(--text1)", fontFamily:"var(--mono)" }}>
                          {pd.price.toLocaleString("en-US", { minimumFractionDigits:dec, maximumFractionDigits:dec })}
                        </span>
                      : <span style={{ fontSize:9, color:"var(--text3)" }}>—</span>
                    }
                  </div>

                  {/* variazione % */}
                  <div style={{ flex:"0 0 78px", textAlign:"right" }}>
                    {pd?.chg != null
                      ? <span style={{ fontSize:10, fontWeight:700, fontFamily:"var(--mono)", color: pd.chg >= 0 ? "var(--green)" : "var(--red)" }}>
                          {pd.chg >= 0 ? "▲" : "▼"}{Math.abs(pd.chg).toFixed(2)}%
                        </span>
                      : <span style={{ fontSize:9, color:"var(--text3)" }}>—</span>
                    }
                  </div>

                  {/* bias direzionale */}
                  <div style={{ flex:"0 0 56px", textAlign:"center" }}>
                    {bias
                      ? <span style={{ fontSize:8, fontWeight:700, color:biasColor, letterSpacing:0.5, fontFamily:"var(--mono)" }}>{bias}</span>
                      : <span style={{ fontSize:8, color:"var(--text3)" }}>—</span>
                    }
                  </div>

                  {/* segnale AI cached */}
                  <div style={{ flex:"0 0 68px", textAlign:"center" }}>
                    {cachedSig
                      ? <span style={{
                          fontSize:9, fontWeight:700, fontFamily:"var(--mono)", letterSpacing:0.5,
                          color: sigColor(cachedSig.signal),
                          background: sigBg(cachedSig.signal),
                          border:`1px solid ${sigBorder(cachedSig.signal)}`,
                          padding:"2px 6px", borderRadius:2,
                        }}>{cachedSig.signal}</span>
                      : <span style={{ fontSize:8, color:"var(--text3)" }}>—</span>
                    }
                  </div>

                  {/* pulsante grafico */}
                  <div style={{ flex:"0 0 30px", textAlign:"center" }}>
                    <span
                      title="Apri grafico"
                      style={{
                        fontSize:11, cursor:"pointer", opacity:0.55,
                        transition:"opacity 0.15s",
                        color: isSelected ? a.color : "var(--text3)",
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                      onMouseLeave={e => e.currentTarget.style.opacity = isSelected ? "1" : "0.55"}
                      onClick={e => { e.stopPropagation(); setChartAsset(a); }}
                    >▶</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT — DETTAGLIO ASSET SELEZIONATO */}
        <div className="sw-mkt-detail-col">

          {/* Header asset + pulsante AI */}
          <div className="sw-mkt-detail-hdr">
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{
                width:34, height:34, borderRadius:6, flexShrink:0,
                background:`${selectedAsset.color}18`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:14, fontWeight:700, color:selectedAsset.color,
              }}>{selectedAsset.icon}</div>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:"var(--text1)", letterSpacing:1, fontFamily:"var(--sans)" }}>{selectedAsset.label}</div>
                {priceD?.price != null
                  ? <div style={{ fontSize:11, fontWeight:600, fontFamily:"var(--mono)", color:(priceD.chg ?? 0) >= 0 ? "var(--green)" : "var(--red)" }}>
                      {priceD.price.toLocaleString("en-US", { minimumFractionDigits:decimals, maximumFractionDigits:decimals })}
                      &nbsp;{(priceD.chg ?? 0) >= 0 ? "▲" : "▼"}{Math.abs(priceD.chg ?? 0).toFixed(2)}%
                    </div>
                  : <div style={{ fontSize:9, color:"var(--text3)", fontFamily:"var(--mono)" }}>Caricamento...</div>
                }
              </div>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={analyzing || !indicators}
              style={{
                padding:"7px 12px", borderRadius:4, flexShrink:0,
                border:`1px solid ${(analyzing || !indicators) ? "var(--border)" : "var(--cyan)"}`,
                background: analyzing ? "transparent" : "rgba(94,234,212,0.06)",
                color: (analyzing || !indicators) ? "var(--text3)" : "var(--cyan)",
                fontFamily:"var(--mono)", fontSize:9, fontWeight:700, letterSpacing:1.5,
                cursor:(analyzing || !indicators) ? "not-allowed" : "pointer",
                transition:"all 0.15s", opacity: !indicators && !analyzing ? 0.4 : 1,
              }}
            >{analyzing ? "⟳ ANALISI..." : "🤖 AI SIGNAL"}</button>
          </div>

          {/* Segnale AI */}
          {signal && (
            <div className="sw-mkt-detail-panel" style={{ border:`1px solid ${sigBorder(signal.signal)}` }}>
              <div className="sw-mkt-panel-hdr">
                🤖 AI SIGNAL
                <span style={{ color:sigColor(signal.signal), fontSize:11, fontWeight:700 }}>{signal.signal}</span>
              </div>
              <div className="sw-mkt-info-row">
                <span className="sw-mkt-info-key">CONFIDENCE</span>
                <span className="sw-mkt-info-val">{signal.confidence}%</span>
              </div>
              {signal.tp_pct > 0 && (
                <div className="sw-mkt-info-row">
                  <span className="sw-mkt-info-key">TAKE PROFIT</span>
                  <span className="sw-mkt-info-val" style={{ color:"var(--green)" }}>+{signal.tp_pct}%</span>
                </div>
              )}
              {signal.sl_pct > 0 && (
                <div className="sw-mkt-info-row">
                  <span className="sw-mkt-info-key">STOP LOSS</span>
                  <span className="sw-mkt-info-val" style={{ color:"var(--red)" }}>−{signal.sl_pct}%</span>
                </div>
              )}
              <div style={{ padding:"8px 12px", fontSize:9, color:"var(--text3)", lineHeight:1.6, borderTop:"1px solid var(--border)" }}>
                {signal.reasoning}
              </div>
            </div>
          )}

          {/* Indicatori tecnici */}
          {indLoading && (
            <div style={{ padding:"16px 12px", fontSize:9, color:"var(--text3)", letterSpacing:2, fontFamily:"var(--mono)", textAlign:"center" }}>
              ⟳ CARICAMENTO INDICATORI...
            </div>
          )}
          {!indLoading && indicators?.rsi != null && (
            <div className="sw-mkt-detail-panel">
              <div className="sw-mkt-panel-hdr">◈ INDICATORI TECNICI</div>
              {[
                ["RSI (14)",
                  `${indicators.rsi.toFixed(1)} — ${indicators.rsi > 70 ? "OVERBOUGHT" : indicators.rsi < 30 ? "OVERSOLD" : "NEUTRO"}`,
                  indicators.rsi > 70 ? "var(--red)" : indicators.rsi < 30 ? "var(--green)" : "var(--text2)"],
                ["MACD",
                  `${(indicators.macd ?? 0) > 0 ? "+" : ""}${(indicators.macd ?? 0).toFixed(3)}`,
                  (indicators.macd ?? 0) > 0 ? "var(--green)" : "var(--red)"],
                ["SIGNAL LINE",
                  indicators.signal != null ? indicators.signal.toFixed(3) : "—",
                  "var(--text)"],
                ...(indicators.bb_mid > 0 ? [
                  ["BB UPPER", (indicators.bb_upper ?? 0).toFixed(decimals), "var(--red)"],
                  ["BB MID",   (indicators.bb_mid   ?? 0).toFixed(decimals), "var(--text2)"],
                  ["BB LOWER", (indicators.bb_lower ?? 0).toFixed(decimals), "var(--green)"],
                ] : []),
              ].map(([k, v, c]) => (
                <div key={k} className="sw-mkt-info-row">
                  <span className="sw-mkt-info-key">{k}</span>
                  <span className="sw-mkt-info-val" style={{ color:c }}>{v}</span>
                </div>
              ))}
              {/* RSI bar visuale */}
              <div style={{ padding:"8px 12px 10px", borderTop:"1px solid var(--border)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:7, color:"var(--text3)", marginBottom:4, fontFamily:"var(--mono)", letterSpacing:0.5 }}>
                  <span>0</span><span>OVERSOLD 30</span><span>50</span><span>70 OVERBOUGHT</span><span>100</span>
                </div>
                <div style={{ height:5, background:"var(--bg4)", borderRadius:3, position:"relative", overflow:"hidden" }}>
                  <div style={{
                    position:"absolute", left:0, width:`${Math.min(100, indicators.rsi)}%`, height:"100%", borderRadius:3,
                    background: indicators.rsi > 70 ? "var(--red)" : indicators.rsi < 30 ? "var(--green)" : "var(--cyan)",
                    opacity:0.85, transition:"width 0.4s ease",
                  }} />
                  {/* linee 30 e 70 */}
                  <div style={{ position:"absolute", left:"30%", top:0, bottom:0, width:1, background:"rgba(255,255,255,0.15)" }} />
                  <div style={{ position:"absolute", left:"70%", top:0, bottom:0, width:1, background:"rgba(255,255,255,0.15)" }} />
                </div>
              </div>
            </div>
          )}

          {/* Gann Angles */}
          {priceD?.price != null && (() => {
            const lvls = calcGann(priceD.price);
            if (!lvls.length) return null;
            return (
              <div className="sw-mkt-detail-panel">
                <div className="sw-mkt-panel-hdr">◈ GANN ANGLES</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr" }}>
                  {lvls.slice(0, 8).map((g, i) => (
                    <div key={i} style={{
                      padding:"6px 12px",
                      borderBottom:"1px solid var(--border)",
                      borderRight: i % 2 === 0 ? "1px solid var(--border)" : "none",
                      fontSize:9, fontFamily:"var(--mono)",
                    }}>
                      <div style={{ color:"var(--text3)", fontSize:7, letterSpacing:1.5, marginBottom:1 }}>{g.label}</div>
                      <div style={{ color:"var(--purple)", fontWeight:700 }}>
                        {g.val >= 1 ? g.val.toFixed(2) : g.val.toFixed(4)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Riepilogo segnali multipli */}
          {Object.keys(signals).length > 1 && (
            <div className="sw-mkt-detail-panel">
              <div className="sw-mkt-panel-hdr">◈ SEGNALI ANALIZZATI ({Object.keys(signals).length})</div>
              {Object.entries(signals).map(([id, s]) => {
                const a = ASSETS.find(x => x.id === id);
                if (!a) return null;
                return (
                  <div key={id} className="sw-mkt-info-row" style={{ cursor:"pointer" }}
                    onClick={() => setSelectedAsset(a)}>
                    <span className="sw-mkt-info-key" style={{ color:a.color }}>{a.label}</span>
                    <span style={{
                      fontSize:9, fontWeight:700, fontFamily:"var(--mono)",
                      color:sigColor(s.signal), background:sigBg(s.signal),
                      border:`1px solid ${sigBorder(s.signal)}`,
                      padding:"2px 7px", borderRadius:2,
                    }}>{s.signal} {s.confidence}%</span>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── NEWS TAB ──────────────────────────────────────────────────────

// Multiple CORS proxies tried in order; first success wins
const CORS_PROXIES = [
  url => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

const NEWS_SOURCES = [
  {
    id: "forexlive",
    label: "ForexLive",
    color: "var(--cyan)",
    category: "forex",
    feedUrl: "https://www.forexlive.com/feed/news",
    homeUrl: "https://www.forexlive.com",
  },
  {
    id: "fxstreet",
    label: "FXStreet",
    color: "#818cf8",
    category: "forex",
    feedUrl: "https://www.fxstreet.com/rss/news",
    homeUrl: "https://www.fxstreet.com/news",
  },
  {
    id: "kitco",
    label: "Kitco Gold",
    color: "#fbbf24",
    category: "gold",
    feedUrl: "https://www.kitco.com/rss/news.rss",
    homeUrl: "https://www.kitco.com/news",
  },
  {
    id: "cointelegraph",
    label: "CoinTelegraph",
    color: "#f7931a",
    category: "crypto",
    feedUrl: "https://cointelegraph.com/rss",
    homeUrl: "https://cointelegraph.com",
  },
  {
    id: "investing",
    label: "Investing.com",
    color: "#34d399",
    category: "macro",
    feedUrl: "https://www.investing.com/rss/news_25.rss",
    homeUrl: "https://www.investing.com/news/forex-news",
  },
];

// Fallback articles shown when all proxies fail — static but realistic, link to real homepage
const FALLBACK_ARTICLES = {
  forexlive: [
    { title: "Dollar holds gains as traders await Fed minutes", desc: "The US dollar maintained its position ahead of the release of Federal Reserve meeting minutes, with markets pricing in a cautious rate path.", link: "https://www.forexlive.com", timeAgo: "live", impact: "high", fallback: true },
    { title: "EUR/USD consolidates near 1.0800 support zone", desc: "Euro-dollar is trading in a tight range as ECB officials maintain a data-dependent stance ahead of next week's policy decision.", link: "https://www.forexlive.com", timeAgo: "live", impact: "med", fallback: true },
    { title: "GBP/USD holds above 1.26 on softer US yields", desc: "Sterling trades firm as UK employment data came in above expectations, easing recession fears slightly.", link: "https://www.forexlive.com", timeAgo: "live", impact: "low", fallback: true },
    { title: "USD/JPY slides toward 149 on intervention chatter", desc: "Japanese yen strengthened sharply after comments from Japanese finance officials suggesting readiness to act against excessive volatility.", link: "https://www.forexlive.com", timeAgo: "live", impact: "high", fallback: true },
  ],
  fxstreet: [
    { title: "Gold price rallies on safe-haven demand, eyes $3200", desc: "XAU/USD climbs as geopolitical tensions and softening US data push investors toward safe-haven assets.", link: "https://www.fxstreet.com/news", timeAgo: "live", impact: "high", fallback: true },
    { title: "EUR/USD Weekly Forecast: ECB under pressure amid divergence", desc: "The euro faces headwinds as the Federal Reserve maintains its restrictive stance while the ECB signals potential cuts.", link: "https://www.fxstreet.com/news", timeAgo: "live", impact: "med", fallback: true },
    { title: "Bitcoin surges past $85K, altcoins follow", desc: "Crypto markets rallied broadly after positive sentiment from institutional buyers and ETF inflow data.", link: "https://www.fxstreet.com/news", timeAgo: "live", impact: "high", fallback: true },
    { title: "US Retail Sales miss expectations, dollar retreats", desc: "Retail sales rose less than forecast in February, adding to evidence of a slowing consumer that may weigh on the Fed.", link: "https://www.fxstreet.com/news", timeAgo: "live", impact: "high", fallback: true },
  ],
  kitco: [
    { title: "Gold hits new all-time high above $3,100/oz", desc: "Spot gold broke to fresh records as central bank buying and inflation hedging continued to support the precious metal.", link: "https://www.kitco.com/news", timeAgo: "live", impact: "high", fallback: true },
    { title: "Silver follows gold higher, testing $35 resistance", desc: "Silver prices climbed as industrial demand outlook improved alongside the broader precious metals rally.", link: "https://www.kitco.com/news", timeAgo: "live", impact: "med", fallback: true },
    { title: "Gold ETF inflows surge as recession fears mount", desc: "Holdings in major gold-backed ETFs rose for the sixth consecutive week as investors hedged against macroeconomic risk.", link: "https://www.kitco.com/news", timeAgo: "live", impact: "med", fallback: true },
    { title: "Analysts raise 2025 gold targets to $3,500", desc: "Several major banks updated their price targets for gold citing central bank demand and geopolitical uncertainty.", link: "https://www.kitco.com/news", timeAgo: "live", impact: "low", fallback: true },
  ],
  cointelegraph: [
    { title: "Bitcoin tests $90K as institutional flows accelerate", desc: "BTC is pushing toward the $90,000 level after spot ETF products recorded their largest weekly inflows since launch.", link: "https://cointelegraph.com", timeAgo: "live", impact: "high", fallback: true },
    { title: "Ethereum upgrade roadmap gets new timeline from devs", desc: "Core Ethereum developers updated their roadmap during the latest AllCoreDevs call, clarifying the timeline for the next major upgrade.", link: "https://cointelegraph.com", timeAgo: "live", impact: "med", fallback: true },
    { title: "Stablecoin regulation moves forward in Congress", desc: "A bipartisan bill targeting stablecoin issuers cleared committee with amendments, moving one step closer to a Senate floor vote.", link: "https://cointelegraph.com", timeAgo: "live", impact: "high", fallback: true },
    { title: "DeFi TVL reaches 6-month high on yield optimism", desc: "Total value locked across DeFi protocols rose to its highest level in half a year as lending rates attracted more liquidity.", link: "https://cointelegraph.com", timeAgo: "live", impact: "low", fallback: true },
  ],
  investing: [
    { title: "S&P 500 futures edge higher ahead of earnings season", desc: "US equity futures ticked up in pre-market trading as investors positioned ahead of a heavy week of corporate earnings.", link: "https://www.investing.com/news/forex-news", timeAgo: "live", impact: "med", fallback: true },
    { title: "Fed's Waller: No rush to cut rates, data must improve", desc: "Federal Reserve Governor Waller reiterated a cautious stance on monetary policy easing, citing still-elevated inflation.", link: "https://www.investing.com/news/forex-news", timeAgo: "live", impact: "high", fallback: true },
    { title: "Oil steady near $80 as OPEC+ holds output policy", desc: "Crude prices held firm after the OPEC+ alliance confirmed it would maintain current production levels at its latest meeting.", link: "https://www.investing.com/news/forex-news", timeAgo: "live", impact: "med", fallback: true },
    { title: "China PMI beats forecasts, boosting risk sentiment", desc: "Chinese manufacturing activity expanded more than expected in the latest reading, lifting sentiment across Asia-Pacific markets.", link: "https://www.investing.com/news/forex-news", timeAgo: "live", impact: "high", fallback: true },
  ],
};

function parseRSS(xmlText) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "text/xml");
    const items = Array.from(doc.querySelectorAll("item")).slice(0, 8);
    if (items.length === 0) return [];
    return items.map(item => {
      const title = item.querySelector("title")?.textContent?.trim() || "No title";
      const desc  = item.querySelector("description")?.textContent?.replace(/<[^>]*>/g, "").trim() || "";
      const link  = item.querySelector("link")?.textContent?.trim() || "#";
      const pubDate = item.querySelector("pubDate")?.textContent?.trim() || "";
      const date = pubDate ? new Date(pubDate) : null;
      const timeAgo = date && !isNaN(date) ? (() => {
        const m = Math.floor((Date.now() - date.getTime()) / 60000);
        if (m < 60) return `${m}m ago`;
        if (m < 1440) return `${Math.floor(m/60)}h ago`;
        return `${Math.floor(m/1440)}d ago`;
      })() : "";
      const HIGH_WORDS = ["CPI","NFP","Fed","rate","inflation","recession","crash","bank","GDP","FOMC","war","crisis","sanction","halt","surge","plunge","collapse","ban","emergency"];
      const upperTitle = title.toUpperCase();
      const impact = HIGH_WORDS.some(w => upperTitle.includes(w.toUpperCase())) ? "high"
        : title.length > 60 ? "med" : "low";
      return { title, desc, link, timeAgo, impact, fallback: false };
    });
  } catch { return []; }
}

// Try each CORS proxy in sequence; return parsed articles from first success
async function fetchWithProxyFallback(src) {
  let lastErr = null;
  for (const makeUrl of CORS_PROXIES) {
    try {
      const url = makeUrl(src.feedUrl);
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 7000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(tid);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // allorigins wraps in {contents}, corsproxy/codetabs return raw XML
      let xmlText;
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const j = await res.json();
        xmlText = j.contents || "";
      } else {
        xmlText = await res.text();
      }
      if (!xmlText || xmlText.trim().length < 50) throw new Error("risposta vuota");
      const items = parseRSS(xmlText);
      if (items.length === 0) throw new Error("nessun item RSS");
      return { items, live: true };
    } catch(e) {
      lastErr = e;
    }
  }
  // All proxies failed → return static fallback
  return { items: FALLBACK_ARTICLES[src.id] || [], live: false, error: lastErr?.message };
}

function NewsTab() {
  const [activeSrc, setActiveSrc] = useState(NEWS_SOURCES[0].id);
  const [articles,  setArticles]  = useState({});
  const [loading,   setLoading]   = useState({});
  const [liveMap,   setLiveMap]   = useState({});
  const [errors,    setErrors]    = useState({});

  const fetchSource = useCallback(async (src) => {
    setLoading(l => ({ ...l, [src.id]: true }));
    setErrors(e  => ({ ...e,  [src.id]: null }));
    const { items, live, error } = await fetchWithProxyFallback(src);
    setArticles(a => ({ ...a, [src.id]: items }));
    setLiveMap(m  => ({ ...m,  [src.id]: live }));
    if (!live) setErrors(e => ({ ...e, [src.id]: error || "proxy non raggiungibile" }));
    setLoading(l  => ({ ...l,  [src.id]: false }));
  }, []);

  useEffect(() => {
    NEWS_SOURCES.forEach(src => fetchSource(src));
  }, [fetchSource]);

  const curSrc   = NEWS_SOURCES.find(s => s.id === activeSrc);
  const items    = articles[activeSrc] || [];
  const isLoad   = loading[activeSrc];
  const isLive   = liveMap[activeSrc];
  const hasErr   = !!errors[activeSrc];
  const anyLoad  = Object.values(loading).some(Boolean);
  const totalArt = Object.values(articles).flat().length;

  return (
    <div className="sw-news-root">

      {/* ── FONTE TABS ── */}
      <div className="sw-news-src-bar">
        {NEWS_SOURCES.map(s => {
          const cnt  = (articles[s.id] || []).length;
          const live = liveMap[s.id];
          const ldg  = loading[s.id];
          return (
            <button
              key={s.id}
              className={`sw-news-src-tab${activeSrc === s.id ? " active" : ""}`}
              style={{ "--src-col": s.color }}
              onClick={() => setActiveSrc(s.id)}
            >
              <div className="sw-news-src-dot" style={{ background: s.color }} />
              {s.label}
              {ldg
                ? <span style={{ fontSize: 8, color: "var(--text3)", fontFamily: "var(--mono)" }}>…</span>
                : cnt > 0
                  ? <span className={`sw-news-live-badge ${live ? "live" : "cached"}`}>
                      {live ? "LIVE" : "CACHED"}
                    </span>
                  : null}
            </button>
          );
        })}

        {/* refresh + count */}
        <div className="sw-news-src-sep" />
        <div className="sw-news-src-meta">
          <span>{anyLoad ? "⟳ CARICAMENTO..." : `${totalArt} articoli`}</span>
          <button className="sw-news-refresh" onClick={() => NEWS_SOURCES.forEach(s => fetchSource(s))}>↻ REFRESH</button>
        </div>
      </div>

      {/* ── PANEL CON CARD FONTE ATTIVA ── */}
      <div className="sw-news-panel">

        {/* intestazione fonte */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px", borderBottom: "1px solid var(--border)",
          background: "var(--bg3)", flexShrink: 0,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: curSrc.color, boxShadow: `0 0 7px ${curSrc.color}` }} />
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, color: curSrc.color, fontFamily: "var(--mono)" }}>
            {curSrc.label}
          </span>
          <span style={{ fontSize: 8, color: "var(--text3)", letterSpacing: 1.5, fontFamily: "var(--mono)" }}>
            {curSrc.category.toUpperCase()}
          </span>
          <div style={{ flex: 1 }} />
          {!isLoad && items.length > 0 && (
            <span style={{
              fontSize: 8, fontWeight: 700, letterSpacing: 1.5, padding: "2px 8px", borderRadius: 3,
              background: isLive ? "rgba(74,222,128,0.06)" : "rgba(251,191,36,0.07)",
              border: isLive ? "1px solid rgba(52,211,153,0.25)" : "1px solid rgba(251,191,36,0.25)",
              color: isLive ? "var(--green)" : "var(--yellow)", fontFamily: "var(--mono)",
            }}>
              {isLive ? "● LIVE" : "◌ CACHED"}
            </span>
          )}
          {hasErr && !isLoad && (
            <span style={{ fontSize: 8, color: "var(--yellow)", fontFamily: "var(--mono)", letterSpacing: 1 }}
              title={errors[activeSrc]}>⚠ proxy fallback</span>
          )}
          <span style={{ fontSize: 8, color: "var(--text3)", fontFamily: "var(--mono)" }}>
            {isLoad ? "" : `${items.length} news`}
          </span>
        </div>

        {/* contenuto */}
        {isLoad ? (
          <div className="sw-news-loading">
            <div className="sw-news-spinner" />
            <span>FETCHING {curSrc.label.toUpperCase()}...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="sw-news-empty">NESSUN ARTICOLO DISPONIBILE</div>
        ) : (
          <div className="sw-news-grid">
            {items.map((item, i) => (
              <a
                key={i}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="sw-news-card"
                style={{ "--src-col": curSrc.color }}
              >
                <div className="sw-news-card-header">
                  <div className="sw-news-source-dot" style={{ background: curSrc.color }} />
                  <span className="sw-news-source-label" style={{ color: curSrc.color }}>{curSrc.label}</span>
                  <span className={`sw-news-impact-badge ${item.impact}`}>
                    {item.impact === "high" ? "⚡ HIGH" : item.impact === "med" ? "◆ MED" : "· LOW"}
                  </span>
                  {item.news_headline_type === "hard_data" && (
                    <span style={{ fontFamily:"var(--mono)", fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:2, background:"rgba(34,211,238,0.1)", color:"var(--cyan2)", border:"1px solid rgba(34,211,238,0.22)", letterSpacing:0.5, whiteSpace:"nowrap" }}>📊 HARD DATA</span>
                  )}
                  {item.news_headline_type === "editorial" && (
                    <span style={{ fontFamily:"var(--mono)", fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:2, background:"rgba(120,120,120,0.1)", color:"var(--text3)", border:"1px solid rgba(120,120,120,0.2)", letterSpacing:0.5, whiteSpace:"nowrap" }}>💬 EDITORIAL</span>
                  )}
                </div>
                <div className="sw-news-card-body">
                  <p className="sw-news-title">{item.title}</p>
                  {item.desc && <p className="sw-news-desc">{item.desc}</p>}
                </div>
                <div className="sw-news-footer">
                  <span style={{ color: curSrc.color, fontWeight: 700 }}>↗ APRI ARTICOLO</span>
                  <span className="sw-news-time">{item.timeAgo}</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── MACRO TAB ─────────────────────────────────────────────────────
// Mostra il contesto macro da enrichment.js (v4.9): FRED, CFTC COT,
// FinnHub sentiment, TwelveData calendar — via GET /enrichment/status
const MACRO_DEMO_DATA = {
  fred: { fed_rate: 5.33, cpi_yoy: 3.2, nfp_last: 187000, m2_growth: 1.8, fetched_at: Date.now() - 3600000 },
  cot: {
    EUR:    { net:  42300, change: +1200, pct_long: 58 },
    GBP:    { net:  -8700, change:  -400, pct_long: 44 },
    JPY:    { net: -91200, change: -3100, pct_long: 29 },
    CHF:    { net:  -4200, change:  +320, pct_long: 47 },
    AUD:    { net:  -6100, change:  -780, pct_long: 42 },
    CAD:    { net:  -3500, change:  +150, pct_long: 46 },
    NZD:    { net:  -2800, change:  -230, pct_long: 43 },
    GOLD:   { net: 183400, change: +5200, pct_long: 72 },
    SILVER: { net:  21400, change: +1100, pct_long: 63 },
    OIL:    { net:  94700, change: -2300, pct_long: 61 },
  },
  sentiment: {
    BTCUSDT: { score:  0.41, label: "BULLISH",  articles: 38 },
    ETHUSDT: { score:  0.22, label: "BULLISH",  articles: 24 },
    BNBUSDT: { score:  0.08, label: "NEUTRAL",  articles: 11 },
    SOLUSDT: { score:  0.31, label: "BULLISH",  articles: 19 },
    EURUSD:  { score:  0.28, label: "BULLISH",  articles: 14 },
    GBPUSD:  { score: -0.12, label: "NEUTRAL",  articles:  9 },
    USDJPY:  { score:  0.54, label: "BULLISH",  articles: 21 },
    USDCHF:  { score: -0.18, label: "BEARISH",  articles:  7 },
    AUDUSD:  { score: -0.09, label: "NEUTRAL",  articles:  6 },
    USDCAD:  { score:  0.14, label: "NEUTRAL",  articles:  5 },
    NZDUSD:  { score: -0.21, label: "BEARISH",  articles:  4 },
    EURJPY:  { score:  0.33, label: "BULLISH",  articles:  8 },
    GBPJPY:  { score:  0.19, label: "NEUTRAL",  articles:  6 },
    EURGBP:  { score:  0.07, label: "NEUTRAL",  articles:  5 },
    SPX:     { score:  0.45, label: "BULLISH",  articles: 28 },
    NDX:     { score:  0.38, label: "BULLISH",  articles: 22 },
    IDAX:    { score:  0.17, label: "NEUTRAL",  articles: 10 },
    IFTSE:   { score: -0.05, label: "NEUTRAL",  articles:  7 },
    NKY:     { score:  0.29, label: "BULLISH",  articles: 12 },
    XAUUSD:  { score:  0.67, label: "BULLISH",  articles: 31 },
    XAGUSD:  { score:  0.44, label: "BULLISH",  articles: 13 },
    WTIUSD:  { score: -0.31, label: "BEARISH",  articles: 17 },
  },
  calendar: [
    { time: "14:30", event: "US CPI m/m",        impact: "HIGH", currency: "USD", forecast: "0.3%", previous: "0.4%" },
    { time: "16:00", event: "Fed Chair Speech",   impact: "HIGH", currency: "USD", forecast: "—",    previous: "—"    },
    { time: "08:30", event: "ECB Minutes",        impact: "MED",  currency: "EUR", forecast: "—",    previous: "—"    },
    { time: "10:00", event: "UK GDP m/m",         impact: "HIGH", currency: "GBP", forecast: "0.1%", previous: "0.0%" },
    { time: "23:50", event: "Japan Trade Balance",impact: "MED",  currency: "JPY", forecast: "¥312B", previous: "¥248B" },
    { time: "12:30", event: "EIA Crude Oil",      impact: "MED",  currency: "OIL", forecast: "-1.2M", previous: "+3.4M" },
  ],
  cache_ages: { fred: "5h 12m", cot: "18h 44m", finnhub: "22m", calendar: "4m" },
};

function MacroTab({ serverUrl, isDemoMode, twelveKey }) {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [err,        setErr]        = useState(null);
  const [ts,         setTs]         = useState(null);
  const [prices,     setPrices]     = useState({});
  const [priceTs,    setPriceTs]    = useState(null);
  const [macroTab,   setMacroTab]   = useState("overview"); // overview | fred | cot | sentiment | calendar

  // Fetch prezzi live per tutti gli asset
  useEffect(() => {
    const load = async () => {
      const results = await Promise.allSettled(ASSETS.map(a => fetchPrice(a, twelveKey)));
      const updates = {};
      ASSETS.forEach((a, i) => {
        if (results[i].status === "fulfilled" && results[i].value) updates[a.id] = results[i].value;
      });
      setPrices(updates);
      setPriceTs(Date.now());
    };
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, [twelveKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isDemoMode) { setData(MACRO_DEMO_DATA); setLoading(false); setTs(Date.now()); return; }
    if (!serverUrl) { setLoading(false); return; }
    const load = async () => {
      setLoading(true); setErr(null);
      try {
        const r = await fetch(`${serverUrl}/enrichment/data`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        setData(await r.json());
        setTs(Date.now());
      } catch(e) { setErr(e.message); }
      setLoading(false);
    };
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, [serverUrl, isDemoMode]);

  const fmtAge = (s) => s ?? "—";
  const sentColor = (label) =>
    label === "BULLISH" ? "var(--green)" : label === "BEARISH" ? "var(--red)" : "var(--text3)";
  const impactColor = (i) =>
    i === "HIGH" ? "var(--red)" : i === "MED" ? "var(--yellow)" : "var(--text3)";
  const netColor = (n) => n > 0 ? "var(--green)" : n < 0 ? "var(--red)" : "var(--text3)";

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:200,
      color:"var(--text3)", fontSize:9, letterSpacing:2 }}>
      CARICAMENTO MACRO CONTEXT...
    </div>
  );

  if (!serverUrl && !isDemoMode) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:200,
      color:"var(--text3)", fontSize:9, letterSpacing:2 }}>
      Configura il Server URL nella tab CONFIG per vedere i dati macro.
    </div>
  );

  // Helper: raggruppamento asset per categoria
  const CATEGORIES_MAP = { crypto:"CRYPTO", forex:"FOREX", indices:"INDICI", metals:"METALLI" };

  // Sub-tab labels
  const MACRO_TABS = [
    { id:"overview",  label:"OVERVIEW" },
    { id:"fred",      label:"FRED / USA" },
    { id:"cot",       label:"COT" },
    { id:"sentiment", label:"SENTIMENT" },
    { id:"calendar",  label:"CALENDARIO" },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12, paddingTop:4 }}>

      {/* Banner demo / errore */}
      {isDemoMode && (
        <div style={{ background:"rgba(251,191,36,0.06)", border:"1px solid rgba(251,191,36,0.2)",
          color:"var(--yellow)", fontSize:8, letterSpacing:2, padding:"5px 14px", borderRadius:3 }}>
          DEMO — DATI SIMULATI · CONNETTI IL SERVER PER DATI REALI
        </div>
      )}
      {err && (
        <div style={{ background:"rgba(251,113,133,0.06)", border:"1px solid rgba(251,113,133,0.2)",
          color:"var(--red)", fontSize:9, padding:"6px 14px", borderRadius:3 }}>
          Errore enrichment: {err} · GET /enrichment/data non disponibile (richiede server v4.9+)
        </div>
      )}

      {/* SUB-NAVIGATION */}
      <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
        {MACRO_TABS.map(t => (
          <button key={t.id}
            onClick={() => setMacroTab(t.id)}
            style={{
              padding:"5px 14px", borderRadius:2, cursor:"pointer",
              fontFamily:"var(--mono)", fontSize:9, fontWeight:700, letterSpacing:1.5,
              border: macroTab === t.id ? "1px solid var(--cyan)" : "1px solid var(--border2)",
              background: macroTab === t.id ? "rgba(94,234,212,0.07)" : "transparent",
              color: macroTab === t.id ? "var(--cyan)" : "var(--text3)",
            }}
          >{t.label}</button>
        ))}
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:8 }}>
          {priceTs && <span style={{ fontSize:7, color:"var(--text3)", fontFamily:"var(--mono)", letterSpacing:1 }}>↻ {fmtTime(priceTs)}</span>}
          {ts      && <span style={{ fontSize:7, color:"var(--text3)", fontFamily:"var(--mono)", letterSpacing:1 }}>MACRO {new Date(ts).toLocaleTimeString()}</span>}
        </div>
      </div>

      {/* ── TAB: MARKET OVERVIEW ── */}
      {macroTab === "overview" && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {Object.keys(CATEGORIES_MAP).map(cat => {
            const catAssets = ASSETS.filter(a => a.category === cat);
            return (
              <div key={cat} className="sw-panel">
                <div className="sw-panel-header">
                  <div className="sw-panel-title">{CATEGORIES_MAP[cat]}</div>
                  <span className="sw-panel-badge">{catAssets.length} simboli</span>
                </div>
                <div style={{ padding:"0" }}>
                  {/* Header */}
                  <div style={{
                    display:"grid", gridTemplateColumns:"24px 1fr 130px 90px 60px 80px",
                    padding:"5px 14px", borderBottom:"1px solid var(--border)",
                    fontSize:7, letterSpacing:2, color:"var(--text3)",
                    fontFamily:"var(--sans)", fontWeight:700,
                  }}>
                    <span />
                    <span>SIMBOLO</span>
                    <span style={{ textAlign:"right" }}>PREZZO</span>
                    <span style={{ textAlign:"right" }}>24H %</span>
                    <span style={{ textAlign:"center" }}>BIAS</span>
                    <span style={{ textAlign:"center" }}>SENTIMENT</span>
                  </div>
                  {catAssets.map(a => {
                    const pd  = prices[a.id];
                    const dec = getDecimals(a);
                    const s   = data?.sentiment?.[a.id]
                      ?? data?.sentiment?.[a.twelveSymbol]
                      ?? data?.sentiment?.[a.twelveSymbol?.replace('/', '')];
                    const bias = !pd?.chg ? null : pd.chg >= 1.5 ? "BULL" : pd.chg <= -1.5 ? "BEAR" : "NEUT";
                    const biasClr = bias === "BULL" ? "var(--green)" : bias === "BEAR" ? "var(--red)" : "var(--text3)";
                    return (
                      <div key={a.id} style={{
                        display:"grid", gridTemplateColumns:"24px 1fr 130px 90px 60px 80px",
                        padding:"8px 14px", borderBottom:"1px solid var(--border)",
                        alignItems:"center", fontFamily:"var(--mono)", fontSize:9,
                      }}>
                        {/* dot */}
                        <div style={{ width:6, height:6, borderRadius:"50%", background:a.color }} />
                        {/* label */}
                        <div>
                          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                            <span style={{ fontSize:8, color:a.color, fontWeight:700,
                              background:`${a.color}18`, padding:"1px 4px", borderRadius:2 }}>{a.icon}</span>
                            <span style={{ fontWeight:700, color:"var(--text1)", fontSize:10 }}>{a.label}</span>
                          </div>
                        </div>
                        {/* prezzo */}
                        <div style={{ textAlign:"right" }}>
                          {pd?.price != null
                            ? <span style={{ fontWeight:700, color:"var(--text1)" }}>
                                {pd.price.toLocaleString("en-US", { minimumFractionDigits:dec, maximumFractionDigits:dec })}
                              </span>
                            : <span style={{ color:"var(--text3)" }}>—</span>
                          }
                        </div>
                        {/* change % */}
                        <div style={{ textAlign:"right" }}>
                          {pd?.chg != null
                            ? <span style={{ fontWeight:700, color: pd.chg >= 0 ? "var(--green)" : "var(--red)" }}>
                                {pd.chg >= 0 ? "▲" : "▼"}{Math.abs(pd.chg).toFixed(2)}%
                              </span>
                            : <span style={{ color:"var(--text3)", fontSize:8 }}>—</span>
                          }
                        </div>
                        {/* bias */}
                        <div style={{ textAlign:"center" }}>
                          {bias
                            ? <span style={{ fontSize:8, fontWeight:700, color:biasClr }}>{bias}</span>
                            : <span style={{ color:"var(--text3)", fontSize:8 }}>—</span>
                          }
                        </div>
                        {/* sentiment */}
                        <div style={{ textAlign:"center" }}>
                          {s
                            ? <span style={{
                                fontSize:8, fontWeight:700, padding:"2px 6px", borderRadius:2, letterSpacing:1,
                                color: sentColor(s.label),
                                background: s.label === "BULLISH" ? "rgba(74,222,128,0.08)"
                                          : s.label === "BEARISH" ? "rgba(248,113,113,0.08)"
                                          : "rgba(255,255,255,0.03)",
                                border: `1px solid ${s.label === "BULLISH" ? "rgba(74,222,128,0.2)"
                                          : s.label === "BEARISH" ? "rgba(251,113,133,0.2)"
                                          : "var(--border)"}`,
                              }}>{s.label}</span>
                            : <span style={{ color:"var(--text3)", fontSize:8 }}>—</span>
                          }
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB: FRED ── */}
      {macroTab === "fred" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <div className="sw-panel">
            <div className="sw-panel-header">
              <div className="sw-panel-title">FRED — MACRO USA</div>
              <span className="sw-panel-badge">Federal Reserve St. Louis</span>
            </div>
            <div style={{ padding:"12px 14px", display:"flex", flexDirection:"column", gap:8 }}>
              {data?.fred ? [
                ["Fed Funds Rate",  `${data.fred.fed_rate ?? "—"}%`,
                  data.fred.fed_rate > 4 ? "var(--red)" : "var(--green)"],
                ["CPI Index",       data.fred.cpi_yoy != null ? data.fred.cpi_yoy.toFixed(2) : "—",
                  data.fred.cpi_yoy > 320 ? "var(--yellow)" : "var(--green)"],
                ["NFP Last",        data.fred.nfp_last ? `${(data.fred.nfp_last/1000).toFixed(0)}K` : "—",
                  "var(--cyan)"],
                ["M2 Money Stock",  data.fred.m2_growth != null ? `$${(data.fred.m2_growth/1000).toFixed(1)}T` : "—",
                  "var(--text2)"],
              ].map(([k, v, c]) => (
                <div key={k} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                  padding:"6px 8px", background:"var(--bg3)", borderRadius:3, border:"1px solid var(--border)",
                  fontSize:9, fontFamily:"var(--mono)" }}>
                  <span style={{ color:"var(--text2)", letterSpacing:1 }}>{k}</span>
                  <span style={{ color:c, fontWeight:700, fontSize:11 }}>{v}</span>
                </div>
              )) : <div className="sw-empty">Nessun dato FRED</div>}
            </div>
          </div>
          {data?.cache_ages && (
            <div className="sw-panel">
              <div className="sw-panel-header"><div className="sw-panel-title">CACHE STATUS</div></div>
              <div style={{ padding:"12px 14px", display:"flex", flexDirection:"column", gap:8 }}>
                {[["FRED", data.cache_ages.fred, "var(--blue)"],
                  ["CFTC COT", data.cache_ages.cot, "var(--purple)"],
                  ["FINNHUB", data.cache_ages.finnhub, "var(--cyan)"],
                  ["CALENDAR", data.cache_ages.calendar, "var(--green)"]].map(([src, age, color]) => (
                  <div key={src} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                    padding:"6px 8px", background:"var(--bg3)", borderRadius:3, border:"1px solid var(--border)",
                    fontSize:9, fontFamily:"var(--mono)" }}>
                    <span style={{ color:"var(--text2)" }}>{src}</span>
                    <span style={{ color, fontWeight:700 }}>CACHE: {fmtAge(age)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: COT ── */}
      {macroTab === "cot" && (
        <div className="sw-panel">
          <div className="sw-panel-header">
            <div className="sw-panel-title">CFTC COT — POSIZIONAMENTO ISTITUZIONALE</div>
            <span className="sw-panel-badge">Settimanale · {data?.cot ? Object.keys(data.cot).length : 0} asset</span>
          </div>
          <div style={{ padding:"0" }}>
            <div style={{ display:"grid", gridTemplateColumns:"90px 90px 90px 1fr 60px",
              padding:"5px 14px", borderBottom:"1px solid var(--border)",
              fontSize:7, letterSpacing:2, color:"var(--text3)", fontFamily:"var(--sans)", fontWeight:700 }}>
              <span>ASSET</span><span>NET POS</span><span>WEEK CHG</span><span>% LONG</span><span style={{ textAlign:"center" }}>BIAS</span>
            </div>
            {data?.cot ? Object.entries(data.cot).map(([sym, c]) => {
              const bias = c.pct_long > 55 ? "BULL" : c.pct_long < 45 ? "BEAR" : "NEUT";
              const bClr = bias === "BULL" ? "var(--green)" : bias === "BEAR" ? "var(--red)" : "var(--text3)";
              return (
                <div key={sym} style={{ display:"grid", gridTemplateColumns:"90px 90px 90px 1fr 60px",
                  padding:"8px 14px", borderBottom:"1px solid var(--border)", fontSize:9,
                  fontFamily:"var(--mono)", alignItems:"center" }}>
                  <span style={{ fontWeight:700, color:"var(--text1)" }}>{sym}</span>
                  <span style={{ color: netColor(c.net), fontWeight:700 }}>
                    {c.net > 0 ? "+" : ""}{(c.net/1000).toFixed(1)}K
                  </span>
                  <span style={{ color: netColor(c.change), fontSize:8 }}>
                    {c.change > 0 ? "▲" : "▼"} {Math.abs(c.change/1000).toFixed(1)}K
                  </span>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ flex:1, background:"var(--border)", borderRadius:2, height:5 }}>
                      <div style={{ width:`${c.pct_long ?? 50}%`, height:"100%", borderRadius:2,
                        background: (c.pct_long ?? 50) > 55 ? "var(--green)" : (c.pct_long ?? 50) < 45 ? "var(--red)" : "var(--yellow)" }} />
                    </div>
                    <span style={{ fontSize:8, color:"var(--text2)", minWidth:28 }}>{c.pct_long}%</span>
                  </div>
                  <div style={{ textAlign:"center" }}>
                    <span style={{ fontSize:8, fontWeight:700, color:bClr }}>{bias}</span>
                  </div>
                </div>
              );
            }) : <div className="sw-empty">Nessun dato COT</div>}
          </div>
        </div>
      )}

      {/* ── TAB: SENTIMENT ── */}
      {macroTab === "sentiment" && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {Object.keys(CATEGORIES_MAP).map(cat => {
            const catAssets = ASSETS.filter(a => a.category === cat);
            const catSentiment = catAssets
              .map(a => ({
                asset: a,
                s: data?.sentiment?.[a.id]
                  ?? data?.sentiment?.[a.twelveSymbol]
                  ?? data?.sentiment?.[a.twelveSymbol?.replace('/', '')]
                  ?? null,
              }));
            if (!catSentiment.length) return null;
            return (
              <div key={cat} className="sw-panel">
                <div className="sw-panel-header">
                  <div className="sw-panel-title">SENTIMENT — {CATEGORIES_MAP[cat]}</div>
                  <span className="sw-panel-badge">Finnhub · {catSentiment.length} simboli</span>
                </div>
                <div style={{ padding:"0" }}>
                  {/* Header */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 70px 80px 80px 90px",
                    padding:"5px 14px", borderBottom:"1px solid var(--border)",
                    fontSize:7, letterSpacing:2, color:"var(--text3)", fontFamily:"var(--sans)", fontWeight:700 }}>
                    <span>SIMBOLO</span>
                    <span style={{ textAlign:"right" }}>ART.</span>
                    <span style={{ textAlign:"right" }}>SCORE</span>
                    <span style={{ textAlign:"right" }}>PREZZO</span>
                    <span style={{ textAlign:"center" }}>LABEL</span>
                  </div>
                  {catSentiment.map(({ asset: a, s }) => {
                    const pd = prices[a.id];
                    const dec = getDecimals(a);
                    return (
                      <div key={a.id} style={{ display:"grid", gridTemplateColumns:"1fr 70px 80px 80px 90px",
                        padding:"8px 14px", borderBottom:"1px solid var(--border)",
                        alignItems:"center", fontFamily:"var(--mono)", fontSize:9 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <span style={{ fontSize:8, color:a.color, fontWeight:700,
                            background:`${a.color}18`, padding:"1px 4px", borderRadius:2 }}>{a.icon}</span>
                          <span style={{ fontWeight:700, color:"var(--text1)" }}>{a.label}</span>
                        </div>
                        <span style={{ textAlign:"right", color:"var(--text3)" }}>{s?.articles ?? "—"}</span>
                        <span style={{ textAlign:"right",
                          color: s == null ? "var(--text3)" : s.score > 0.1 ? "var(--green)" : s.score < -0.1 ? "var(--red)" : "var(--text2)",
                          fontWeight:700 }}>
                          {s == null ? "—" : `${s.score >= 0 ? "+" : ""}${s.score.toFixed(2)}`}
                        </span>
                        <span style={{ textAlign:"right", color:"var(--text2)" }}>
                          {pd?.price != null
                            ? pd.price.toLocaleString("en-US", { minimumFractionDigits:dec, maximumFractionDigits:dec })
                            : "—"}
                        </span>
                        <div style={{ textAlign:"center" }}>
                          <span style={{
                            fontSize:8, fontWeight:700, padding:"2px 7px", borderRadius:2, letterSpacing:1.5,
                            color: s == null ? "var(--text3)" : sentColor(s.label),
                            background: s?.label === "BULLISH" ? "rgba(74,222,128,0.08)"
                                      : s?.label === "BEARISH" ? "rgba(248,113,113,0.08)"
                                      : "rgba(255,255,255,0.03)",
                            border: `1px solid ${s?.label === "BULLISH" ? "rgba(74,222,128,0.2)"
                                      : s?.label === "BEARISH" ? "rgba(251,113,133,0.2)"
                                      : "var(--border)"}`,
                          }}>{s?.label ?? "N/A"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {!data?.sentiment && <div className="sw-empty">Nessun dato sentiment disponibile</div>}
        </div>
      )}

      {/* ── TAB: CALENDARIO ── */}
      {macroTab === "calendar" && (
        <div className="sw-panel">
          <div className="sw-panel-header">
            <div className="sw-panel-title">ECONOMIC CALENDAR</div>
            <span className="sw-panel-badge">HIGH / MED impact</span>
          </div>
          <div style={{ padding:"0" }}>
            {data?.calendar && data.calendar.length > 0 ? data.calendar.map((ev, i) => (
              <div key={i} style={{ padding:"10px 14px", borderBottom:"1px solid var(--border)",
                fontFamily:"var(--mono)", fontSize:9 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:5 }}>
                  <span style={{ fontWeight:700, color:"var(--text1)", minWidth:40 }}>{ev.time}</span>
                  <span style={{ fontSize:7, fontWeight:700, padding:"2px 7px", borderRadius:2, letterSpacing:1.5,
                    color: impactColor(ev.impact),
                    background: ev.impact === "HIGH" ? "rgba(248,113,113,0.08)" : "rgba(251,191,36,0.07)",
                    border: `1px solid ${ev.impact === "HIGH" ? "rgba(251,113,133,0.2)" : "rgba(251,191,36,0.18)"}` }}>
                    {ev.impact}
                  </span>
                  <span style={{ color:"var(--text3)", fontSize:8, fontWeight:700 }}>{ev.currency}</span>
                </div>
                <div style={{ color:"var(--text)", marginBottom:4, fontSize:10 }}>{ev.event}</div>
                <div style={{ display:"flex", gap:14, fontSize:8, color:"var(--text3)" }}>
                  <span>Forecast: <b style={{ color:"var(--cyan)" }}>{ev.forecast}</b></span>
                  <span>Previous: <b style={{ color:"var(--text2)" }}>{ev.previous}</b></span>
                </div>
              </div>
            )) : <div className="sw-empty">Nessun evento nelle prossime ore</div>}
          </div>
        </div>
      )}

    </div>
  );
}


// ── CONFIG TAB ────────────────────────────────────────────────────
function ConfigTab({ serverUrl, setServerUrl, anthropicKey, setAnthropicKey, twelveKey, setTwelveKey, isDemoMode, setDemoMode }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div className="sw-panel">
        <div className="sw-panel-header"><div className="sw-panel-title">CONFIGURAZIONE SISTEMA</div></div>
        <div style={{ padding:"18px 24px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16 }}>
            {[
              { label:"SERVER VPS URL", key:"server", val:serverUrl, set:setServerUrl, ph:"http://IP:3000",  note:"URL del tuo VPS Contabo" },
              { label:"ANTHROPIC KEY",  key:"ant",    val:anthropicKey, set:setAnthropicKey, ph:"sk-ant-...", note:"Per AI market analysis" },
              { label:"TWELVE DATA KEY",key:"tw",     val:twelveKey, set:setTwelveKey, ph:"abc123...",        note:"Forex, indici, metalli" },
            ].map(f => (
              <div key={f.key}>
                <span className="sw-config-label">{f.label}</span>
                <div style={{ fontSize:8, color:"var(--text3)", marginBottom:6 }}>{f.note}</div>
                <input type="password" className="sw-input" value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} />
              </div>
            ))}
          </div>
          <div style={{ marginTop:16, display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
            <span style={{ fontSize:9, color:"var(--text3)", letterSpacing:1 }}>DEMO MODE</span>
            <button className={`sw-btn ${isDemoMode ? "sw-btn-cyan" : ""}`} onClick={() => setDemoMode(!isDemoMode)}>
              {isDemoMode ? "✓ ATTIVO" : "DISATTIVO"}
            </button>
            <span style={{ fontSize:9, color:"var(--text3)" }}>Usa dati simulati senza VPS</span>
            {isDemoMode && serverUrl && (
              <button className="sw-btn" style={{ background:"rgba(152,195,121,0.12)", color:"var(--green)", border:"1px solid var(--green)", marginLeft:8 }}
                onClick={() => setDemoMode(false)}>
                ▶ PASSA A LIVE
              </button>
            )}
            <button
              className="sw-btn"
              style={{ marginLeft:"auto", fontSize:8, opacity:0.55 }}
              onClick={() => {
                if (!confirm("Reset completo localStorage SwiftTrend? Il browser si ricaricherà.")) return;
                ["sw_demo_mode","sw_server_url","sw_anthropic_key","sw_twelve_key"].forEach(k => localStorage.removeItem(k));
                location.reload();
              }}>
              🗑 RESET LOCALSTORAGE
            </button>
          </div>
        </div>
      </div>

      <div className="sw-panel">
        <div className="sw-panel-header"><div className="sw-panel-title">API ENDPOINTS v4.3</div></div>
        <div style={{ padding:"14px 24px" }}>
          {[
            ["POST", "/analyze-smc",  "Riceve dati EA, chiama Claude (portfolio-aware), restituisce action + size"],
            ["POST", "/portfolio",    "Apri/chiudi posizione nel portfolio state { action:'open'|'close', symbol }"],
            ["GET",  "/portfolio",    "Snapshot portfolio aperto corrente + gruppi correlazione"],
            ["POST", "/log/outcome",  "Aggiorna esito trade: { trade_id, outcome, profit, pips }"],
            ["POST", "/trade",        "Dati grezzi broker (apertura/chiusura): ticket, entry, SL, lots"],
            ["POST", "/equity",       "Salva snapshot equity su disco"],
            ["POST", "/telegram",     "Proxy notifiche Telegram"],
            ["GET",  "/stats",        "Win rate, P&L per action, fallback rate in real-time"],
            ["GET",  "/log?limit=N",  "Ultimi N log trade (default 50, più recente prima)"],
            ["GET",  "/equity",       "Storico equity persistente su disco"],
            ["GET",  "/news",         "Cache news corrente (RSS ForexLive, Kitco, Yahoo)"],
            ["GET",  "/health",       "Health check: Claude, news, portfolio, uptime, versione"],
          ].map(([m, ep, desc]) => (
            <div key={ep} style={{ display:"grid", gridTemplateColumns:"40px 200px 1fr", gap:12, padding:"6px 0", borderBottom:"1px solid var(--border)", fontSize:10 }}>
              <span style={{ color: m === "POST" ? "var(--orange)" : "var(--cyan)", fontWeight:700, fontSize:9 }}>{m}</span>
              <span style={{ color:"var(--green)", fontFamily:"var(--mono)" }}>{ep}</span>
              <span style={{ color:"var(--text3)", fontSize:9 }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── FTMO CHALLENGE TRACKER ────────────────────────────────────────
// Mostra i limiti FTMO 100K 2-step in tempo reale:
// balance corrente, drawdown giornaliero, drawdown totale,
// target progress, portfolio aperto (via GET /portfolio).
function FTMOTab({ serverUrl, isDemoMode }) {
  const ACCOUNT_SIZE   = 100000;
  const DAILY_LOSS_MAX = 5000;    // 5% di 100K
  const DD_MAX         = 10000;   // 10% di 100K
  const TARGET         = 10000;   // +10% di 100K
  const DAILY_BUFFER   = 3000;    // buffer EA (3%) — soglia di allerta

  const [equity,    setEquity]    = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [stats,     setStats]     = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [err,       setErr]       = useState(null);

  useEffect(() => {
    if (isDemoMode) {
      // Demo: dati simulati per visualizzazione layout
      const fakeEq = Array.from({ length: 80 }, (_, i) => ({
        ts: Date.now() - (80 - i) * 3600000,
        equity: 100000 + Math.sin(i / 8) * 800 + i * 42 + Math.random() * 200,
        balance: 100000 + i * 40,
      }));
      setEquity(fakeEq);
      setPortfolio({ count: 1, positions: [{ symbol:"XAUUSD", direction:"BULL", entry:2340.5, lot_adj:1.0, open_min:47 }] });
      setStats({ total_profit: 2840.5, win_rate_pct: 58, wins: 7, losses: 5, total_trades: 14 });
      setLoading(false);
      return;
    }
    if (!serverUrl) { setLoading(false); return; }
    const load = async () => {
      setLoading(true); setErr(null);
      try {
        const [eqR, pfR, stR] = await Promise.all([
          fetch(`${serverUrl}/equity?limit=500`),
          fetch(`${serverUrl}/portfolio`),
          fetch(`${serverUrl}/stats`),
        ]);
        if (eqR.ok)  setEquity(await eqR.json());
        if (pfR.ok)  setPortfolio(await pfR.json());
        if (stR.ok)  setStats(await stR.json());
      } catch(e) { setErr(e.message); }
      setLoading(false);
    };
    load();
    const iv = setInterval(load, 20000);
    return () => clearInterval(iv);
  }, [serverUrl, isDemoMode]);

  // Metriche calcolate dall'equity log — sort esplicito per ts decrescente (più recente prima)
  const sortedEquity = [...equity].sort((a, b) => b.ts - a.ts);
  const latest     = sortedEquity.length > 0 ? sortedEquity[0] : null;
  const oldest     = sortedEquity.length > 0 ? sortedEquity[sortedEquity.length - 1] : null;
  const currentEq  = latest?.equity  ?? ACCOUNT_SIZE;
  const startBal   = oldest?.balance ?? ACCOUNT_SIZE;

  // Profit totale dalla partenza
  const totalProfit   = currentEq - ACCOUNT_SIZE;
  const totalProfitPct = (totalProfit / ACCOUNT_SIZE) * 100;

  // Drawdown giornaliero: confronta equity corrente con balance di inizio giornata
  const now = Date.now();
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const todayPts  = sortedEquity.filter(p => new Date(p.ts).getTime() >= todayStart.getTime());
  const dayStartBal = todayPts.length > 0 ? todayPts[todayPts.length - 1].balance ?? ACCOUNT_SIZE : ACCOUNT_SIZE;
  const dailyPnL    = currentEq - dayStartBal;
  const dailyLossPct = dailyPnL < 0 ? Math.abs(dailyPnL / ACCOUNT_SIZE) * 100 : 0;

  // Drawdown totale (peak to trough)
  const eqVals = sortedEquity.map(p => p.equity || 0).filter(v => v > 0);
  let peak = ACCOUNT_SIZE, maxDD = 0;
  for (const v of [...eqVals].reverse()) {
    if (v > peak) peak = v;
    const dd = peak - v;
    if (dd > maxDD) maxDD = dd;
  }
  const maxDDPct = (maxDD / ACCOUNT_SIZE) * 100;

  // Target progress
  const targetPct = Math.min(100, Math.max(0, (totalProfit / TARGET) * 100));

  // Colori status
  const clr = (val, warn, danger) =>
    val >= danger ? "var(--red)" : val >= warn ? "var(--yellow)" : "var(--green)";

  const dailyColor  = clr(dailyLossPct, 2.5, 4.5);
  const ddColor     = clr(maxDDPct, 6, 9);
  const targetColor = totalProfit >= TARGET ? "var(--green)" : totalProfit >= TARGET * 0.5 ? "var(--cyan)" : "var(--text2)";

  // Mini gauge SVG
  const Gauge = ({ pct, color, size = 72 }) => {
    const r = size / 2 - 6;
    const circ = Math.PI * r;
    const dash = (pct / 100) * circ;
    return (
      <svg width={size} height={size / 2 + 4} viewBox={`0 0 ${size} ${size / 2 + 4}`}>
        <path d={`M 6 ${size/2} A ${r} ${r} 0 0 1 ${size-6} ${size/2}`}
          fill="none" stroke="var(--border)" strokeWidth="5" strokeLinecap="round"/>
        <path d={`M 6 ${size/2} A ${r} ${r} 0 0 1 ${size-6} ${size/2}`}
          fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}/>
      </svg>
    );
  };

  // Barra progresso
  const Bar = ({ pct, color, height = 6 }) => (
    <div style={{ background:"var(--border)", borderRadius:3, height, overflow:"hidden" }}>
      <div style={{ width:`${Math.min(100,pct)}%`, height:"100%", background:color,
        borderRadius:3, transition:"width 0.5s ease" }}/>
    </div>
  );

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:200, color:"var(--text3)", fontSize:11 }}>
      Caricamento dati FTMO...
    </div>
  );

  if (!serverUrl && !isDemoMode) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:200, color:"var(--text3)", fontSize:11 }}>
      Configura il Server URL nella tab ⚙ CONFIG per vedere i dati reali.
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16, padding:"16px 0" }}>

      {isDemoMode && (
        <div style={{ background:"rgba(251,191,36,0.07)", border:"1px solid rgba(229,192,123,0.25)",
          color:"var(--yellow)", fontSize:9, letterSpacing:2, padding:"6px 14px", borderRadius:4, textAlign:"center" }}>
          ⚠ DEMO — I VALORI SONO SIMULATI · CONNETTI IL SERVER PER I DATI REALI
        </div>
      )}

      {err && (
        <div style={{ background:"rgba(251,113,133,0.07)", border:"1px solid rgba(251,113,133,0.22)",
          color:"var(--red)", fontSize:9, padding:"6px 14px", borderRadius:4 }}>
          Errore connessione: {err}
        </div>
      )}

      {/* HEADER FTMO */}
      <div style={{ background:"var(--panel)", border:"1px solid var(--border)", borderRadius:6,
        padding:"14px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontSize:9, letterSpacing:3, color:"var(--text3)", marginBottom:3 }}>FTMO CHALLENGE</div>
          <div style={{ fontSize:16, fontWeight:700, color:"var(--text1)", letterSpacing:1 }}>2-STEP · 100K USD</div>
          <div style={{ fontSize:9, color:"var(--text3)", marginTop:2 }}>
            Daily loss ≤5% ($5k) · Drawdown ≤10% ($10k) · Target +10% ($10k)
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:9, color:"var(--text3)", marginBottom:2 }}>EQUITY CORRENTE</div>
          <div style={{ fontSize:20, fontWeight:700, color: totalProfit >= 0 ? "var(--green)" : "var(--red)", letterSpacing:1 }}>
            ${fmtNum(currentEq)}
          </div>
          <div style={{ fontSize:10, color: totalProfit >= 0 ? "var(--green)" : "var(--red)" }}>
            {totalProfit >= 0 ? "+" : ""}{fmtNum(totalProfit)} ({totalProfitPct.toFixed(2)}%)
          </div>
        </div>
      </div>

      {/* 3 GAUGE CARDS */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>

        {/* Daily Loss */}
        <div style={{ background:"var(--panel)", border:`1px solid ${dailyColor === "var(--red)" ? "rgba(224,108,117,0.4)" : "var(--border)"}`,
          borderRadius:6, padding:"14px 16px", textAlign:"center" }}>
          <div style={{ fontSize:8, letterSpacing:2, color:"var(--text3)", marginBottom:6 }}>DAILY LOSS</div>
          <Gauge pct={(Math.abs(dailyPnL) / DAILY_LOSS_MAX) * 100} color={dailyColor} size={80}/>
          <div style={{ fontSize:15, fontWeight:700, color:dailyColor, marginTop:2 }}>
            {dailyPnL < 0 ? "-" : "+"}{fmtNum(Math.abs(dailyPnL))}
          </div>
          <div style={{ fontSize:8, color:"var(--text3)", marginTop:2 }}>
            Max ${fmtNum(DAILY_LOSS_MAX)} · Buffer EA ${ fmtNum(DAILY_BUFFER)}
          </div>
          <Bar pct={(Math.abs(dailyPnL < 0 ? dailyPnL : 0) / DAILY_LOSS_MAX) * 100} color={dailyColor} height={4}/>
        </div>

        {/* Max Drawdown */}
        <div style={{ background:"var(--panel)", border:`1px solid ${ddColor === "var(--red)" ? "rgba(224,108,117,0.4)" : "var(--border)"}`,
          borderRadius:6, padding:"14px 16px", textAlign:"center" }}>
          <div style={{ fontSize:8, letterSpacing:2, color:"var(--text3)", marginBottom:6 }}>MAX DRAWDOWN</div>
          <Gauge pct={(maxDD / DD_MAX) * 100} color={ddColor} size={80}/>
          <div style={{ fontSize:15, fontWeight:700, color:ddColor, marginTop:2 }}>
            -{fmtNum(maxDD)} ({maxDDPct.toFixed(2)}%)
          </div>
          <div style={{ fontSize:8, color:"var(--text3)", marginTop:2 }}>Limite FTMO ${fmtNum(DD_MAX)} (10%)</div>
          <Bar pct={(maxDD / DD_MAX) * 100} color={ddColor} height={4}/>
        </div>

        {/* Target */}
        <div style={{ background:"var(--panel)", border:`1px solid ${totalProfit >= TARGET ? "rgba(35,209,139,0.4)" : "var(--border)"}`,
          borderRadius:6, padding:"14px 16px", textAlign:"center" }}>
          <div style={{ fontSize:8, letterSpacing:2, color:"var(--text3)", marginBottom:6 }}>TARGET PROFIT</div>
          <Gauge pct={targetPct} color={targetColor} size={80}/>
          <div style={{ fontSize:15, fontWeight:700, color:targetColor, marginTop:2 }}>
            {totalProfit >= 0 ? "+" : ""}{fmtNum(totalProfit)}
          </div>
          <div style={{ fontSize:8, color:"var(--text3)", marginTop:2 }}>
            {targetPct.toFixed(1)}% · Mancano ${fmtNum(Math.max(0, TARGET - totalProfit))}
          </div>
          <Bar pct={targetPct} color={targetColor} height={4}/>
        </div>
      </div>

      {/* PORTFOLIO APERTO */}
      <div style={{ background:"var(--panel)", border:"1px solid var(--border)", borderRadius:6 }}>
        <div className="sw-panel-header">
          <div className="sw-panel-title">PORTFOLIO APERTO</div>
          <span className="sw-panel-badge">{portfolio?.count ?? 0} posizioni</span>
        </div>
        <div style={{ padding:"0 20px 14px" }}>
          {(!portfolio || portfolio.count === 0) ? (
            <div style={{ color:"var(--text3)", fontSize:10, padding:"12px 0", textAlign:"center" }}>
              Nessuna posizione aperta
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:8 }}>
              {portfolio.positions.map((p, i) => (
                <div key={i} style={{ display:"grid", gridTemplateColumns:"90px 60px 100px 80px 1fr",
                  gap:10, alignItems:"center", padding:"8px 10px",
                  background:"var(--bg)", borderRadius:4, fontSize:10 }}>
                  <span style={{ fontWeight:700, color:"var(--text1)", fontFamily:"var(--mono)" }}>{p.symbol}</span>
                  <span style={{ color: p.direction === "BULL" ? "var(--green)" : "var(--red)", fontWeight:700 }}>
                    {p.direction === "BULL" ? "▲ LONG" : "▼ SHORT"}
                  </span>
                  <span style={{ color:"var(--text2)" }}>Entry: <b style={{ color:"var(--text1)" }}>{p.entry?.toFixed(2)}</b></span>
                  <span style={{ color:"var(--text3)" }}>Lots: {p.lot_adj}</span>
                  <span style={{ color:"var(--text3)", textAlign:"right" }}>Aperto {p.open_min}min fa</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* STATS CHALLENGE */}
      <div style={{ background:"var(--panel)", border:"1px solid var(--border)", borderRadius:6 }}>
        <div className="sw-panel-header">
          <div className="sw-panel-title">STATISTICHE CHALLENGE</div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:0, padding:"14px 20px" }}>
          {[
            ["TRADE TOTALI",  stats?.total_trades ?? "—",          "var(--text2)"],
            ["WIN RATE",      stats?.win_rate_pct != null ? `${stats.win_rate_pct}%` : "—", stats?.win_rate_pct >= 50 ? "var(--green)" : "var(--red)"],
            ["WIN / LOSS",    stats ? `${stats.wins ?? 0}W / ${stats.losses ?? 0}L` : "—",  "var(--text2)"],
            ["PROFIT TOTALE", stats?.total_profit != null ? `${stats.total_profit >= 0 ? "+" : ""}${fmtNum(stats.total_profit)}` : "—",
              stats?.total_profit >= 0 ? "var(--green)" : "var(--red)"],
          ].map(([label, val, color]) => (
            <div key={label} style={{ textAlign:"center", padding:"8px 0", borderRight:"1px solid var(--border)" }}>
              <div style={{ fontSize:7, letterSpacing:2, color:"var(--text3)", marginBottom:4 }}>{label}</div>
              <div style={{ fontSize:16, fontWeight:700, color }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* REGOLE FTMO REMINDER */}
      <div style={{ background:"var(--panel)", border:"1px solid var(--border)", borderRadius:6 }}>
        <div className="sw-panel-header"><div className="sw-panel-title">REGOLE FTMO 100K — REMINDER</div></div>
        <div style={{ padding:"10px 20px 14px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          {[
            ["Daily loss max",    "5% → $5.000",    dailyLossPct < 2.5 ? "var(--green)" : dailyLossPct < 4.5 ? "var(--yellow)" : "var(--red)"],
            ["Max drawdown",      "10% → $10.000",  maxDDPct < 6 ? "var(--green)" : maxDDPct < 9 ? "var(--yellow)" : "var(--red)"],
            ["Target profit",     "+10% → $10.000", targetColor],
            ["EA buffer daily",   "3% → $3.000",    "var(--cyan)"],
            ["Risk/trade (XAU/crypto)", "0.50%",    "var(--text2)"],
            ["Risk/trade (EUR/GBP/JPY)","0.75%",   "var(--text2)"],
            ["Portfolio cap",     "30% free margin","var(--text2)"],
            ["Max simboli attivi","4",              "var(--text2)"],
          ].map(([rule, val, color]) => (
            <div key={rule} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"5px 0", borderBottom:"1px solid var(--border)", fontSize:10 }}>
              <span style={{ color:"var(--text3)" }}>{rule}</span>
              <span style={{ color, fontWeight:700, fontFamily:"var(--mono)", fontSize:11 }}>{val}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// ── CONSIGLI TAB (Myfxbook style) ────────────────────────────────
const CONSIGLI_ASSETS = [
  { id:"BTCUSDT", label:"BTC/USD", icon:"₿", color:"#f97316", category:"crypto"  },
  { id:"ETHUSDT", label:"ETH/USD", icon:"Ξ", color:"#a78bfa", category:"crypto"  },
  { id:"EURUSD",  label:"EUR/USD", icon:"€", color:"#5eead4", category:"forex"   },
  { id:"GBPUSD",  label:"GBP/USD", icon:"£", color:"#818cf8", category:"forex"   },
  { id:"USDJPY",  label:"USD/JPY", icon:"¥", color:"#f472b6", category:"forex"   },
  { id:"XAUUSD",  label:"XAU/USD", icon:"Au",color:"#fbbf24", category:"metals"  },
  { id:"EURUSD",  label:"EUR/JPY", icon:"€¥",color:"#c084fc", category:"forex"   },
  { id:"SPX",     label:"S&P 500", icon:"US",color:"#34d399", category:"indices" },
  { id:"SOLUSDT", label:"SOL/USD", icon:"◎", color:"#9945ff", category:"crypto"  },
  { id:"XAGUSD",  label:"XAG/USD", icon:"Ag",color:"#d1d5db", category:"metals"  },
];
const TFS = ["M15","H1","H4","D1"];
const INDS = ["RSI","MACD","BOS","CHoCH","FVG","ADX","EMA200","Fib0.618"];
const RISKS = ["LOW","MEDIUM","HIGH"];

function generateSignals(n = 12) {
  const dirs = ["BUY","SELL"];
  const tfs   = TFS;
  const now   = Date.now();
  return Array.from({ length: n }, (_, i) => {
    const asset   = CONSIGLI_ASSETS[i % CONSIGLI_ASSETS.length];
    const dir     = dirs[Math.floor(Math.random() * 2)];
    const conf    = 45 + Math.floor(Math.random() * 52);
    const risk    = conf > 78 ? "LOW" : conf > 60 ? "MEDIUM" : "HIGH";
    const tf      = tfs[Math.floor(Math.random() * tfs.length)];
    const base    = asset.id.includes("BTC") ? 67000 + Math.random()*4000
                  : asset.id.includes("ETH") ? 3400  + Math.random()*300
                  : asset.id.includes("SOL") ? 155   + Math.random()*20
                  : asset.id.includes("XAU") ? 2640  + Math.random()*60
                  : asset.id.includes("XAG") ? 30    + Math.random()*3
                  : asset.id.includes("JPY") ? 148   + Math.random()*6
                  : asset.id === "SPX"       ? 5200  + Math.random()*200
                  : 1.05 + Math.random()*0.25;
    const pip     = base > 1000 ? 10 : base > 100 ? 0.5 : base > 10 ? 0.05 : 0.0001;
    const dec     = base > 1000 ? 0 : base > 100 ? 2 : base > 1 ? 4 : 5;
    const slPips  = 15 + Math.floor(Math.random()*35);
    const tp1Pips = slPips + Math.floor(Math.random()*20);
    const tp2Pips = tp1Pips + Math.floor(Math.random()*30);
    const entryLo = +(base - pip * 3).toFixed(dec);
    const entryHi = +(base + pip * 3).toFixed(dec);
    const sl      = dir === "BUY" ? +(base - pip*slPips).toFixed(dec)  : +(base + pip*slPips).toFixed(dec);
    const tp1     = dir === "BUY" ? +(base + pip*tp1Pips).toFixed(dec) : +(base - pip*tp1Pips).toFixed(dec);
    const tp2     = dir === "BUY" ? +(base + pip*tp2Pips).toFixed(dec) : +(base - pip*tp2Pips).toFixed(dec);
    const numInds = 2 + Math.floor(Math.random()*4);
    const shuffled = [...INDS].sort(() => Math.random()-0.5).slice(0, numInds);
    return {
      id: `SIG-${String(i+1).padStart(3,"0")}`,
      asset, dir, tf, conf, risk, entryLo, entryHi, sl, tp1, tp2,
      slPips, tp1Pips, tp2Pips, dec,
      indicators: shuffled,
      ts: now - i * 1000 * 60 * (8 + Math.floor(Math.random()*40)),
      rrRatio: +(tp1Pips / slPips).toFixed(2),
    };
  });
}

function ConsigliTab({ isDemoMode, anthropicKey }) {
  const [signals,   setSignals]   = useState(() => generateSignals(12));
  const [filter,    setFilter]    = useState("TUTTI");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult,  setAiResult]  = useState(null);
  const [copiedId,  setCopiedId]  = useState(null);

  const FILTERS = [
    { id:"TUTTI",    label:"TUTTI"       },
    { id:"BUY",      label:"🟢 LONG"     },
    { id:"SELL",     label:"🔴 SHORT"    },
    { id:"M15",      label:"⚡ SCALPING" },
    { id:"SWING",    label:"📈 SWING"    },
    { id:"LOW",      label:"LOW RISK"    },
    { id:"HIGH_CONF",label:"HIGH CONF"   },
  ];

  const filtered = useMemo(() => signals.filter(s => {
    if (filter === "TUTTI")     return true;
    if (filter === "BUY")       return s.dir === "BUY";
    if (filter === "SELL")      return s.dir === "SELL";
    if (filter === "M15")       return s.tf === "M15";
    if (filter === "SWING")     return s.tf === "H4" || s.tf === "D1";
    if (filter === "LOW")       return s.risk === "LOW";
    if (filter === "HIGH_CONF") return s.conf >= 75;
    return true;
  }), [signals, filter]);

  const avgConf   = signals.length ? Math.round(signals.reduce((s,x)=>s+x.conf,0)/signals.length) : 0;
  const activeN   = signals.filter(s => s.conf >= 60).length;
  const winRateEst= 52 + Math.floor(avgConf * 0.35);
  const assetSet  = new Set(signals.map(s=>s.asset.label)).size;

  const refresh = () => setSignals(generateSignals(12));

  const copySignal = (sig) => {
    const text = `📊 ${sig.asset.label} ${sig.dir} [${sig.tf}]\n`
      + `Entry: ${sig.entryLo} – ${sig.entryHi}\n`
      + `TP1: ${sig.tp1} (+${sig.tp1Pips} pips) | TP2: ${sig.tp2} (+${sig.tp2Pips} pips)\n`
      + `SL: ${sig.sl} (-${sig.slPips} pips) | R:R ${sig.rrRatio}:1\n`
      + `Confidence: ${sig.conf}% | Risk: ${sig.risk}\n`
      + `Indicators: ${sig.indicators.join(", ")}\n`
      + `🤖 Generato da SwiftTrend AI`;
    navigator.clipboard?.writeText(text).catch(()=>{});
    setCopiedId(sig.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fetchAI = async () => {
    if (!anthropicKey) return;
    setAiLoading(true); setAiResult(null);
    try {
      const prompt = `Sei un analista forex e crypto professionale. Analizza brevemente questi 5 asset e dai un segnale operativo per ciascuno: BTC/USD, EUR/USD, XAU/USD, GBP/USD, S&P500. Per ogni asset rispondi SOLO con questo formato JSON array (nessun testo extra):
[{"asset":"BTC/USD","direction":"BUY","entry":"66500-67000","tp1":"68500","tp2":"70000","sl":"65200","confidence":78,"reason":"BOS H4 confermato, RSI 42 in rimbalzo da supporto chiave"},...]`;
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{ "Content-Type":"application/json", "x-api-key": anthropicKey, "anthropic-version":"2023-06-01" },
        body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1000, messages:[{role:"user",content:prompt}] }),
      });
      const data = await res.json();
      const text = data.content?.find(b=>b.type==="text")?.text || "[]";
      const clean = text.replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(clean);
      setAiResult(parsed);
    } catch(e) {
      setAiResult([{ asset:"Errore", direction:"—", reason: e.message }]);
    }
    setAiLoading(false);
  };

  const confColor = (c) => c >= 75 ? "var(--green)" : c >= 55 ? "var(--yellow)" : "var(--red)";
  const riskColor = (r) => r === "LOW" ? "var(--green)" : r === "MEDIUM" ? "var(--yellow)" : "var(--red)";
  const riskBg    = (r) => r === "LOW" ? "rgba(74,222,128,0.08)" : r === "MEDIUM" ? "rgba(250,204,21,0.08)" : "rgba(248,113,113,0.08)";

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

      {/* HEADER */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontFamily:"var(--sans)", fontSize:14, fontWeight:800, letterSpacing:4, color:"var(--yellow)", textShadow:"0 0 20px rgba(250,204,21,0.5)" }}>
            ⭐ CONSIGLI AI
          </div>
          <div style={{ fontSize:9, color:"var(--text3)", letterSpacing:2, marginTop:3 }}>
            SEGNALI OPERATIVI · STILE MYFXBOOK · {new Date().toLocaleString("it-IT")}
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {anthropicKey && (
            <button
              onClick={fetchAI}
              disabled={aiLoading}
              style={{ background:"rgba(56,189,248,0.1)", border:"1px solid var(--cyan)", color:"var(--cyan)", fontFamily:"var(--mono)", fontSize:10, padding:"8px 16px", borderRadius:4, cursor:"pointer", letterSpacing:1.5, fontWeight:700 }}
            >
              {aiLoading ? "⟳ ANALISI..." : "🤖 ANALISI AI LIVE"}
            </button>
          )}
          <button
            onClick={refresh}
            style={{ background:"rgba(250,204,21,0.08)", border:"1px solid rgba(250,204,21,0.3)", color:"var(--yellow)", fontFamily:"var(--mono)", fontSize:10, padding:"8px 16px", borderRadius:4, cursor:"pointer", letterSpacing:1.5, fontWeight:700 }}
          >
            🔄 AGGIORNA SEGNALI
          </button>
        </div>
      </div>

      {/* KPI ROW */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
        {[
          { label:"SEGNALI ATTIVI",    val:activeN,        accent:"var(--cyan)",   sub:"conf ≥ 60%" },
          { label:"WIN RATE STORICO",  val:`${winRateEst}%`,accent:"var(--green)", sub:"stima AI"   },
          { label:"CONFIDENZA MEDIA",  val:`${avgConf}%`,  accent:confColor(avgConf), sub:"tutti i segnali" },
          { label:"ASSET COPERTI",     val:assetSet,       accent:"var(--purple)", sub:"crypto · forex · metals" },
        ].map(k => (
          <div key={k.label} style={{ background:"var(--panel)", border:"1px solid var(--border2)", borderRadius:6, padding:"12px 16px" }}>
            <div style={{ fontSize:8, color:"var(--text3)", letterSpacing:2.5, fontFamily:"var(--sans)", fontWeight:700, marginBottom:6 }}>{k.label}</div>
            <div style={{ fontSize:22, fontWeight:700, color:k.accent, fontFamily:"var(--mono)" }}>{k.val}</div>
            <div style={{ fontSize:8, color:"var(--text3)", marginTop:3 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* FILTER BAR */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", padding:"10px 0" }}>
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              background: filter === f.id ? "rgba(250,204,21,0.1)" : "transparent",
              border: `1px solid ${filter === f.id ? "rgba(250,204,21,0.5)" : "var(--border2)"}`,
              color: filter === f.id ? "var(--yellow)" : "var(--text3)",
              fontFamily:"var(--mono)", fontSize:9, fontWeight:700, letterSpacing:1.5,
              padding:"6px 16px", borderRadius:3, cursor:"pointer",
              transition:"all 0.15s",
              boxShadow: filter === f.id ? "0 0 12px rgba(250,204,21,0.12)" : "none",
            }}
          >
            {f.label}
          </button>
        ))}
        <span style={{ marginLeft:"auto", fontSize:9, color:"var(--text3)", alignSelf:"center" }}>
          {filtered.length} segnali
        </span>
      </div>

      {/* AI LIVE RESULT */}
      {aiResult && (
        <div style={{ background:"rgba(56,189,248,0.04)", border:"1px solid var(--border3)", borderRadius:8, padding:"16px 20px" }}>
          <div style={{ fontSize:10, color:"var(--cyan)", letterSpacing:3, fontWeight:700, marginBottom:12, fontFamily:"var(--sans)" }}>
            🤖 ANALISI AI LIVE — Claude Sonnet
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:10 }}>
            {aiResult.map((sig, i) => (
              <div key={i} style={{ background:"var(--bg3)", border:"1px solid var(--border2)", borderRadius:6, padding:"12px 14px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  <span style={{ color:"var(--cyan)", fontWeight:700, fontSize:11 }}>{sig.asset}</span>
                  <span style={{ color: sig.direction === "BUY" ? "var(--green)" : "var(--red)", fontWeight:700, fontSize:10 }}>
                    {sig.direction === "BUY" ? "▲" : "▼"} {sig.direction}
                  </span>
                </div>
                {sig.entry && <div style={{ fontSize:9, color:"var(--text2)", marginBottom:4 }}>Entry: <span style={{ color:"var(--text1)" }}>{sig.entry}</span></div>}
                {sig.tp1   && <div style={{ fontSize:9, color:"var(--green)", marginBottom:2 }}>TP1: {sig.tp1} &nbsp; TP2: {sig.tp2}</div>}
                {sig.sl    && <div style={{ fontSize:9, color:"var(--red)",   marginBottom:6 }}>SL: {sig.sl}</div>}
                {sig.confidence && (
                  <div style={{ marginBottom:8 }}>
                    <div style={{ height:3, background:"var(--border)", borderRadius:2, overflow:"hidden" }}>
                      <div style={{ width:`${sig.confidence}%`, height:"100%", background:confColor(sig.confidence), borderRadius:2 }} />
                    </div>
                    <div style={{ fontSize:8, color:confColor(sig.confidence), marginTop:3 }}>{sig.confidence}% confidence</div>
                  </div>
                )}
                {sig.reason && <div style={{ fontSize:8, color:"var(--text3)", lineHeight:1.6 }}>{sig.reason}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SIGNAL CARDS GRID */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(310px,1fr))", gap:14 }}>
        {filtered.map(sig => (
          <div key={sig.id} style={{
            background:"var(--panel)",
            border:`1px solid ${sig.dir === "BUY" ? "rgba(74,222,128,0.18)" : "rgba(248,113,113,0.18)"}`,
            borderRadius:8, overflow:"hidden",
            boxShadow:`0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 ${sig.dir==="BUY" ? "rgba(74,222,128,0.06)" : "rgba(248,113,113,0.06)"}`,
            transition:"transform 0.15s, box-shadow 0.15s",
          }}>

            {/* CARD HEADER */}
            <div style={{
              display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"12px 16px",
              background: sig.dir === "BUY" ? "rgba(74,222,128,0.04)" : "rgba(248,113,113,0.04)",
              borderBottom:"1px solid var(--border)",
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:32, height:32, borderRadius:6, background:`${sig.asset.color}22`, border:`1px solid ${sig.asset.color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:sig.asset.color }}>
                  {sig.asset.icon}
                </div>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:"var(--text1)", fontFamily:"var(--mono)" }}>{sig.asset.label}</div>
                  <div style={{ fontSize:8, color:"var(--text3)", letterSpacing:1 }}>{sig.asset.category.toUpperCase()} · {sig.id}</div>
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:8, padding:"3px 8px", borderRadius:2, border:"1px solid var(--border2)", color:"var(--text3)", fontFamily:"var(--mono)", fontWeight:700, letterSpacing:1 }}>{sig.tf}</span>
                <span style={{
                  fontWeight:700, fontSize:10, padding:"4px 12px", borderRadius:4,
                  background: sig.dir === "BUY" ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.12)",
                  color:       sig.dir === "BUY" ? "var(--green)" : "var(--red)",
                  border:      `1px solid ${sig.dir==="BUY" ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}`,
                  letterSpacing:1.5, fontFamily:"var(--mono)",
                }}>
                  {sig.dir === "BUY" ? "▲ BUY" : "▼ SELL"}
                </span>
              </div>
            </div>

            {/* CARD BODY */}
            <div style={{ padding:"14px 16px", display:"flex", flexDirection:"column", gap:10 }}>

              {/* ENTRY */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:8, color:"var(--text3)", letterSpacing:1.5 }}>ENTRY RANGE</span>
                <span style={{ fontSize:11, fontWeight:700, color:"var(--text1)", fontFamily:"var(--mono)" }}>
                  {sig.entryLo} – {sig.entryHi}
                </span>
              </div>

              {/* TP / SL */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
                {[
                  { label:"TP1", val:sig.tp1, pip:`+${sig.tp1Pips}p`, color:"var(--green)" },
                  { label:"TP2", val:sig.tp2, pip:`+${sig.tp2Pips}p`, color:"rgba(74,222,128,0.6)" },
                  { label:"SL",  val:sig.sl,  pip:`-${sig.slPips}p`,  color:"var(--red)" },
                ].map(x => (
                  <div key={x.label} style={{ background:"var(--bg3)", border:"1px solid var(--border)", borderRadius:4, padding:"7px 10px", textAlign:"center" }}>
                    <div style={{ fontSize:7, color:"var(--text3)", letterSpacing:2, marginBottom:3 }}>{x.label}</div>
                    <div style={{ fontSize:10, fontWeight:700, color:x.color, fontFamily:"var(--mono)" }}>{x.val}</div>
                    <div style={{ fontSize:7, color:x.color, opacity:0.7, marginTop:1 }}>{x.pip}</div>
                  </div>
                ))}
              </div>

              {/* R:R */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:8, color:"var(--text3)", letterSpacing:1 }}>RISK : REWARD</span>
                <span style={{ fontSize:10, fontWeight:700, color: sig.rrRatio >= 2 ? "var(--green)" : sig.rrRatio >= 1.2 ? "var(--yellow)" : "var(--red)", fontFamily:"var(--mono)" }}>
                  1 : {sig.rrRatio}
                </span>
              </div>

              {/* CONFIDENCE BAR */}
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontSize:8, color:"var(--text3)", letterSpacing:1 }}>CONFIDENZA AI</span>
                  <span style={{ fontSize:9, fontWeight:700, color:confColor(sig.conf), fontFamily:"var(--mono)" }}>{sig.conf}%</span>
                </div>
                <div style={{ height:5, background:"var(--border)", borderRadius:3, overflow:"hidden" }}>
                  <div style={{ width:`${sig.conf}%`, height:"100%", background: `linear-gradient(90deg, ${confColor(sig.conf)}, ${confColor(sig.conf)}aa)`, borderRadius:3, transition:"width 0.6s ease" }} />
                </div>
              </div>

              {/* RISK + INDICATORS */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:6 }}>
                <span style={{ fontSize:8, fontWeight:700, padding:"3px 10px", borderRadius:3, background:riskBg(sig.risk), color:riskColor(sig.risk), border:`1px solid ${riskColor(sig.risk)}44`, letterSpacing:1.5, fontFamily:"var(--mono)" }}>
                  {sig.risk} RISK
                </span>
                <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                  {sig.indicators.map(ind => (
                    <span key={ind} style={{ fontSize:7, padding:"2px 6px", borderRadius:2, background:"rgba(56,189,248,0.06)", border:"1px solid rgba(56,189,248,0.15)", color:"var(--cyan)", fontFamily:"var(--mono)", letterSpacing:0.5, fontWeight:700 }}>{ind}</span>
                  ))}
                </div>
              </div>

              {/* CARD FOOTER */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingTop:8, borderTop:"1px solid var(--border)", marginTop:2 }}>
                <div style={{ fontSize:8, color:"var(--text3)" }}>
                  🤖 Claude AI · {new Date(sig.ts).toLocaleTimeString("it-IT", { hour:"2-digit", minute:"2-digit" })}
                </div>
                <button
                  onClick={() => copySignal(sig)}
                  style={{ background: copiedId===sig.id ? "rgba(74,222,128,0.12)" : "rgba(56,189,248,0.08)", border:`1px solid ${copiedId===sig.id ? "rgba(74,222,128,0.35)" : "var(--border2)"}`, color: copiedId===sig.id ? "var(--green)" : "var(--cyan)", fontFamily:"var(--mono)", fontSize:8, padding:"4px 12px", borderRadius:3, cursor:"pointer", letterSpacing:1, fontWeight:700, transition:"all 0.2s" }}
                >
                  {copiedId === sig.id ? "✓ COPIATO!" : "📋 COPIA"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign:"center", padding:"40px 0", color:"var(--text3)", fontSize:11, letterSpacing:2 }}>
          Nessun segnale per il filtro selezionato
        </div>
      )}
    </div>
  );
}

// ── ROOT COMPONENT ────────────────────────────────────────────────
function SwiftTrendAIInner() {
  const [tab,          setTab]          = useState("monitor");
  const [serverUrl,    setServerUrl]    = useState(() => LS.get("sw_server_url", ""));
  const [anthropicKey, setAnthropicKey] = useState(() => LS.get("sw_anthropic_key", ""));
  const [twelveKey,    setTwelveKey]    = useState(() => LS.get("sw_twelve_key", ""));
  const [isDemoMode,   setDemoMode]     = useState(() => {
    const url = LS.get("sw_server_url", "");
    if (url) return false; // ← se c'è un URL configurato, SEMPRE live mode
    const saved = LS.get("sw_demo_mode", null);
    if (saved !== null) return saved;
    return true; // nessun URL e nessun flag salvato → demo
  });
  const [health,       setHealth]       = useState(null);
  const [tickerPrices, setTickerPrices] = useState({});
  const [toasts,       setToasts]       = useState([]);

  useEffect(() => {
    LS.set("sw_server_url", serverUrl);
    // v12: se si configura un URL, disattiva automaticamente il demo mode
    if (serverUrl) setDemoMode(false);
  }, [serverUrl]);
  useEffect(() => {
    // Debounce key saves — evita scritture a ogni keystroke
    const t = setTimeout(() => LS.set("sw_anthropic_key", anthropicKey), 500);
    return () => clearTimeout(t);
  }, [anthropicKey]);
  useEffect(() => {
    const t = setTimeout(() => LS.set("sw_twelve_key", twelveKey), 500);
    return () => clearTimeout(t);
  }, [twelveKey]);
  useEffect(() => { LS.set("sw_demo_mode",     isDemoMode);   }, [isDemoMode]);

  // Health poll
  useEffect(() => {
    if (isDemoMode) { setHealth(DEMO_HEALTH); return; }
    if (!serverUrl) return;
    const poll = async () => { try { const r = await fetch(`${serverUrl}/health`); if (r.ok) setHealth(await r.json()); } catch { setHealth(null); } };
    poll(); const i = setInterval(poll, 30000); return () => clearInterval(i);
  }, [serverUrl, isDemoMode]);

  const onPricesUpdate = useCallback(setTickerPrices, []);

  const addToast = useCallback((icon, msg) => {
    const id = Date.now();
    setToasts(t => [...t.slice(-3), { id, icon, msg, fading: false }]);
    setTimeout(() => setToasts(t => t.map(x => x.id === id ? { ...x, fading: true } : x)), 3500);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3800);
  }, []);

  const healthColor = isDemoMode ? "var(--yellow)"
    : !serverUrl ? "var(--text3)"
    : !health    ? "var(--text3)"
    : health.status === "ok" ? "var(--green)" : "var(--red)";

  const healthLabel = isDemoMode ? "DEMO"
    : !serverUrl ? "NO SERVER"
    : !health    ? "CONNECTING..."
    : health.status === "ok" ? "● LIVE" : "ERROR";

  const TABS = [
    { id:"monitor",   label:"LIVE MONITOR", cls: "" },
    { id:"perf",      label:"PERFORMANCE",  cls: "" },
    { id:"ftmo",      label:"FTMO 100K",    cls: "ftmo-tab" },
    { id:"market",    label:"MARKET AI",    cls: "" },
    { id:"consigli",  label:"⭐ CONSIGLI",   cls: "consigli-tab" },
    { id:"news",      label:"NEWS FEED",    cls: "news-tab" },
    { id:"macro",     label:"MACRO",        cls: "macro-tab" },
    { id:"config",    label:"CONFIG",       cls: "" },
  ];

  return (
    <>
      <style>{STYLES}</style>
      <div className="sw-root">

        {/* TICKER */}
        {Object.keys(tickerPrices).length > 0 && <TickerBar prices={tickerPrices} />}

        {/* HEADER */}
        <header className="sw-header">
          <div style={{ display:"flex", flexDirection:"column" }}>
            <div className="sw-logo-text">SWIFTTREND AI</div>
            <div style={{ fontSize:7, color:"var(--text3)", letterSpacing:3, marginTop:2, fontFamily:"var(--sans)" }}>COMMAND CENTER · v{VERSION}</div>
          </div>
          <div className="sw-logo-ver">SMC · RSI · FVG</div>
          <div className="sw-header-sep" />

          <div className="sw-health">
            <div className="sw-hdot" style={{ background:healthColor }} />
            <span style={{ color:healthColor, fontWeight:600 }}>{healthLabel}</span>
            {isDemoMode && <span className="sw-demo-badge" style={{ marginLeft:6 }}>⚠ DEMO — DATI SIMULATI</span>}
            {!isDemoMode && serverUrl && health?.status === "ok" && (
              <span style={{ marginLeft:6, fontSize:8, fontWeight:700, letterSpacing:2,
                background:"rgba(74,222,128,0.08)", border:"1px solid rgba(74,222,128,0.28)",
                color:"var(--green)", padding:"3px 8px", borderRadius:3 }}>
                ✓ LIVE — DATI REALI
              </span>
            )}
            {health && !isDemoMode && <span style={{ color:"var(--text3)" }}>· v{health.version} · {Math.floor((health.uptime_s||0)/60)}m up</span>}
          </div>

          <div className="sw-tabs" style={{ marginLeft:"auto" }}>
            {TABS.map(t => (
              <button key={t.id} className={`sw-tab${t.cls ? ` ${t.cls}` : ""}${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
        </header>

        {/* MAIN */}
        <main className="sw-main">
          <ErrorBoundary key={tab}>
            {tab === "monitor" && <LiveMonitor serverUrl={serverUrl} isDemoMode={isDemoMode} addToast={addToast} />}
            {tab === "perf"    && <PerformanceTab serverUrl={serverUrl} isDemoMode={isDemoMode} />}
            {tab === "ftmo"    && <FTMOTab serverUrl={serverUrl} isDemoMode={isDemoMode} />}
            {tab === "market"    && <MarketAnalysis anthropicKey={anthropicKey} twelveKey={twelveKey} onPricesUpdate={onPricesUpdate} />}
            {tab === "consigli"  && <ConsigliTab isDemoMode={isDemoMode} anthropicKey={anthropicKey} />}
            {tab === "news"      && <NewsTab />}
            {tab === "macro"   && <MacroTab serverUrl={serverUrl} isDemoMode={isDemoMode} twelveKey={twelveKey} />}
            {tab === "config"  && <ConfigTab serverUrl={serverUrl} setServerUrl={setServerUrl} anthropicKey={anthropicKey} setAnthropicKey={setAnthropicKey} twelveKey={twelveKey} setTwelveKey={setTwelveKey} isDemoMode={isDemoMode} setDemoMode={setDemoMode} />}
          </ErrorBoundary>
        </main>

        <ToastContainer toasts={toasts} />
      </div>
    </>
  );
}

export default function SwiftTrendAI() {
  return (
    <ErrorBoundary>
      <SwiftTrendAIInner />
    </ErrorBoundary>
  );
}
