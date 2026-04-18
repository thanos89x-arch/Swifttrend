// ── News sources, proxy chain, parsing — pure functions ──────────────

export interface NewsArticle {
  title: string;
  desc: string;
  link: string;
  timeAgo: string;
  impact: 'high' | 'med' | 'low';
  fallback: boolean;
  news_headline_type?: 'editorial' | 'hard_data';
}

export interface NewsSource {
  id: string;
  label: string;
  color: string;
  category: string;
  feedUrl: string;
  homeUrl: string;
}

export interface ProxyFetchResult {
  items: NewsArticle[];
  live: boolean;
  error?: string;
}

// ── Constants ─────────────────────────────────────────────────────────

export const NEWS_SOURCES: NewsSource[] = [
  { id: 'forexlive',    label: 'ForexLive',     color: 'var(--cyan)',  category: 'forex',  feedUrl: 'https://www.forexlive.com/feed/news',           homeUrl: 'https://www.forexlive.com' },
  { id: 'fxstreet',     label: 'FXStreet',      color: '#818cf8',      category: 'forex',  feedUrl: 'https://www.fxstreet.com/rss/news',             homeUrl: 'https://www.fxstreet.com/news' },
  { id: 'kitco',        label: 'Kitco Gold',    color: '#fbbf24',      category: 'gold',   feedUrl: 'https://www.kitco.com/rss/news.rss',            homeUrl: 'https://www.kitco.com/news' },
  { id: 'cointelegraph',label: 'CoinTelegraph', color: '#f7931a',      category: 'crypto', feedUrl: 'https://cointelegraph.com/rss',                 homeUrl: 'https://cointelegraph.com' },
  { id: 'investing',    label: 'Investing.com', color: '#34d399',      category: 'macro',  feedUrl: 'https://www.investing.com/rss/news_25.rss',     homeUrl: 'https://www.investing.com/news/forex-news' },
];

const CORS_PROXIES: Array<(url: string) => string> = [
  url => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

export const FALLBACK_ARTICLES: Record<string, NewsArticle[]> = {
  forexlive: [
    { title: 'Dollar holds gains as traders await Fed minutes', desc: 'The US dollar maintained its position ahead of the release of Federal Reserve meeting minutes, with markets pricing in a cautious rate path.', link: 'https://www.forexlive.com', timeAgo: 'live', impact: 'high', fallback: true },
    { title: 'EUR/USD consolidates near 1.0800 support zone', desc: 'Euro-dollar is trading in a tight range as ECB officials maintain a data-dependent stance ahead of next week\'s policy decision.', link: 'https://www.forexlive.com', timeAgo: 'live', impact: 'med', fallback: true },
    { title: 'GBP/USD holds above 1.26 on softer US yields', desc: 'Sterling trades firm as UK employment data came in above expectations, easing recession fears slightly.', link: 'https://www.forexlive.com', timeAgo: 'live', impact: 'low', fallback: true },
    { title: 'USD/JPY slides toward 149 on intervention chatter', desc: 'Japanese yen strengthened sharply after comments from Japanese finance officials suggesting readiness to act against excessive volatility.', link: 'https://www.forexlive.com', timeAgo: 'live', impact: 'high', fallback: true },
  ],
  fxstreet: [
    { title: 'Gold price rallies on safe-haven demand, eyes $3200', desc: 'XAU/USD climbs as geopolitical tensions and softening US data push investors toward safe-haven assets.', link: 'https://www.fxstreet.com/news', timeAgo: 'live', impact: 'high', fallback: true },
    { title: 'EUR/USD Weekly Forecast: ECB under pressure amid divergence', desc: 'The euro faces headwinds as the Federal Reserve maintains its restrictive stance while the ECB signals potential cuts.', link: 'https://www.fxstreet.com/news', timeAgo: 'live', impact: 'med', fallback: true },
    { title: 'Bitcoin surges past $85K, altcoins follow', desc: 'Crypto markets rallied broadly after positive sentiment from institutional buyers and ETF inflow data.', link: 'https://www.fxstreet.com/news', timeAgo: 'live', impact: 'high', fallback: true },
    { title: 'US Retail Sales miss expectations, dollar retreats', desc: 'Retail sales rose less than forecast in February, adding to evidence of a slowing consumer that may weigh on the Fed.', link: 'https://www.fxstreet.com/news', timeAgo: 'live', impact: 'high', fallback: true },
  ],
  kitco: [
    { title: 'Gold hits new all-time high above $3,100/oz', desc: 'Spot gold broke to fresh records as central bank buying and inflation hedging continued to support the precious metal.', link: 'https://www.kitco.com/news', timeAgo: 'live', impact: 'high', fallback: true },
    { title: 'Silver follows gold higher, testing $35 resistance', desc: 'Silver prices climbed as industrial demand outlook improved alongside the broader precious metals rally.', link: 'https://www.kitco.com/news', timeAgo: 'live', impact: 'med', fallback: true },
    { title: 'Gold ETF inflows surge as recession fears mount', desc: 'Holdings in major gold-backed ETFs rose for the sixth consecutive week as investors hedged against macroeconomic risk.', link: 'https://www.kitco.com/news', timeAgo: 'live', impact: 'med', fallback: true },
    { title: 'Analysts raise 2025 gold targets to $3,500', desc: 'Several major banks updated their price targets for gold citing central bank demand and geopolitical uncertainty.', link: 'https://www.kitco.com/news', timeAgo: 'live', impact: 'low', fallback: true },
  ],
  cointelegraph: [
    { title: 'Bitcoin tests $90K as institutional flows accelerate', desc: 'BTC is pushing toward the $90,000 level after spot ETF products recorded their largest weekly inflows since launch.', link: 'https://cointelegraph.com', timeAgo: 'live', impact: 'high', fallback: true },
    { title: 'Ethereum upgrade roadmap gets new timeline from devs', desc: 'Core Ethereum developers updated their roadmap during the latest AllCoreDevs call, clarifying the timeline for the next major upgrade.', link: 'https://cointelegraph.com', timeAgo: 'live', impact: 'med', fallback: true },
    { title: 'Stablecoin regulation moves forward in Congress', desc: 'A bipartisan bill targeting stablecoin issuers cleared committee with amendments, moving one step closer to a Senate floor vote.', link: 'https://cointelegraph.com', timeAgo: 'live', impact: 'high', fallback: true },
    { title: 'DeFi TVL reaches 6-month high on yield optimism', desc: 'Total value locked across DeFi protocols rose to its highest level in half a year as lending rates attracted more liquidity.', link: 'https://cointelegraph.com', timeAgo: 'live', impact: 'low', fallback: true },
  ],
  investing: [
    { title: 'S&P 500 futures edge higher ahead of earnings season', desc: 'US equity futures ticked up in pre-market trading as investors positioned ahead of a heavy week of corporate earnings.', link: 'https://www.investing.com/news/forex-news', timeAgo: 'live', impact: 'med', fallback: true },
    { title: "Fed's Waller: No rush to cut rates, data must improve", desc: 'Federal Reserve Governor Waller reiterated a cautious stance on monetary policy easing, citing still-elevated inflation.', link: 'https://www.investing.com/news/forex-news', timeAgo: 'live', impact: 'high', fallback: true },
    { title: 'Oil steady near $80 as OPEC+ holds output policy', desc: 'Crude prices held firm after the OPEC+ alliance confirmed it would maintain current production levels at its latest meeting.', link: 'https://www.investing.com/news/forex-news', timeAgo: 'live', impact: 'med', fallback: true },
    { title: 'China PMI beats forecasts, boosting risk sentiment', desc: 'Chinese manufacturing activity expanded more than expected in the latest reading, lifting sentiment across Asia-Pacific markets.', link: 'https://www.investing.com/news/forex-news', timeAgo: 'live', impact: 'high', fallback: true },
  ],
};

// ── High-impact keywords for scoring ─────────────────────────────────

const HIGH_WORDS = [
  'CPI','NFP','Fed','rate','inflation','recession','crash','bank',
  'GDP','FOMC','war','crisis','sanction','halt','surge','plunge',
  'collapse','ban','emergency',
];

// ── Pure parsing function ─────────────────────────────────────────────

export function parseRSS(xmlText: string): NewsArticle[] {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    const items = Array.from(doc.querySelectorAll('item')).slice(0, 8);
    if (items.length === 0) return [];
    return items.map(item => {
      const title   = item.querySelector('title')?.textContent?.trim() ?? 'No title';
      const desc    = item.querySelector('description')?.textContent?.replace(/<[^>]*>/g, '').trim() ?? '';
      const link    = item.querySelector('link')?.textContent?.trim() ?? '#';
      const pubDate = item.querySelector('pubDate')?.textContent?.trim() ?? '';
      const date    = pubDate ? new Date(pubDate) : null;
      const timeAgo = date && !isNaN(date.getTime()) ? (() => {
        const m = Math.floor((Date.now() - date.getTime()) / 60000);
        if (m < 60)   return `${m}m ago`;
        if (m < 1440) return `${Math.floor(m / 60)}h ago`;
        return `${Math.floor(m / 1440)}d ago`;
      })() : '';
      const upperTitle = title.toUpperCase();
      const impact: NewsArticle['impact'] = HIGH_WORDS.some(w => upperTitle.includes(w.toUpperCase())) ? 'high'
        : title.length > 60 ? 'med' : 'low';
      return { title, desc, link, timeAgo, impact, fallback: false };
    });
  } catch {
    return [];
  }
}

// ── Proxy-chain fetcher ───────────────────────────────────────────────

export async function fetchWithProxyFallback(src: NewsSource): Promise<ProxyFetchResult> {
  let lastErr: Error | null = null;
  for (const makeUrl of CORS_PROXIES) {
    try {
      const url  = makeUrl(src.feedUrl);
      const ctrl = new AbortController();
      const tid  = setTimeout(() => ctrl.abort(), 7000);
      const res  = await fetch(url, { signal: ctrl.signal });
      clearTimeout(tid);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ct = res.headers.get('content-type') ?? '';
      let xmlText: string;
      if (ct.includes('application/json')) {
        const j = await res.json() as { contents?: string };
        xmlText = j.contents ?? '';
      } else {
        xmlText = await res.text();
      }
      if (!xmlText || xmlText.trim().length < 50) throw new Error('risposta vuota');
      const items = parseRSS(xmlText);
      if (items.length === 0) throw new Error('nessun item RSS');
      return { items, live: true };
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }
  return {
    items: FALLBACK_ARTICLES[src.id] ?? [],
    live: false,
    error: lastErr?.message,
  };
}
