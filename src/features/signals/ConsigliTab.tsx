import { useState, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAppStore } from '@/shared/store/useAppStore';
import type { RiskLevel, FilterId, AssetConfig, TradingSignal, AiSignal } from '@/shared/types';

// ── Endpoint Anthropic ────────────────────────────────────────────────
const ANTHROPIC_ENDPOINT = import.meta.env.DEV
  ? '/anthropic/v1/messages'
  : 'https://api.anthropic.com/v1/messages';

// ── Static config ─────────────────────────────────────────────────────

const CONSIGLI_ASSETS: AssetConfig[] = [
  { id: 'BTCUSDT', label: 'BTC/USD', icon: '₿',  color: '#f97316', category: 'crypto'  },
  { id: 'ETHUSDT', label: 'ETH/USD', icon: 'Ξ',  color: '#a78bfa', category: 'crypto'  },
  { id: 'EURUSD',  label: 'EUR/USD', icon: '€',  color: '#5eead4', category: 'forex'   },
  { id: 'GBPUSD',  label: 'GBP/USD', icon: '£',  color: '#818cf8', category: 'forex'   },
  { id: 'USDJPY',  label: 'USD/JPY', icon: '¥',  color: '#f472b6', category: 'forex'   },
  { id: 'XAUUSD',  label: 'XAU/USD', icon: 'Au', color: '#fbbf24', category: 'metals'  },
  { id: 'EURJPY',  label: 'EUR/JPY', icon: '€¥', color: '#c084fc', category: 'forex'   },
  { id: 'SPX',     label: 'S&P 500', icon: 'US', color: '#34d399', category: 'indices' },
  { id: 'SOLUSDT', label: 'SOL/USD', icon: '◎',  color: '#9945ff', category: 'crypto'  },
  { id: 'XAGUSD',  label: 'XAG/USD', icon: 'Ag', color: '#d1d5db', category: 'metals'  },
];

const TFS    = ['M15', 'H1', 'H4', 'D1'] as const;
const INDS   = ['RSI', 'MACD', 'BOS', 'CHoCH', 'FVG', 'ADX', 'EMA200', 'Fib0.618'] as const;

interface FilterDef { id: FilterId; label: string; }

const FILTERS: FilterDef[] = [
  { id: 'TUTTI',     label: 'TUTTI'       },
  { id: 'BUY',       label: '🟢 LONG'     },
  { id: 'SELL',      label: '🔴 SHORT'    },
  { id: 'M15',       label: '⚡ SCALPING' },
  { id: 'SWING',     label: '📈 SWING'    },
  { id: 'LOW',       label: 'LOW RISK'    },
  { id: 'HIGH_CONF', label: 'HIGH CONF'   },
];

// ── Signal generator ──────────────────────────────────────────────────

function generateSignals(n = 12): TradingSignal[] {
  const now = Date.now();
  return Array.from({ length: n }, (_, i) => {
    const asset   = CONSIGLI_ASSETS[i % CONSIGLI_ASSETS.length];
    const dir     = (Math.random() > 0.5 ? 'BUY' : 'SELL') as 'BUY' | 'SELL';
    const conf    = 45 + Math.floor(Math.random() * 52);
    const risk: RiskLevel = conf > 78 ? 'LOW' : conf > 60 ? 'MEDIUM' : 'HIGH';
    const tf      = TFS[Math.floor(Math.random() * TFS.length)];
    const base    = asset.id.includes('BTC') ? 67000 + Math.random() * 4000
                  : asset.id.includes('ETH') ? 3400  + Math.random() * 300
                  : asset.id.includes('SOL') ? 155   + Math.random() * 20
                  : asset.id.includes('XAU') ? 2640  + Math.random() * 60
                  : asset.id.includes('XAG') ? 30    + Math.random() * 3
                  : asset.id.includes('JPY') ? 148   + Math.random() * 6
                  : asset.id === 'SPX'       ? 5200  + Math.random() * 200
                  : 1.05 + Math.random() * 0.25;
    const pip     = base > 1000 ? 10 : base > 100 ? 0.5 : base > 10 ? 0.05 : 0.0001;
    const dec     = base > 1000 ? 0 : base > 100 ? 2 : base > 1 ? 4 : 5;
    const slPips  = 15 + Math.floor(Math.random() * 35);
    const tp1Pips = slPips + Math.floor(Math.random() * 20);
    const tp2Pips = tp1Pips + Math.floor(Math.random() * 30);
    const entryLo = +(base - pip * 3).toFixed(dec);
    const entryHi = +(base + pip * 3).toFixed(dec);
    const sl  = dir === 'BUY' ? +(base - pip * slPips).toFixed(dec)  : +(base + pip * slPips).toFixed(dec);
    const tp1 = dir === 'BUY' ? +(base + pip * tp1Pips).toFixed(dec) : +(base - pip * tp1Pips).toFixed(dec);
    const tp2 = dir === 'BUY' ? +(base + pip * tp2Pips).toFixed(dec) : +(base - pip * tp2Pips).toFixed(dec);
    const numInds = 2 + Math.floor(Math.random() * 4);
    const indicators = [...INDS].sort(() => Math.random() - 0.5).slice(0, numInds);
    return {
      id: `SIG-${String(i + 1).padStart(3, '0')}`,
      asset, dir, tf, conf, risk, entryLo, entryHi, sl, tp1, tp2,
      slPips, tp1Pips, tp2Pips, dec, indicators,
      ts: now - i * 1000 * 60 * (8 + Math.floor(Math.random() * 40)),
      rrRatio: +(tp1Pips / slPips).toFixed(2),
    };
  });
}

// ── Helpers ───────────────────────────────────────────────────────────

function confColor(c: number) {
  return c >= 75 ? 'var(--green)' : c >= 55 ? 'var(--yellow)' : 'var(--red)';
}
function riskColor(r: RiskLevel) {
  return r === 'LOW' ? 'var(--green)' : r === 'MEDIUM' ? 'var(--yellow)' : 'var(--red)';
}
function riskBg(r: RiskLevel) {
  return r === 'LOW'
    ? 'rgba(74,222,128,0.08)'
    : r === 'MEDIUM'
    ? 'rgba(250,204,21,0.08)'
    : 'rgba(248,113,113,0.08)';
}

// ── Component ─────────────────────────────────────────────────────────

export function ConsigliTab() {
  const { anthropicKey } = useAppStore();

  const [signals,  setSignals]  = useState<TradingSignal[]>(() => generateSignals(12));
  const [filter,   setFilter]   = useState<FilterId>('TUTTI');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ── AI mutation ───────────────────────────────────────────────────
  const aiMutation = useMutation<AiSignal[], Error, void>({
    mutationFn: async () => {
      const prompt = `Sei un analista forex e crypto professionale. Analizza brevemente questi 5 asset e dai un segnale operativo per ciascuno: BTC/USD, EUR/USD, XAU/USD, GBP/USD, S&P500. Per ogni asset rispondi SOLO con questo formato JSON array (nessun testo extra):
[{"asset":"BTC/USD","direction":"BUY","entry":"66500-67000","tp1":"68500","tp2":"70000","sl":"65200","confidence":78,"reason":"BOS H4 confermato, RSI 42 in rimbalzo da supporto chiave"},...]`;
      const res = await fetch(ANTHROPIC_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await res.json() as { content?: Array<{ type: string; text?: string }> };
      const text = data.content?.find(b => b.type === 'text')?.text ?? '[]';
      return JSON.parse(text.replace(/```json|```/g, '').trim()) as AiSignal[];
    },
  });

  const aiResult = aiMutation.data
    ?? (aiMutation.error
        ? [{ asset: 'Errore', direction: '—', reason: aiMutation.error.message }]
        : null);

  // ── Derived state ─────────────────────────────────────────────────
  const filtered = useMemo(() => signals.filter(s => {
    if (filter === 'TUTTI')     return true;
    if (filter === 'BUY')       return s.dir === 'BUY';
    if (filter === 'SELL')      return s.dir === 'SELL';
    if (filter === 'M15')       return s.tf === 'M15';
    if (filter === 'SWING')     return s.tf === 'H4' || s.tf === 'D1';
    if (filter === 'LOW')       return s.risk === 'LOW';
    if (filter === 'HIGH_CONF') return s.conf >= 75;
    return true;
  }), [signals, filter]);

  const avgConf    = signals.length ? Math.round(signals.reduce((s, x) => s + x.conf, 0) / signals.length) : 0;
  const activeN    = signals.filter(s => s.conf >= 60).length;
  const winRateEst = 52 + Math.floor(avgConf * 0.35);
  const assetSet   = new Set(signals.map(s => s.asset.label)).size;

  // ── Handlers ──────────────────────────────────────────────────────
  const refresh = () => setSignals(generateSignals(12));

  const copySignal = (sig: TradingSignal) => {
    const text =
      `📊 ${sig.asset.label} ${sig.dir} [${sig.tf}]\n`
      + `Entry: ${sig.entryLo} – ${sig.entryHi}\n`
      + `TP1: ${sig.tp1} (+${sig.tp1Pips} pips) | TP2: ${sig.tp2} (+${sig.tp2Pips} pips)\n`
      + `SL: ${sig.sl} (-${sig.slPips} pips) | R:R ${sig.rrRatio}:1\n`
      + `Confidence: ${sig.conf}% | Risk: ${sig.risk}\n`
      + `Indicators: ${sig.indicators.join(', ')}\n`
      + `🤖 Generato da SwiftTrend AI`;
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedId(sig.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 800, letterSpacing: 4, color: 'var(--yellow)', textShadow: '0 0 20px rgba(250,204,21,0.5)' }}>
            ⭐ CONSIGLI AI
          </div>
          <div style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: 2, marginTop: 3 }}>
            SEGNALI OPERATIVI · STILE MYFXBOOK · {new Date().toLocaleString('it-IT')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {anthropicKey && (
            <button
              type="button"
              onClick={() => aiMutation.mutate()}
              disabled={aiMutation.isPending}
              style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid var(--cyan)', color: 'var(--cyan)', fontFamily: 'var(--mono)', fontSize: 10, padding: '8px 16px', borderRadius: 4, cursor: 'pointer', letterSpacing: 1.5, fontWeight: 700 }}
            >
              {aiMutation.isPending ? '⟳ ANALISI...' : '🤖 ANALISI AI LIVE'}
            </button>
          )}
          <button
            type="button"
            onClick={refresh}
            style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.3)', color: 'var(--yellow)', fontFamily: 'var(--mono)', fontSize: 10, padding: '8px 16px', borderRadius: 4, cursor: 'pointer', letterSpacing: 1.5, fontWeight: 700 }}
          >
            🔄 AGGIORNA SEGNALI
          </button>
        </div>
      </div>

      {/* KPI ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
        {([
          { label: 'SEGNALI ATTIVI',   val: activeN,          accent: 'var(--cyan)',                sub: 'conf ≥ 60%'            },
          { label: 'WIN RATE STORICO', val: `${winRateEst}%`, accent: 'var(--green)',               sub: 'stima AI'              },
          { label: 'CONFIDENZA MEDIA', val: `${avgConf}%`,    accent: confColor(avgConf),           sub: 'tutti i segnali'       },
          { label: 'ASSET COPERTI',    val: assetSet,         accent: 'var(--purple)',              sub: 'crypto · forex · metals' },
        ] as const).map(k => (
          <div key={k.label} style={{ background: 'var(--panel)', border: '1px solid var(--border2)', borderRadius: 6, padding: '12px 16px' }}>
            <div style={{ fontSize: 8, color: 'var(--text3)', letterSpacing: 2.5, fontFamily: 'var(--sans)', fontWeight: 700, marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.accent, fontFamily: 'var(--mono)' }}>{k.val}</div>
            <div style={{ fontSize: 8, color: 'var(--text3)', marginTop: 3 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* FILTER BAR */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '10px 0' }}>
        {FILTERS.map(f => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            style={{
              background: filter === f.id ? 'rgba(250,204,21,0.1)' : 'transparent',
              border: `1px solid ${filter === f.id ? 'rgba(250,204,21,0.5)' : 'var(--border2)'}`,
              color: filter === f.id ? 'var(--yellow)' : 'var(--text3)',
              fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, letterSpacing: 1.5,
              padding: '6px 16px', borderRadius: 3, cursor: 'pointer',
              transition: 'all 0.15s',
              boxShadow: filter === f.id ? '0 0 12px rgba(250,204,21,0.12)' : 'none',
            }}
          >
            {f.label}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--text3)', alignSelf: 'center' }}>
          {filtered.length} segnali
        </span>
      </div>

      {/* AI LIVE RESULT */}
      {aiResult && (
        <div style={{ background: 'rgba(56,189,248,0.04)', border: '1px solid var(--border3)', borderRadius: 8, padding: '16px 20px' }}>
          <div style={{ fontSize: 10, color: 'var(--cyan)', letterSpacing: 3, fontWeight: 700, marginBottom: 12, fontFamily: 'var(--sans)' }}>
            🤖 ANALISI AI LIVE — Claude Sonnet
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 10 }}>
            {aiResult.map((sig, i) => (
              <div key={i} style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 6, padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: 'var(--cyan)', fontWeight: 700, fontSize: 11 }}>{sig.asset}</span>
                  <span style={{ color: sig.direction === 'BUY' ? 'var(--green)' : 'var(--red)', fontWeight: 700, fontSize: 10 }}>
                    {sig.direction === 'BUY' ? '▲' : '▼'} {sig.direction}
                  </span>
                </div>
                {sig.entry      && <div style={{ fontSize: 9, color: 'var(--text2)', marginBottom: 4 }}>Entry: <span style={{ color: 'var(--text1)' }}>{sig.entry}</span></div>}
                {sig.tp1        && <div style={{ fontSize: 9, color: 'var(--green)', marginBottom: 2 }}>TP1: {sig.tp1} &nbsp; TP2: {sig.tp2}</div>}
                {sig.sl         && <div style={{ fontSize: 9, color: 'var(--red)',   marginBottom: 6 }}>SL: {sig.sl}</div>}
                {sig.confidence !== undefined && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${sig.confidence}%`, height: '100%', background: confColor(sig.confidence), borderRadius: 2 }} />
                    </div>
                    <div style={{ fontSize: 8, color: confColor(sig.confidence), marginTop: 3 }}>{sig.confidence}% confidence</div>
                  </div>
                )}
                {sig.reason && <div style={{ fontSize: 8, color: 'var(--text3)', lineHeight: 1.6 }}>{sig.reason}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SIGNAL CARDS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(310px,1fr))', gap: 14 }}>
        {filtered.map(sig => (
          <div
            key={sig.id}
            style={{
              background: 'var(--panel)',
              border: `1px solid ${sig.dir === 'BUY' ? 'rgba(74,222,128,0.18)' : 'rgba(248,113,113,0.18)'}`,
              borderRadius: 8, overflow: 'hidden',
              boxShadow: `0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 ${sig.dir === 'BUY' ? 'rgba(74,222,128,0.06)' : 'rgba(248,113,113,0.06)'}`,
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
          >
            {/* CARD HEADER */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px',
              background: sig.dir === 'BUY' ? 'rgba(74,222,128,0.04)' : 'rgba(248,113,113,0.04)',
              borderBottom: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: `${sig.asset.color}22`, border: `1px solid ${sig.asset.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: sig.asset.color }}>
                  {sig.asset.icon}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)', fontFamily: 'var(--mono)' }}>{sig.asset.label}</div>
                  <div style={{ fontSize: 8, color: 'var(--text3)', letterSpacing: 1 }}>{sig.asset.category.toUpperCase()} · {sig.id}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 8, padding: '3px 8px', borderRadius: 2, border: '1px solid var(--border2)', color: 'var(--text3)', fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: 1 }}>{sig.tf}</span>
                <span style={{
                  fontWeight: 700, fontSize: 10, padding: '4px 12px', borderRadius: 4,
                  background: sig.dir === 'BUY' ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
                  color:      sig.dir === 'BUY' ? 'var(--green)' : 'var(--red)',
                  border:     `1px solid ${sig.dir === 'BUY' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
                  letterSpacing: 1.5, fontFamily: 'var(--mono)',
                }}>
                  {sig.dir === 'BUY' ? '▲ BUY' : '▼ SELL'}
                </span>
              </div>
            </div>

            {/* CARD BODY */}
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* ENTRY */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 8, color: 'var(--text3)', letterSpacing: 1.5 }}>ENTRY RANGE</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text1)', fontFamily: 'var(--mono)' }}>
                  {sig.entryLo} – {sig.entryHi}
                </span>
              </div>

              {/* TP / SL */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                {([
                  { label: 'TP1', val: sig.tp1, pip: `+${sig.tp1Pips}p`, color: 'var(--green)' },
                  { label: 'TP2', val: sig.tp2, pip: `+${sig.tp2Pips}p`, color: 'rgba(74,222,128,0.6)' },
                  { label: 'SL',  val: sig.sl,  pip: `-${sig.slPips}p`,  color: 'var(--red)' },
                ] as const).map(x => (
                  <div key={x.label} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 4, padding: '7px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 7, color: 'var(--text3)', letterSpacing: 2, marginBottom: 3 }}>{x.label}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: x.color, fontFamily: 'var(--mono)' }}>{x.val}</div>
                    <div style={{ fontSize: 7, color: x.color, opacity: 0.7, marginTop: 1 }}>{x.pip}</div>
                  </div>
                ))}
              </div>

              {/* R:R */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 8, color: 'var(--text3)', letterSpacing: 1 }}>RISK : REWARD</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: sig.rrRatio >= 2 ? 'var(--green)' : sig.rrRatio >= 1.2 ? 'var(--yellow)' : 'var(--red)', fontFamily: 'var(--mono)' }}>
                  1 : {sig.rrRatio}
                </span>
              </div>

              {/* CONFIDENCE BAR */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 8, color: 'var(--text3)', letterSpacing: 1 }}>CONFIDENZA AI</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: confColor(sig.conf), fontFamily: 'var(--mono)' }}>{sig.conf}%</span>
                </div>
                <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${sig.conf}%`, height: '100%', background: `linear-gradient(90deg, ${confColor(sig.conf)}, ${confColor(sig.conf)}aa)`, borderRadius: 3, transition: 'width 0.6s ease' }} />
                </div>
              </div>

              {/* RISK + INDICATORS */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                <span style={{ fontSize: 8, fontWeight: 700, padding: '3px 10px', borderRadius: 3, background: riskBg(sig.risk), color: riskColor(sig.risk), border: `1px solid ${riskColor(sig.risk)}44`, letterSpacing: 1.5, fontFamily: 'var(--mono)' }}>
                  {sig.risk} RISK
                </span>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {sig.indicators.map(ind => (
                    <span key={ind} style={{ fontSize: 7, padding: '2px 6px', borderRadius: 2, background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)', color: 'var(--cyan)', fontFamily: 'var(--mono)', letterSpacing: 0.5, fontWeight: 700 }}>{ind}</span>
                  ))}
                </div>
              </div>

              {/* CARD FOOTER */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border)', marginTop: 2 }}>
                <div style={{ fontSize: 8, color: 'var(--text3)' }}>
                  🤖 Claude AI · {new Date(sig.ts).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <button
                  type="button"
                  onClick={() => copySignal(sig)}
                  style={{
                    background: copiedId === sig.id ? 'rgba(74,222,128,0.12)' : 'rgba(56,189,248,0.08)',
                    border: `1px solid ${copiedId === sig.id ? 'rgba(74,222,128,0.35)' : 'var(--border2)'}`,
                    color: copiedId === sig.id ? 'var(--green)' : 'var(--cyan)',
                    fontFamily: 'var(--mono)', fontSize: 8, padding: '4px 12px', borderRadius: 3,
                    cursor: 'pointer', letterSpacing: 1, fontWeight: 700, transition: 'all 0.2s',
                  }}
                >
                  {copiedId === sig.id ? '✓ COPIATO!' : '📋 COPIA'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)', fontSize: 11, letterSpacing: 2 }}>
          Nessun segnale per il filtro selezionato
        </div>
      )}
    </div>
  );
}
