import { useState } from 'react';
import { useNewsFeeds } from '@/shared/api/hooks';
import { NEWS_SOURCES } from '@/shared/api/news';
import type { NewsArticle, NewsSource } from '@/shared/api/news';
import { useQueryClient } from '@tanstack/react-query';

// ── Sub-component: single news card ──────────────────────────────────

function NewsCard({ item, src }: { item: NewsArticle; src: NewsSource }) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="sw-news-card"
      style={{ '--src-col': src.color } as React.CSSProperties}
    >
      <div className="sw-news-card-header">
        <div className="sw-news-source-dot" style={{ background: src.color }} />
        <span className="sw-news-source-label" style={{ color: src.color }}>{src.label}</span>
        <span className={`sw-news-impact-badge ${item.impact}`}>
          {item.impact === 'high' ? '⚡ HIGH' : item.impact === 'med' ? '◆ MED' : '· LOW'}
        </span>
        {item.news_headline_type === 'hard_data' && (
          <span style={{ fontFamily:'var(--mono)', fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:2, background:'rgba(34,211,238,0.1)', color:'var(--cyan2)', border:'1px solid rgba(34,211,238,0.22)', letterSpacing:0.5, whiteSpace:'nowrap' }}>📊 HARD DATA</span>
        )}
        {item.news_headline_type === 'editorial' && (
          <span style={{ fontFamily:'var(--mono)', fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:2, background:'rgba(120,120,120,0.1)', color:'var(--text3)', border:'1px solid rgba(120,120,120,0.2)', letterSpacing:0.5, whiteSpace:'nowrap' }}>💬 EDITORIAL</span>
        )}
      </div>
      <div className="sw-news-card-body">
        <p className="sw-news-title">{item.title}</p>
        {item.desc && <p className="sw-news-desc">{item.desc}</p>}
      </div>
      <div className="sw-news-footer">
        <span style={{ color: src.color, fontWeight: 700 }}>↗ APRI ARTICOLO</span>
        <span className="sw-news-time">{item.timeAgo}</span>
      </div>
    </a>
  );
}

// ── Main component ────────────────────────────────────────────────────

export function NewsTab() {
  // activeSrc is UI state — stays as useState
  const [activeSrc, setActiveSrc] = useState<string>(NEWS_SOURCES[0].id);

  const feeds    = useNewsFeeds();
  const qc       = useQueryClient();

  // Derived from TanStack Query state — no useState for data/loading/errors
  const feedMap = Object.fromEntries(feeds.map(f => [f.src.id, f]));

  const active      = feedMap[activeSrc];
  const curSrc      = active?.src ?? NEWS_SOURCES[0];
  const items       = active?.data?.items ?? [];
  const isLoad      = active?.isPending ?? false;
  const isLive      = active?.data?.live ?? false;
  const hasErr      = !!(active?.data && !active.data.live);

  const anyLoad  = feeds.some(f => f.isPending);
  const totalArt = feeds.reduce((sum, f) => sum + (f.data?.items.length ?? 0), 0);

  const handleRefresh = () => {
    NEWS_SOURCES.forEach(s => {
      void qc.invalidateQueries({ queryKey: ['news', s.id] });
    });
  };

  return (
    <div className="sw-news-root">

      {/* ── FONTE TABS ── */}
      <div className="sw-news-src-bar">
        {NEWS_SOURCES.map(s => {
          const f    = feedMap[s.id];
          const cnt  = f?.data?.items.length ?? 0;
          const live = f?.data?.live ?? false;
          const ldg  = f?.isPending ?? false;
          return (
            <button
              key={s.id}
              type="button"
              className={`sw-news-src-tab${activeSrc === s.id ? ' active' : ''}`}
              style={{ '--src-col': s.color } as React.CSSProperties}
              onClick={() => setActiveSrc(s.id)}
            >
              <div className="sw-news-src-dot" style={{ background: s.color }} />
              {s.label}
              {ldg
                ? <span style={{ fontSize: 8, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>…</span>
                : cnt > 0
                  ? <span className={`sw-news-live-badge ${live ? 'live' : 'cached'}`}>
                      {live ? 'LIVE' : 'CACHED'}
                    </span>
                  : null}
            </button>
          );
        })}

        <div className="sw-news-src-sep" />
        <div className="sw-news-src-meta">
          <span>{anyLoad ? '⟳ CARICAMENTO...' : `${totalArt} articoli`}</span>
          <button type="button" className="sw-news-refresh" onClick={handleRefresh}>↻ REFRESH</button>
        </div>
      </div>

      {/* ── PANEL ── */}
      <div className="sw-news-panel">

        {/* intestazione fonte */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderBottom: '1px solid var(--border)',
          background: 'var(--bg3)', flexShrink: 0,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: curSrc.color, boxShadow: `0 0 7px ${curSrc.color}` }} />
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, color: curSrc.color, fontFamily: 'var(--mono)' }}>
            {curSrc.label}
          </span>
          <span style={{ fontSize: 8, color: 'var(--text3)', letterSpacing: 1.5, fontFamily: 'var(--mono)' }}>
            {curSrc.category.toUpperCase()}
          </span>
          <div style={{ flex: 1 }} />
          {!isLoad && items.length > 0 && (
            <span style={{
              fontSize: 8, fontWeight: 700, letterSpacing: 1.5, padding: '2px 8px', borderRadius: 3,
              background: isLive ? 'rgba(74,222,128,0.06)' : 'rgba(251,191,36,0.07)',
              border: isLive ? '1px solid rgba(52,211,153,0.25)' : '1px solid rgba(251,191,36,0.25)',
              color: isLive ? 'var(--green)' : 'var(--yellow)', fontFamily: 'var(--mono)',
            }}>
              {isLive ? '● LIVE' : '◌ CACHED'}
            </span>
          )}
          {hasErr && !isLoad && (
            <span
              style={{ fontSize: 8, color: 'var(--yellow)', fontFamily: 'var(--mono)', letterSpacing: 1 }}
              title={active?.data?.error}
            >⚠ proxy fallback</span>
          )}
          <span style={{ fontSize: 8, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
            {isLoad ? '' : `${items.length} news`}
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
              <NewsCard key={i} item={item} src={curSrc} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
