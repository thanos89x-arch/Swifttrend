import { useState } from 'react';
import { useAppStore } from '@/shared/store/useAppStore';
import { useMacroEnrichment, useAssetPrices } from '@/shared/api/hooks';
import { ASSETS } from '@/shared/utils/assets';
import { getDecimals } from '@/shared/utils/indicators';
import { fmtTime } from '@/shared/utils/format';
import type { SentimentEntry } from '@/shared/types';

// ── Constants ─────────────────────────────────────────────────────────

const CATEGORIES_MAP: Record<string, string> = {
  crypto:  'CRYPTO',
  forex:   'FOREX',
  indices: 'INDICI',
  metals:  'METALLI',
};

const MACRO_TABS = [
  { id: 'overview',  label: 'OVERVIEW'   },
  { id: 'fred',      label: 'FRED / USA' },
  { id: 'cot',       label: 'COT'        },
  { id: 'sentiment', label: 'SENTIMENT'  },
  { id: 'calendar',  label: 'CALENDARIO' },
] as const;

type MacroTabId = typeof MACRO_TABS[number]['id'];

// ── Color helpers ─────────────────────────────────────────────────────

const sentColor  = (label: string) =>
  label === 'BULLISH' ? 'var(--green)' : label === 'BEARISH' ? 'var(--red)' : 'var(--text3)';

const impactColor = (impact: string) =>
  impact === 'HIGH' ? 'var(--red)' : impact === 'MED' ? 'var(--yellow)' : 'var(--text3)';

const netColor = (n: number) =>
  n > 0 ? 'var(--green)' : n < 0 ? 'var(--red)' : 'var(--text3)';

const fmtAge = (s: string | undefined) => s ?? '—';

// ── Sentinel: resolve sentiment for an asset by id or symbol aliases ──
function resolveSentiment(
  sentiment: Record<string, SentimentEntry> | undefined,
  assetId: string,
  twelveSymbol: string | null | undefined,
): SentimentEntry | null {
  if (!sentiment) return null;
  return sentiment[assetId]
    ?? (twelveSymbol ? sentiment[twelveSymbol] : null)
    ?? (twelveSymbol ? sentiment[twelveSymbol.replace('/', '')] : null)
    ?? null;
}

// ── Main component ────────────────────────────────────────────────────

export function MacroTab() {
  const { serverUrl, twelveKey, isDemoMode } = useAppStore();

  // UI state only
  const [macroTab, setMacroTab] = useState<MacroTabId>('overview');

  // TanStack Query — zero useEffect
  const { data, isLoading, error } = useMacroEnrichment();
  const { prices }                  = useAssetPrices(twelveKey);

  // Derived timestamps
  const priceTs  = Object.keys(prices).length > 0 ? Date.now() : null;
  const macroTs  = data ? Date.now() : null;

  // ── Loading / empty states ─────────────────────────────────────────
  if (isLoading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200,
      color:'var(--text3)', fontSize:9, letterSpacing:2 }}>
      CARICAMENTO MACRO CONTEXT...
    </div>
  );

  if (!serverUrl && !isDemoMode) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200,
      color:'var(--text3)', fontSize:9, letterSpacing:2 }}>
      Configura il Server URL nella tab CONFIG per vedere i dati macro.
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12, paddingTop:4 }}>

      {/* ── Banner demo / errore ── */}
      {isDemoMode && (
        <div style={{ background:'rgba(251,191,36,0.06)', border:'1px solid rgba(251,191,36,0.2)',
          color:'var(--yellow)', fontSize:8, letterSpacing:2, padding:'5px 14px', borderRadius:3 }}>
          DEMO — DATI SIMULATI · CONNETTI IL SERVER PER DATI REALI
        </div>
      )}
      {error && (
        <div style={{ background:'rgba(251,113,133,0.06)', border:'1px solid rgba(251,113,133,0.2)',
          color:'var(--red)', fontSize:9, padding:'6px 14px', borderRadius:3 }}>
          Errore enrichment: {error} · GET /enrichment/data non disponibile (richiede server v4.9+)
        </div>
      )}

      {/* ── SUB-NAVIGATION ── */}
      <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
        {MACRO_TABS.map(t => (
          <button key={t.id} type="button"
            onClick={() => setMacroTab(t.id)}
            style={{
              padding:'5px 14px', borderRadius:2, cursor:'pointer',
              fontFamily:'var(--mono)', fontSize:9, fontWeight:700, letterSpacing:1.5,
              border: macroTab === t.id ? '1px solid var(--cyan)' : '1px solid var(--border2)',
              background: macroTab === t.id ? 'rgba(94,234,212,0.07)' : 'transparent',
              color: macroTab === t.id ? 'var(--cyan)' : 'var(--text3)',
            }}
          >{t.label}</button>
        ))}
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
          {priceTs && <span style={{ fontSize:7, color:'var(--text3)', fontFamily:'var(--mono)', letterSpacing:1 }}>↻ {fmtTime(priceTs)}</span>}
          {macroTs && <span style={{ fontSize:7, color:'var(--text3)', fontFamily:'var(--mono)', letterSpacing:1 }}>MACRO {new Date(macroTs).toLocaleTimeString()}</span>}
        </div>
      </div>

      {/* ── TAB: MARKET OVERVIEW ── */}
      {macroTab === 'overview' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {Object.keys(CATEGORIES_MAP).map(cat => {
            const catAssets = ASSETS.filter(a => a.category === cat);
            return (
              <div key={cat} className="sw-panel">
                <div className="sw-panel-header">
                  <div className="sw-panel-title">{CATEGORIES_MAP[cat]}</div>
                  <span className="sw-panel-badge">{catAssets.length} simboli</span>
                </div>
                <div style={{ padding:'0' }}>
                  <div style={{
                    display:'grid', gridTemplateColumns:'24px 1fr 130px 90px 60px 80px',
                    padding:'5px 14px', borderBottom:'1px solid var(--border)',
                    fontSize:7, letterSpacing:2, color:'var(--text3)',
                    fontFamily:'var(--sans)', fontWeight:700,
                  }}>
                    <span /><span>SIMBOLO</span>
                    <span style={{ textAlign:'right' }}>PREZZO</span>
                    <span style={{ textAlign:'right' }}>24H %</span>
                    <span style={{ textAlign:'center' }}>BIAS</span>
                    <span style={{ textAlign:'center' }}>SENTIMENT</span>
                  </div>
                  {catAssets.map(a => {
                    const pd  = prices[a.id];
                    const dec = getDecimals(a);
                    const s   = resolveSentiment(data?.sentiment, a.id, a.twelveSymbol);
                    const bias    = !pd?.chg ? null : pd.chg >= 1.5 ? 'BULL' : pd.chg <= -1.5 ? 'BEAR' : 'NEUT';
                    const biasClr = bias === 'BULL' ? 'var(--green)' : bias === 'BEAR' ? 'var(--red)' : 'var(--text3)';
                    return (
                      <div key={a.id} style={{
                        display:'grid', gridTemplateColumns:'24px 1fr 130px 90px 60px 80px',
                        padding:'8px 14px', borderBottom:'1px solid var(--border)',
                        alignItems:'center', fontFamily:'var(--mono)', fontSize:9,
                      }}>
                        <div style={{ width:6, height:6, borderRadius:'50%', background:a.color }} />
                        <div>
                          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                            <span style={{ fontSize:8, color:a.color, fontWeight:700,
                              background:`${a.color}18`, padding:'1px 4px', borderRadius:2 }}>{a.icon}</span>
                            <span style={{ fontWeight:700, color:'var(--text1)', fontSize:10 }}>{a.label}</span>
                          </div>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          {pd?.price != null
                            ? <span style={{ fontWeight:700, color:'var(--text1)' }}>
                                {pd.price.toLocaleString('en-US', { minimumFractionDigits:dec, maximumFractionDigits:dec })}
                              </span>
                            : <span style={{ color:'var(--text3)' }}>—</span>}
                        </div>
                        <div style={{ textAlign:'right' }}>
                          {pd?.chg != null
                            ? <span style={{ fontWeight:700, color: pd.chg >= 0 ? 'var(--green)' : 'var(--red)' }}>
                                {pd.chg >= 0 ? '▲' : '▼'}{Math.abs(pd.chg).toFixed(2)}%
                              </span>
                            : <span style={{ color:'var(--text3)', fontSize:8 }}>—</span>}
                        </div>
                        <div style={{ textAlign:'center' }}>
                          {bias
                            ? <span style={{ fontSize:8, fontWeight:700, color:biasClr }}>{bias}</span>
                            : <span style={{ color:'var(--text3)', fontSize:8 }}>—</span>}
                        </div>
                        <div style={{ textAlign:'center' }}>
                          {s
                            ? <span style={{
                                fontSize:8, fontWeight:700, padding:'2px 6px', borderRadius:2, letterSpacing:1,
                                color: sentColor(s.label),
                                background: s.label === 'BULLISH' ? 'rgba(74,222,128,0.08)'
                                          : s.label === 'BEARISH' ? 'rgba(248,113,113,0.08)'
                                          : 'rgba(255,255,255,0.03)',
                                border: `1px solid ${s.label === 'BULLISH' ? 'rgba(74,222,128,0.2)'
                                          : s.label === 'BEARISH' ? 'rgba(251,113,133,0.2)'
                                          : 'var(--border)'}`,
                              }}>{s.label}</span>
                            : <span style={{ color:'var(--text3)', fontSize:8 }}>—</span>}
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
      {macroTab === 'fred' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <div className="sw-panel">
            <div className="sw-panel-header">
              <div className="sw-panel-title">FRED — MACRO USA</div>
              <span className="sw-panel-badge">Federal Reserve St. Louis</span>
            </div>
            <div style={{ padding:'12px 14px', display:'flex', flexDirection:'column', gap:8 }}>
              {data?.fred ? ([
                ['Fed Funds Rate',  `${data.fred.fed_rate ?? '—'}%`,
                  (data.fred.fed_rate ?? 0) > 4 ? 'var(--red)' : 'var(--green)'],
                ['CPI Index',       data.fred.cpi_yoy != null ? data.fred.cpi_yoy.toFixed(2) : '—',
                  (data.fred.cpi_yoy ?? 0) > 320 ? 'var(--yellow)' : 'var(--green)'],
                ['NFP Last',        data.fred.nfp_last ? `${(data.fred.nfp_last / 1000).toFixed(0)}K` : '—',
                  'var(--cyan)'],
                ['M2 Money Stock',  data.fred.m2_growth != null ? `$${(data.fred.m2_growth / 1000).toFixed(1)}T` : '—',
                  'var(--text2)'],
              ] as Array<[string, string, string]>).map(([k, v, c]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'6px 8px', background:'var(--bg3)', borderRadius:3, border:'1px solid var(--border)',
                  fontSize:9, fontFamily:'var(--mono)' }}>
                  <span style={{ color:'var(--text2)', letterSpacing:1 }}>{k}</span>
                  <span style={{ color:c, fontWeight:700, fontSize:11 }}>{v}</span>
                </div>
              )) : <div className="sw-empty">Nessun dato FRED</div>}
            </div>
          </div>
          {data?.cache_ages && (
            <div className="sw-panel">
              <div className="sw-panel-header"><div className="sw-panel-title">CACHE STATUS</div></div>
              <div style={{ padding:'12px 14px', display:'flex', flexDirection:'column', gap:8 }}>
                {([
                  ['FRED',     data.cache_ages.fred,     'var(--blue)'],
                  ['CFTC COT', data.cache_ages.cot,      'var(--purple)'],
                  ['FINNHUB',  data.cache_ages.finnhub,  'var(--cyan)'],
                  ['CALENDAR', data.cache_ages.calendar, 'var(--green)'],
                ] as Array<[string, string | undefined, string]>).map(([src, age, color]) => (
                  <div key={src} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                    padding:'6px 8px', background:'var(--bg3)', borderRadius:3, border:'1px solid var(--border)',
                    fontSize:9, fontFamily:'var(--mono)' }}>
                    <span style={{ color:'var(--text2)' }}>{src}</span>
                    <span style={{ color, fontWeight:700 }}>CACHE: {fmtAge(age)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: COT ── */}
      {macroTab === 'cot' && (
        <div className="sw-panel">
          <div className="sw-panel-header">
            <div className="sw-panel-title">CFTC COT — POSIZIONAMENTO ISTITUZIONALE</div>
            <span className="sw-panel-badge">Settimanale · {data?.cot ? Object.keys(data.cot).length : 0} asset</span>
          </div>
          <div style={{ padding:'0' }}>
            <div style={{ display:'grid', gridTemplateColumns:'90px 90px 90px 1fr 60px',
              padding:'5px 14px', borderBottom:'1px solid var(--border)',
              fontSize:7, letterSpacing:2, color:'var(--text3)', fontFamily:'var(--sans)', fontWeight:700 }}>
              <span>ASSET</span><span>NET POS</span><span>WEEK CHG</span><span>% LONG</span>
              <span style={{ textAlign:'center' }}>BIAS</span>
            </div>
            {data?.cot
              ? Object.entries(data.cot).map(([sym, c]) => {
                  const bias = c.pct_long > 55 ? 'BULL' : c.pct_long < 45 ? 'BEAR' : 'NEUT';
                  const bClr = bias === 'BULL' ? 'var(--green)' : bias === 'BEAR' ? 'var(--red)' : 'var(--text3)';
                  return (
                    <div key={sym} style={{ display:'grid', gridTemplateColumns:'90px 90px 90px 1fr 60px',
                      padding:'8px 14px', borderBottom:'1px solid var(--border)', fontSize:9,
                      fontFamily:'var(--mono)', alignItems:'center' }}>
                      <span style={{ fontWeight:700, color:'var(--text1)' }}>{sym}</span>
                      <span style={{ color: netColor(c.net), fontWeight:700 }}>
                        {c.net > 0 ? '+' : ''}{(c.net / 1000).toFixed(1)}K
                      </span>
                      <span style={{ color: netColor(c.change), fontSize:8 }}>
                        {c.change > 0 ? '▲' : '▼'} {Math.abs(c.change / 1000).toFixed(1)}K
                      </span>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <div style={{ flex:1, background:'var(--border)', borderRadius:2, height:5 }}>
                          <div style={{ width:`${c.pct_long ?? 50}%`, height:'100%', borderRadius:2,
                            background: (c.pct_long ?? 50) > 55 ? 'var(--green)'
                              : (c.pct_long ?? 50) < 45 ? 'var(--red)' : 'var(--yellow)' }} />
                        </div>
                        <span style={{ fontSize:8, color:'var(--text2)', minWidth:28 }}>{c.pct_long}%</span>
                      </div>
                      <div style={{ textAlign:'center' }}>
                        <span style={{ fontSize:8, fontWeight:700, color:bClr }}>{bias}</span>
                      </div>
                    </div>
                  );
                })
              : <div className="sw-empty">Nessun dato COT</div>}
          </div>
        </div>
      )}

      {/* ── TAB: SENTIMENT ── */}
      {macroTab === 'sentiment' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {Object.keys(CATEGORIES_MAP).map(cat => {
            const catAssets = ASSETS.filter(a => a.category === cat);
            const catSentiment = catAssets.map(a => ({
              asset: a,
              s: resolveSentiment(data?.sentiment, a.id, a.twelveSymbol),
            }));
            if (!catSentiment.length) return null;
            return (
              <div key={cat} className="sw-panel">
                <div className="sw-panel-header">
                  <div className="sw-panel-title">SENTIMENT — {CATEGORIES_MAP[cat]}</div>
                  <span className="sw-panel-badge">Finnhub · {catSentiment.length} simboli</span>
                </div>
                <div style={{ padding:'0' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 70px 80px 80px 90px',
                    padding:'5px 14px', borderBottom:'1px solid var(--border)',
                    fontSize:7, letterSpacing:2, color:'var(--text3)', fontFamily:'var(--sans)', fontWeight:700 }}>
                    <span>SIMBOLO</span>
                    <span style={{ textAlign:'right' }}>ART.</span>
                    <span style={{ textAlign:'right' }}>SCORE</span>
                    <span style={{ textAlign:'right' }}>PREZZO</span>
                    <span style={{ textAlign:'center' }}>LABEL</span>
                  </div>
                  {catSentiment.map(({ asset: a, s }) => {
                    const pd  = prices[a.id];
                    const dec = getDecimals(a);
                    return (
                      <div key={a.id} style={{ display:'grid', gridTemplateColumns:'1fr 70px 80px 80px 90px',
                        padding:'8px 14px', borderBottom:'1px solid var(--border)',
                        alignItems:'center', fontFamily:'var(--mono)', fontSize:9 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ fontSize:8, color:a.color, fontWeight:700,
                            background:`${a.color}18`, padding:'1px 4px', borderRadius:2 }}>{a.icon}</span>
                          <span style={{ fontWeight:700, color:'var(--text1)' }}>{a.label}</span>
                        </div>
                        <span style={{ textAlign:'right', color:'var(--text3)' }}>{s?.articles ?? '—'}</span>
                        <span style={{ textAlign:'right',
                          color: s == null ? 'var(--text3)' : s.score > 0.1 ? 'var(--green)' : s.score < -0.1 ? 'var(--red)' : 'var(--text2)',
                          fontWeight:700 }}>
                          {s == null ? '—' : `${s.score >= 0 ? '+' : ''}${s.score.toFixed(2)}`}
                        </span>
                        <span style={{ textAlign:'right', color:'var(--text2)' }}>
                          {pd?.price != null
                            ? pd.price.toLocaleString('en-US', { minimumFractionDigits:dec, maximumFractionDigits:dec })
                            : '—'}
                        </span>
                        <div style={{ textAlign:'center' }}>
                          <span style={{
                            fontSize:8, fontWeight:700, padding:'2px 7px', borderRadius:2, letterSpacing:1.5,
                            color: s == null ? 'var(--text3)' : sentColor(s.label),
                            background: s?.label === 'BULLISH' ? 'rgba(74,222,128,0.08)'
                                      : s?.label === 'BEARISH' ? 'rgba(248,113,113,0.08)'
                                      : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${s?.label === 'BULLISH' ? 'rgba(74,222,128,0.2)'
                                      : s?.label === 'BEARISH' ? 'rgba(251,113,133,0.2)'
                                      : 'var(--border)'}`,
                          }}>{s?.label ?? 'N/A'}</span>
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
      {macroTab === 'calendar' && (
        <div className="sw-panel">
          <div className="sw-panel-header">
            <div className="sw-panel-title">ECONOMIC CALENDAR</div>
            <span className="sw-panel-badge">HIGH / MED impact</span>
          </div>
          <div style={{ padding:'0' }}>
            {data?.calendar && data.calendar.length > 0
              ? data.calendar.map((ev, i) => (
                  <div key={i} style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)',
                    fontFamily:'var(--mono)', fontSize:9 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:5 }}>
                      <span style={{ fontWeight:700, color:'var(--text1)', minWidth:40 }}>{ev.time}</span>
                      <span style={{ fontSize:7, fontWeight:700, padding:'2px 7px', borderRadius:2, letterSpacing:1.5,
                        color: impactColor(ev.impact),
                        background: ev.impact === 'HIGH' ? 'rgba(248,113,113,0.08)' : 'rgba(251,191,36,0.07)',
                        border: `1px solid ${ev.impact === 'HIGH' ? 'rgba(251,113,133,0.2)' : 'rgba(251,191,36,0.18)'}` }}>
                        {ev.impact}
                      </span>
                      <span style={{ color:'var(--text3)', fontSize:8, fontWeight:700 }}>{ev.currency}</span>
                    </div>
                    <div style={{ color:'var(--text)', marginBottom:4, fontSize:10 }}>{ev.event}</div>
                    <div style={{ display:'flex', gap:14, fontSize:8, color:'var(--text3)' }}>
                      <span>Forecast: <b style={{ color:'var(--cyan)' }}>{ev.forecast}</b></span>
                      <span>Previous: <b style={{ color:'var(--text2)' }}>{ev.previous}</b></span>
                    </div>
                  </div>
                ))
              : <div className="sw-empty">Nessun evento nelle prossime ore</div>}
          </div>
        </div>
      )}

    </div>
  );
}
