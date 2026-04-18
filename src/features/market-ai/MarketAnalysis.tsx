import { useMemo, useState } from 'react';
import type { Asset, ClaudeSignal, Timeframe } from '@/shared/types';
import { useAppStore } from '@/shared/store/useAppStore';
import {
  useAssetPrices, useFearGreed, useAssetCandles, useAssetIndicators, useAnalyzeSignal,
} from '@/shared/api/hooks';
import { ASSETS } from '@/shared/utils/assets';
import { getDecimals, calcGann } from '@/shared/utils/indicators';
import { fmtTime } from '@/shared/utils/format';
import { ProCandleChart, RSIPanel, MACDPanel } from '@/shared/ui/charts';

// ── Config ───────────────────────────────────────────────────────────

const TF_OPTIONS: Array<{ label: string; id: Timeframe }> = [
  { label: '15m', id: '15m' },
  { label: '1H',  id: '1h'  },
  { label: '4H',  id: '4h'  },
  { label: '1D',  id: '1d'  },
];

const CATEGORIES = ['ALL', 'crypto', 'forex', 'indices', 'metals'] as const;
type Category = typeof CATEGORIES[number];
const CAT_LABELS: Record<Category, string> = {
  ALL: 'TUTTI', crypto: 'CRYPTO', forex: 'FOREX', indices: 'INDICI', metals: 'METALLI',
};

// ── Color helpers ────────────────────────────────────────────────────

const fgColor = (v: number | null): string =>
  v == null ? 'var(--text3)'
  : v < 25  ? 'var(--red)'
  : v < 45  ? 'var(--yellow)'
  : v < 55  ? 'var(--text2)'
  : v < 75  ? 'var(--green)'
  :           'var(--go-full)';

const sigColor  = (s: ClaudeSignal['signal']): string =>
  s === 'BUY' ? 'var(--green)' : s === 'SELL' ? 'var(--red)' : 'var(--yellow)';
const sigBg     = (s: ClaudeSignal['signal']): string =>
  s === 'BUY' ? 'rgba(52,211,153,0.10)' : s === 'SELL' ? 'rgba(241,76,76,0.1)' : 'rgba(229,192,123,0.1)';
const sigBorder = (s: ClaudeSignal['signal']): string =>
  s === 'BUY' ? 'rgba(74,222,128,0.28)' : s === 'SELL' ? 'rgba(241,76,76,0.3)' : 'rgba(229,192,123,0.3)';

// ── MAIN COMPONENT ───────────────────────────────────────────────────

export function MarketAnalysis() {
  const { anthropicKey, twelveKey, addToast } = useAppStore();

  // UI state
  const [selectedAsset, setSelectedAsset] = useState<Asset>(ASSETS[0]);
  const [category,      setCategory]      = useState<Category>('ALL');
  const [chartAsset,    setChartAsset]    = useState<Asset | null>(null);
  const [chartTf,       setChartTf]       = useState<Timeframe>('1h');
  const [showFib,       setShowFib]       = useState(false);
  const [showGann,      setShowGann]      = useState(false);
  const [showBB,        setShowBB]        = useState(false);
  const [signals,       setSignals]       = useState<Record<string, ClaudeSignal>>({});

  // Server/remote state via TanStack Query
  const { prices, isLoading: pricesLoading } = useAssetPrices(twelveKey);
  const { fearGreed } = useFearGreed();

  const activeAsset = chartAsset ?? selectedAsset;

  const { candles, isLoading: candleLoading } = useAssetCandles(
    activeAsset.id, twelveKey, chartTf, chartAsset !== null
  );
  const { indicators, isLoading: indLoading } = useAssetIndicators(
    activeAsset.id, twelveKey, chartTf
  );

  const analyzeMutation = useAnalyzeSignal();

  // Derived
  const filteredAssets = useMemo(
    () => category === 'ALL' ? ASSETS : ASSETS.filter(a => a.category === category),
    [category]
  );
  const decimals  = getDecimals(selectedAsset);
  const priceD    = prices[selectedAsset.id];
  const signal    = signals[activeAsset.id] ?? null;
  const lastUpdate = pricesLoading ? null : Date.now();

  const handleAnalyze = async () => {
    if (!anthropicKey) {
      addToast('⚠', 'Inserisci la Anthropic API key in CONFIG');
      return;
    }
    if (!indicators) return;
    const currentPrice = prices[activeAsset.id]?.price ?? 0;
    try {
      const sig = await analyzeMutation.mutateAsync({
        asset: activeAsset,
        indicators,
        price: currentPrice,
        fearGreed,
        anthropicKey,
      });
      setSignals(s => ({ ...s, [activeAsset.id]: sig }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'errore sconosciuto';
      setSignals(s => ({
        ...s,
        [activeAsset.id]: {
          signal: 'WAIT', confidence: 0,
          reasoning: `Errore: ${msg}`,
          tp_pct: 0, sl_pct: 0, generated_at: Date.now(),
        },
      }));
    }
  };

  const analyzing = analyzeMutation.isPending;

  // ── VISTA CHART DRILL-DOWN ─────────────────────────────────────────
  if (chartAsset) {
    const ca      = chartAsset;
    const caPriceD = prices[ca.id];
    const caDec    = getDecimals(ca);
    const caSig    = signals[ca.id] ?? null;

    return (
      <div className="sw-market-root">

        {/* ── CHART HEADER ── */}
        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:8 }}>
          <button
            type="button"
            onClick={() => setChartAsset(null)}
            style={{
              padding:'5px 10px', borderRadius:4, border:'1px solid var(--border)',
              background:'transparent', color:'var(--text2)', fontFamily:'var(--mono)',
              fontSize:9, fontWeight:700, letterSpacing:1.5, cursor:'pointer',
            }}
          >← LISTA</button>

          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{
              width:28, height:28, borderRadius:5, flexShrink:0,
              background:`${ca.color}18`, display:'flex', alignItems:'center',
              justifyContent:'center', fontSize:12, fontWeight:700, color:ca.color,
            }}>{ca.icon}</div>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--text1)', letterSpacing:1 }}>{ca.label}</div>
              {caPriceD?.price != null
                ? <div style={{ fontSize:10, fontFamily:'var(--mono)', color:(caPriceD.chg ?? 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {caPriceD.price.toLocaleString('en-US', { minimumFractionDigits:caDec, maximumFractionDigits:caDec })}
                    &nbsp;{(caPriceD.chg ?? 0) >= 0 ? '▲' : '▼'}{Math.abs(caPriceD.chg ?? 0).toFixed(2)}%
                  </div>
                : <div style={{ fontSize:9, color:'var(--text3)', fontFamily:'var(--mono)' }}>—</div>
              }
            </div>
          </div>

          {/* Timeframe selector */}
          <div style={{ display:'flex', gap:4, marginLeft:8 }}>
            {TF_OPTIONS.map(t => (
              <button key={t.id} type="button"
                onClick={() => setChartTf(t.id)}
                style={{
                  padding:'4px 8px', borderRadius:3, fontSize:9, fontWeight:700,
                  fontFamily:'var(--mono)', letterSpacing:1, cursor:'pointer',
                  border: chartTf === t.id ? `1px solid ${ca.color}` : '1px solid var(--border)',
                  background: chartTf === t.id ? `${ca.color}18` : 'transparent',
                  color: chartTf === t.id ? ca.color : 'var(--text3)',
                }}
              >{t.label}</button>
            ))}
          </div>

          {/* Toggle overlays */}
          <div style={{ display:'flex', gap:4 }}>
            {([
              { key:'fib',  label:'FIB',  val:showFib,  set:setShowFib  },
              { key:'gann', label:'GANN', val:showGann, set:setShowGann },
              { key:'bb',   label:'BB',   val:showBB,   set:setShowBB   },
            ] as const).map(({ key, label, val, set }) => (
              <button key={key} type="button"
                onClick={() => set(v => !v)}
                style={{
                  padding:'4px 8px', borderRadius:3, fontSize:9, fontWeight:700,
                  fontFamily:'var(--mono)', letterSpacing:1, cursor:'pointer',
                  border: val ? '1px solid var(--cyan)' : '1px solid var(--border)',
                  background: val ? 'rgba(94,234,212,0.08)' : 'transparent',
                  color: val ? 'var(--cyan)' : 'var(--text3)',
                }}
              >{label}</button>
            ))}
          </div>

          <button type="button"
            onClick={handleAnalyze}
            disabled={analyzing || !indicators}
            style={{
              marginLeft:'auto', padding:'6px 12px', borderRadius:4, flexShrink:0,
              border:`1px solid ${(analyzing || !indicators) ? 'var(--border)' : 'var(--cyan)'}`,
              background: analyzing ? 'transparent' : 'rgba(94,234,212,0.06)',
              color: (analyzing || !indicators) ? 'var(--text3)' : 'var(--cyan)',
              fontFamily:'var(--mono)', fontSize:9, fontWeight:700, letterSpacing:1.5,
              cursor:(analyzing || !indicators) ? 'not-allowed' : 'pointer',
              opacity: !indicators && !analyzing ? 0.4 : 1,
            }}
          >{analyzing ? '⟳ ANALISI...' : '🤖 AI SIGNAL'}</button>

          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:8, color:'var(--text3)', letterSpacing:2, fontFamily:'var(--mono)' }}>F&G</span>
            <span style={{ fontSize:13, fontWeight:700, color:fgColor(fearGreed?.value ?? null), fontFamily:'var(--mono)' }}>{fearGreed?.value ?? '—'}</span>
            <span style={{ fontSize:8, color:'var(--text3)', fontFamily:'var(--mono)' }}>{fearGreed?.label ?? ''}</span>
          </div>
        </div>

        {/* ── CORPO CHART ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 220px', gap:10, flex:1, minHeight:0 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:0, minWidth:0 }}>
            {candleLoading
              ? <div style={{
                  height:300, display:'flex', alignItems:'center', justifyContent:'center',
                  background:'var(--bg2)', borderRadius:6, border:'1px solid var(--border)',
                  fontSize:9, color:'var(--text3)', letterSpacing:2, fontFamily:'var(--mono)',
                }}>⟳ CARICAMENTO CANDELE...</div>
              : candles.length >= 2
                ? <>
                    <ProCandleChart
                      candles={candles} color={ca.color}
                      showFib={showFib} showGann={showGann} showBB={showBB}
                      signal={caSig}
                      width={900} height={280}
                    />
                    <RSIPanel  candles={candles} width={900} height={70} />
                    <MACDPanel candles={candles} width={900} height={70} />
                  </>
                : <div style={{
                    height:300, display:'flex', alignItems:'center', justifyContent:'center',
                    background:'var(--bg2)', borderRadius:6, border:'1px solid var(--border)',
                    fontSize:9, color:'var(--text3)', letterSpacing:2, fontFamily:'var(--mono)',
                  }}>NESSUN DATO DISPONIBILE</div>
            }
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:8, overflowY:'auto' }}>
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
                {(caSig.tp_pct ?? 0) > 0 && (
                  <div className="sw-mkt-info-row">
                    <span className="sw-mkt-info-key">TAKE PROFIT</span>
                    <span className="sw-mkt-info-val" style={{ color:'var(--green)' }}>+{caSig.tp_pct}%</span>
                  </div>
                )}
                {(caSig.sl_pct ?? 0) > 0 && (
                  <div className="sw-mkt-info-row">
                    <span className="sw-mkt-info-key">STOP LOSS</span>
                    <span className="sw-mkt-info-val" style={{ color:'var(--red)' }}>−{caSig.sl_pct}%</span>
                  </div>
                )}
                <div style={{ padding:'8px 10px', fontSize:8, color:'var(--text3)', lineHeight:1.6, borderTop:'1px solid var(--border)' }}>
                  {caSig.reasoning}
                </div>
              </div>
            )}

            {indLoading && (
              <div style={{ padding:'12px', fontSize:8, color:'var(--text3)', letterSpacing:2, fontFamily:'var(--mono)', textAlign:'center' }}>
                ⟳ INDICATORI...
              </div>
            )}
            {!indLoading && indicators?.rsi != null && (
              <div className="sw-mkt-detail-panel">
                <div className="sw-mkt-panel-hdr">◈ INDICATORI</div>
                {([
                  ['RSI (14)',
                    `${indicators.rsi.toFixed(1)} — ${indicators.rsi > 70 ? 'OVERBOUGHT' : indicators.rsi < 30 ? 'OVERSOLD' : 'NEUTRO'}`,
                    indicators.rsi > 70 ? 'var(--red)' : indicators.rsi < 30 ? 'var(--green)' : 'var(--text2)'],
                  ['MACD',
                    `${(indicators.macd ?? 0) > 0 ? '+' : ''}${(indicators.macd ?? 0).toFixed(3)}`,
                    (indicators.macd ?? 0) > 0 ? 'var(--green)' : 'var(--red)'],
                  ...((indicators.bb_mid ?? 0) > 0 ? [
                    ['BB UPPER', (indicators.bb_upper ?? 0).toFixed(caDec), 'var(--red)'],
                    ['BB MID',   (indicators.bb_mid   ?? 0).toFixed(caDec), 'var(--text2)'],
                    ['BB LOWER', (indicators.bb_lower ?? 0).toFixed(caDec), 'var(--green)'],
                  ] : []),
                ] as Array<[string, string, string]>).map(([k, v, c]) => (
                  <div key={k} className="sw-mkt-info-row">
                    <span className="sw-mkt-info-key">{k}</span>
                    <span className="sw-mkt-info-val" style={{ color:c }}>{v}</span>
                  </div>
                ))}
                <div style={{ padding:'6px 10px 8px', borderTop:'1px solid var(--border)' }}>
                  <div style={{ height:4, background:'var(--bg4)', borderRadius:3, position:'relative', overflow:'hidden' }}>
                    <div style={{
                      position:'absolute', left:0, width:`${Math.min(100, indicators.rsi)}%`, height:'100%', borderRadius:3,
                      background: indicators.rsi > 70 ? 'var(--red)' : indicators.rsi < 30 ? 'var(--green)' : 'var(--cyan)',
                      opacity:0.85, transition:'width 0.4s ease',
                    }} />
                    <div style={{ position:'absolute', left:'30%', top:0, bottom:0, width:1, background:'rgba(255,255,255,0.15)' }} />
                    <div style={{ position:'absolute', left:'70%', top:0, bottom:0, width:1, background:'rgba(255,255,255,0.15)' }} />
                  </div>
                </div>
              </div>
            )}

            {caPriceD?.price != null && (() => {
              const lvls = calcGann(caPriceD.price);
              if (!lvls.length) return null;
              return (
                <div className="sw-mkt-detail-panel">
                  <div className="sw-mkt-panel-hdr">◈ GANN ANGLES</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr' }}>
                    {lvls.slice(0, 6).map((g, i) => (
                      <div key={i} style={{
                        padding:'5px 10px',
                        borderBottom:'1px solid var(--border)',
                        borderRight: i % 2 === 0 ? '1px solid var(--border)' : 'none',
                        fontSize:8, fontFamily:'var(--mono)',
                      }}>
                        <div style={{ color:'var(--text3)', fontSize:7, letterSpacing:1.5, marginBottom:1 }}>{g.label}</div>
                        <div style={{ color:'var(--purple)', fontWeight:700 }}>
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

  // ── VISTA LISTA ────────────────────────────────────────────────────
  return (
    <div className="sw-market-root">

      {/* TOP BAR */}
      <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        <div className="sw-cat-tabs">
          {CATEGORIES.map(c => (
            <button key={c} type="button"
              className={`sw-cat-tab${category === c ? ' active' : ''}`}
              onClick={() => setCategory(c)}
            >{CAT_LABELS[c]}</button>
          ))}
        </div>
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <span style={{ fontSize:8, color:'var(--text3)', letterSpacing:2, fontFamily:'var(--mono)' }}>FEAR&GREED</span>
            <span style={{ fontSize:14, fontWeight:700, color:fgColor(fearGreed?.value ?? null), fontFamily:'var(--mono)' }}>{fearGreed?.value ?? '—'}</span>
            <span style={{ fontSize:9, color:'var(--text3)', fontFamily:'var(--mono)' }}>{fearGreed?.label ?? ''}</span>
          </div>
          {lastUpdate !== null && (
            <span style={{ fontSize:8, color:'var(--text3)', fontFamily:'var(--mono)', letterSpacing:1 }}>
              ↻ {fmtTime(lastUpdate)}
            </span>
          )}
        </div>
      </div>

      {/* BODY */}
      <div className="sw-market-body">

        {/* LEFT — LISTA */}
        <div className="sw-mkt-list-col">
          <div className="sw-mkt-list-header">
            <span style={{ flex:'0 0 24px' }} />
            <span style={{ flex:'0 0 110px' }}>SIMBOLO</span>
            <span style={{ flex:1, textAlign:'right' }}>PREZZO</span>
            <span style={{ flex:'0 0 78px', textAlign:'right' }}>24H %</span>
            <span style={{ flex:'0 0 56px', textAlign:'center' }}>BIAS</span>
            <span style={{ flex:'0 0 68px', textAlign:'center' }}>AI</span>
            <span style={{ flex:'0 0 30px' }} />
          </div>

          <div className="sw-mkt-list-body">
            {filteredAssets.map(a => {
              const pd         = prices[a.id];
              const dec        = getDecimals(a);
              const cachedSig  = signals[a.id];
              const isSelected = selectedAsset.id === a.id;
              const biasThr    = a.category === 'crypto' ? 3 : a.category === 'forex' ? 0.3 : 0.8;
              const bias       = !pd?.chg ? null : pd.chg >= biasThr ? 'BULL' : pd.chg <= -biasThr ? 'BEAR' : 'NEUT';
              const biasColor  = bias === 'BULL' ? 'var(--green)' : bias === 'BEAR' ? 'var(--red)' : 'var(--text3)';
              return (
                <div
                  key={a.id}
                  className={`sw-mkt-row${isSelected ? ' selected' : ''}`}
                  onClick={() => setSelectedAsset(a)}
                >
                  <div style={{ flex:'0 0 24px' }}>
                    <div style={{
                      width:6, height:6, borderRadius:'50%', background:a.color,
                      boxShadow: isSelected ? `0 0 6px ${a.color}` : 'none',
                    }} />
                  </div>

                  <div style={{ flex:'0 0 110px', minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                      <span style={{
                        fontSize:8, color:a.color, fontWeight:700,
                        background:`${a.color}18`, padding:'1px 4px',
                        borderRadius:2, fontFamily:'var(--mono)',
                        minWidth:18, textAlign:'center', flexShrink:0,
                      }}>{a.icon}</span>
                      <span style={{
                        fontSize:10, fontWeight:700, letterSpacing:0.5,
                        color: isSelected ? 'var(--text1)' : 'var(--text)',
                        whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                      }}>{a.label}</span>
                    </div>
                    <div style={{ fontSize:7, color:'var(--text3)', letterSpacing:1.5, marginTop:1, fontFamily:'var(--sans)', fontWeight:700 }}>
                      {a.category.toUpperCase()}
                    </div>
                  </div>

                  <div style={{ flex:1, textAlign:'right' }}>
                    {pd?.price != null
                      ? <span style={{ fontSize:11, fontWeight:700, color:'var(--text1)', fontFamily:'var(--mono)' }}>
                          {pd.price.toLocaleString('en-US', { minimumFractionDigits:dec, maximumFractionDigits:dec })}
                        </span>
                      : <span style={{ fontSize:9, color:'var(--text3)' }}>—</span>
                    }
                  </div>

                  <div style={{ flex:'0 0 78px', textAlign:'right' }}>
                    {pd?.chg != null
                      ? <span style={{ fontSize:10, fontWeight:700, fontFamily:'var(--mono)', color: pd.chg >= 0 ? 'var(--green)' : 'var(--red)' }}>
                          {pd.chg >= 0 ? '▲' : '▼'}{Math.abs(pd.chg).toFixed(2)}%
                        </span>
                      : <span style={{ fontSize:9, color:'var(--text3)' }}>—</span>
                    }
                  </div>

                  <div style={{ flex:'0 0 56px', textAlign:'center' }}>
                    {bias
                      ? <span style={{ fontSize:8, fontWeight:700, color:biasColor, letterSpacing:0.5, fontFamily:'var(--mono)' }}>{bias}</span>
                      : <span style={{ fontSize:8, color:'var(--text3)' }}>—</span>
                    }
                  </div>

                  <div style={{ flex:'0 0 68px', textAlign:'center' }}>
                    {cachedSig
                      ? <span style={{
                          fontSize:9, fontWeight:700, fontFamily:'var(--mono)', letterSpacing:0.5,
                          color: sigColor(cachedSig.signal),
                          background: sigBg(cachedSig.signal),
                          border:`1px solid ${sigBorder(cachedSig.signal)}`,
                          padding:'2px 6px', borderRadius:2,
                        }}>{cachedSig.signal}</span>
                      : <span style={{ fontSize:8, color:'var(--text3)' }}>—</span>
                    }
                  </div>

                  <div style={{ flex:'0 0 30px', textAlign:'center' }}>
                    <span
                      title="Apri grafico"
                      style={{
                        fontSize:11, cursor:'pointer', opacity:0.55,
                        transition:'opacity 0.15s',
                        color: isSelected ? a.color : 'var(--text3)',
                      }}
                      onClick={e => { e.stopPropagation(); setChartAsset(a); }}
                    >▶</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT — DETTAGLIO */}
        <div className="sw-mkt-detail-col">
          <div className="sw-mkt-detail-hdr">
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{
                width:34, height:34, borderRadius:6, flexShrink:0,
                background:`${selectedAsset.color}18`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:14, fontWeight:700, color:selectedAsset.color,
              }}>{selectedAsset.icon}</div>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--text1)', letterSpacing:1, fontFamily:'var(--sans)' }}>{selectedAsset.label}</div>
                {priceD?.price != null
                  ? <div style={{ fontSize:11, fontWeight:600, fontFamily:'var(--mono)', color:(priceD.chg ?? 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {priceD.price.toLocaleString('en-US', { minimumFractionDigits:decimals, maximumFractionDigits:decimals })}
                      &nbsp;{(priceD.chg ?? 0) >= 0 ? '▲' : '▼'}{Math.abs(priceD.chg ?? 0).toFixed(2)}%
                    </div>
                  : <div style={{ fontSize:9, color:'var(--text3)', fontFamily:'var(--mono)' }}>Caricamento...</div>
                }
              </div>
            </div>
            <button type="button"
              onClick={handleAnalyze}
              disabled={analyzing || !indicators}
              style={{
                padding:'7px 12px', borderRadius:4, flexShrink:0,
                border:`1px solid ${(analyzing || !indicators) ? 'var(--border)' : 'var(--cyan)'}`,
                background: analyzing ? 'transparent' : 'rgba(94,234,212,0.06)',
                color: (analyzing || !indicators) ? 'var(--text3)' : 'var(--cyan)',
                fontFamily:'var(--mono)', fontSize:9, fontWeight:700, letterSpacing:1.5,
                cursor:(analyzing || !indicators) ? 'not-allowed' : 'pointer',
                transition:'all 0.15s', opacity: !indicators && !analyzing ? 0.4 : 1,
              }}
            >{analyzing ? '⟳ ANALISI...' : '🤖 AI SIGNAL'}</button>
          </div>

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
              {(signal.tp_pct ?? 0) > 0 && (
                <div className="sw-mkt-info-row">
                  <span className="sw-mkt-info-key">TAKE PROFIT</span>
                  <span className="sw-mkt-info-val" style={{ color:'var(--green)' }}>+{signal.tp_pct}%</span>
                </div>
              )}
              {(signal.sl_pct ?? 0) > 0 && (
                <div className="sw-mkt-info-row">
                  <span className="sw-mkt-info-key">STOP LOSS</span>
                  <span className="sw-mkt-info-val" style={{ color:'var(--red)' }}>−{signal.sl_pct}%</span>
                </div>
              )}
              <div style={{ padding:'8px 12px', fontSize:9, color:'var(--text3)', lineHeight:1.6, borderTop:'1px solid var(--border)' }}>
                {signal.reasoning}
              </div>
            </div>
          )}

          {indLoading && (
            <div style={{ padding:'16px 12px', fontSize:9, color:'var(--text3)', letterSpacing:2, fontFamily:'var(--mono)', textAlign:'center' }}>
              ⟳ CARICAMENTO INDICATORI...
            </div>
          )}
          {!indLoading && indicators?.rsi != null && (
            <div className="sw-mkt-detail-panel">
              <div className="sw-mkt-panel-hdr">◈ INDICATORI TECNICI</div>
              {([
                ['RSI (14)',
                  `${indicators.rsi.toFixed(1)} — ${indicators.rsi > 70 ? 'OVERBOUGHT' : indicators.rsi < 30 ? 'OVERSOLD' : 'NEUTRO'}`,
                  indicators.rsi > 70 ? 'var(--red)' : indicators.rsi < 30 ? 'var(--green)' : 'var(--text2)'],
                ['MACD',
                  `${(indicators.macd ?? 0) > 0 ? '+' : ''}${(indicators.macd ?? 0).toFixed(3)}`,
                  (indicators.macd ?? 0) > 0 ? 'var(--green)' : 'var(--red)'],
                ['SIGNAL LINE',
                  indicators.signal != null ? indicators.signal.toFixed(3) : '—',
                  'var(--text)'],
                ...((indicators.bb_mid ?? 0) > 0 ? [
                  ['BB UPPER', (indicators.bb_upper ?? 0).toFixed(decimals), 'var(--red)'],
                  ['BB MID',   (indicators.bb_mid   ?? 0).toFixed(decimals), 'var(--text2)'],
                  ['BB LOWER', (indicators.bb_lower ?? 0).toFixed(decimals), 'var(--green)'],
                ] : []),
              ] as Array<[string, string, string]>).map(([k, v, c]) => (
                <div key={k} className="sw-mkt-info-row">
                  <span className="sw-mkt-info-key">{k}</span>
                  <span className="sw-mkt-info-val" style={{ color:c }}>{v}</span>
                </div>
              ))}
              <div style={{ padding:'8px 12px 10px', borderTop:'1px solid var(--border)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:7, color:'var(--text3)', marginBottom:4, fontFamily:'var(--mono)', letterSpacing:0.5 }}>
                  <span>0</span><span>OVERSOLD 30</span><span>50</span><span>70 OVERBOUGHT</span><span>100</span>
                </div>
                <div style={{ height:5, background:'var(--bg4)', borderRadius:3, position:'relative', overflow:'hidden' }}>
                  <div style={{
                    position:'absolute', left:0, width:`${Math.min(100, indicators.rsi)}%`, height:'100%', borderRadius:3,
                    background: indicators.rsi > 70 ? 'var(--red)' : indicators.rsi < 30 ? 'var(--green)' : 'var(--cyan)',
                    opacity:0.85, transition:'width 0.4s ease',
                  }} />
                  <div style={{ position:'absolute', left:'30%', top:0, bottom:0, width:1, background:'rgba(255,255,255,0.15)' }} />
                  <div style={{ position:'absolute', left:'70%', top:0, bottom:0, width:1, background:'rgba(255,255,255,0.15)' }} />
                </div>
              </div>
            </div>
          )}

          {priceD?.price != null && (() => {
            const lvls = calcGann(priceD.price);
            if (!lvls.length) return null;
            return (
              <div className="sw-mkt-detail-panel">
                <div className="sw-mkt-panel-hdr">◈ GANN ANGLES</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr' }}>
                  {lvls.slice(0, 8).map((g, i) => (
                    <div key={i} style={{
                      padding:'6px 12px',
                      borderBottom:'1px solid var(--border)',
                      borderRight: i % 2 === 0 ? '1px solid var(--border)' : 'none',
                      fontSize:9, fontFamily:'var(--mono)',
                    }}>
                      <div style={{ color:'var(--text3)', fontSize:7, letterSpacing:1.5, marginBottom:1 }}>{g.label}</div>
                      <div style={{ color:'var(--purple)', fontWeight:700 }}>
                        {g.val >= 1 ? g.val.toFixed(2) : g.val.toFixed(4)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {Object.keys(signals).length > 1 && (
            <div className="sw-mkt-detail-panel">
              <div className="sw-mkt-panel-hdr">◈ SEGNALI ANALIZZATI ({Object.keys(signals).length})</div>
              {Object.entries(signals).map(([id, s]) => {
                const a = ASSETS.find(x => x.id === id);
                if (!a) return null;
                return (
                  <div key={id} className="sw-mkt-info-row" style={{ cursor:'pointer' }}
                    onClick={() => setSelectedAsset(a)}>
                    <span className="sw-mkt-info-key" style={{ color:a.color }}>{a.label}</span>
                    <span style={{
                      fontSize:9, fontWeight:700, fontFamily:'var(--mono)',
                      color:sigColor(s.signal), background:sigBg(s.signal),
                      border:`1px solid ${sigBorder(s.signal)}`,
                      padding:'2px 7px', borderRadius:2,
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
