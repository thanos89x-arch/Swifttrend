# CLAUDE.md
Rispndomi sempre in italiano
This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start dev server (HMR enabled, polling watcher for Windows compatibility)
npm run dev

# Build for production
npm run build

# Lint
npm run lint

# Preview production build
npm run preview
```

There is no test framework configured in this project.

## Architecture

This is a single-page React 19 + Vite 8 application. Almost all application logic lives in one monolithic file: `src/SwiftTrendAI_v17.jsx` (~3500 lines). `src/App.jsx` simply re-exports the default component from that file, and `src/main.jsx` mounts it.

### External API integrations

- **Anthropic Claude API** — called directly from the browser. In dev, Vite proxies `/anthropic` → `https://api.anthropic.com` (see `vite.config.js`). In production the user supplies their own API key via the CONFIG tab. Current model: `claude-sonnet-4-20250514`.
- **Binance REST API** — used for BTC/ETH candle data (no key required).
- **Twelve Data API** — used for forex/indices candle data; requires a user-supplied API key.
- **RSS proxy chain** — News tab fetches RSS feeds through a cascade of CORS proxies (allorigins → corsproxy → codetabs), with mock fallback articles.

### State persistence

User configuration is stored in `localStorage` under these keys:
- `sw_server_url` — optional backend server URL
- `sw_anthropic_key` — Anthropic API key
- `sw_twelve_key` — Twelve Data API key
- `sw_demo_mode` — boolean; auto-enabled when no server URL is set

### Demo mode

When no backend server URL is configured, the app runs in **Demo Mode**: all trade logs, equity curves, and health status are generated from static demo data (`DEMO_LOGS`, `DEMO_EQUITY`, `DEMO_STATS`, `DEMO_HEALTH` constants). This allows full UI exploration without a live backend.

### Tabs and their components

| Tab | Component | Data source |
|-----|-----------|-------------|
| LIVE MONITOR | `LiveMonitor` | Backend `/trades`, `/health`, Binance/TwelveData prices |
| PERFORMANCE | `PerformanceTab` | Backend `/stats`, `/equity` |
| FTMO 100K | `FTMOTab` | Backend challenge tracking endpoints |
| MARKET AI | `MarketAnalysis` | Binance + TwelveData candles, Claude API analysis |
| NEWS FEED | `NewsTab` | RSS feeds via CORS proxies |
| MACRO | `MacroTab` | Backend macro data |
| CONFIG | `ConfigTab` | localStorage |

### Styling

All CSS is defined as a template-literal string in the `STYLES` constant and injected via `<style>{STYLES}</style>` in the root component. CSS custom properties (design tokens) are defined on `:root`. There are no CSS modules, Tailwind, or external style sheets beyond `src/index.css` (minimal global resets).

### Assets

- `ASSETS` array (top of `SwiftTrendAI_v17.jsx`) defines the 7 tradable instruments with their Binance symbol, TwelveData symbol, display color, and icon.
- SVG gradient IDs are deduplicated via the `useSvgId` hook to avoid React re-render collisions.

### Backend

The app can connect to an optional external backend server (URL configured in CONFIG tab). It polls `/health` every 30 seconds. All backend-facing tabs gracefully fall back to demo data when the server is unavailable.
