import { memo } from 'react';
import type { Candle, ClaudeSignal } from '@/shared/types';
import { calcRSI, calcMACD, calcBB, calcFibLevels, calcGann } from '@/shared/utils/indicators';

// ── PRO CANDLE CHART ─────────────────────────────────────────────────

interface ProCandleChartProps {
  candles: Candle[];
  color: string;
  showFib?: boolean;
  showGann?: boolean;
  showBB?: boolean;
  signal?: ClaudeSignal | null;
  width?: number;
  height?: number;
}

export const ProCandleChart = memo(function ProCandleChart({
  candles, color, showFib = false, showGann = false, showBB = false,
  signal = null, width = 900, height = 300,
}: ProCandleChartProps) {
  if (!candles || candles.length < 5) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height, color:'var(--text3)', fontSize:10, letterSpacing:2 }}>
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
  const toX    = (i: number) => pad.l + (i / (candles.length - 1)) * W;
  const toY    = (v: number) => pad.t + H - ((v - minP) / range) * H;
  const cW     = Math.max(2, W / candles.length * 0.65);

  const bbData    = showBB   ? calcBB(closes)               : [];
  const fibLevels = showFib  ? calcFibLevels(maxP, minP)    : [];
  const gannLvls  = showGann ? calcGann(closes[closes.length - 1]) : [];

  const ticks = 6;
  const yLines = Array.from({ length: ticks + 1 }, (_, i) => {
    const v = minP + (range / ticks) * i;
    return { y: toY(v), v };
  });

  const xStep = Math.max(1, Math.floor(candles.length / 8));
  const xLabels = candles
    .map((c, i) => ({ i, ts: c.ts }))
    .filter((_, i) => i % xStep === 0 || i === candles.length - 1);

  const lastClose = closes[closes.length - 1];
  const tpPrice   = signal?.tp_pct ? lastClose * (1 + signal.tp_pct / 100) : null;
  const slPrice   = signal?.sl_pct ? lastClose * (1 - signal.sl_pct / 100) : null;

  const fibColors  = ['var(--yellow)','var(--go-half)','var(--purple)','var(--cyan2)','var(--red)','var(--green)','var(--text2)','var(--orange)','#be5046'];
  const gannColors = ['var(--purple)','#c792ea80','#9896f180','#9896f1','#c792ea80','var(--purple)','#9896f180','#9896f180'];

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display:'block', cursor:'crosshair' }}>
      <rect x={pad.l} y={pad.t} width={W} height={H} fill="transparent" />

      {yLines.map(({ y, v }) => (
        <g key={v}>
          <line x1={pad.l} y1={y} x2={pad.l + W} y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          <text x={pad.l + W + 4} y={y + 3} fontSize="7.5" fill="var(--text3)" fontFamily="var(--mono)" textAnchor="start">
            {v >= 1000 ? v.toFixed(0) : v >= 1 ? v.toFixed(2) : v.toFixed(4)}
          </text>
        </g>
      ))}

      {xLabels.map(({ i, ts }) => (
        <g key={i}>
          <line x1={toX(i)} y1={pad.t} x2={toX(i)} y2={pad.t + H} stroke="rgba(255,255,255,0.025)" strokeWidth="1" />
          <text x={toX(i)} y={height - 4} fontSize="7" fill="var(--text3)" fontFamily="var(--mono)" textAnchor="middle">
            {new Date(ts).toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit' })}
          </text>
        </g>
      ))}

      {showFib && fibLevels.map((f, i) => {
        const y = toY(f.price);
        if (y < pad.t || y > pad.t + H) return null;
        return (
          <g key={i}>
            <line x1={pad.l} y1={y} x2={pad.l + W} y2={y}
              stroke={fibColors[i]} strokeWidth="0.8" strokeDasharray={i === 0 || i === 6 ? 'none' : '4,3'} opacity="0.7" />
            <text x={pad.l + 3} y={y - 2} fontSize="7" fill={fibColors[i]} fontFamily="var(--mono)" opacity="0.9">
              {(f.pct * 100).toFixed(1)}%
            </text>
            <text x={pad.l + W - 2} y={y - 2} fontSize="7" fill={fibColors[i]} fontFamily="var(--mono)" textAnchor="end" opacity="0.9">
              {f.price >= 1 ? f.price.toFixed(2) : f.price.toFixed(4)}
            </text>
          </g>
        );
      })}

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

      {showBB && bbData.length > 1 && (() => {
        const bbOffset = closes.length - bbData.length;
        const ptsMid  = bbData.map((b, i) => `${toX(i + bbOffset)},${toY(b.mid)}`).join(' ');
        const ptsUp   = bbData.map((b, i) => `${toX(i + bbOffset)},${toY(b.upper)}`).join(' ');
        const ptsDn   = bbData.map((b, i) => `${toX(i + bbOffset)},${toY(b.lower)}`).join(' ');
        const areaTop = bbData.map((b, i) => `${toX(i + bbOffset)},${toY(b.upper)}`).join(' ');
        const areaBtm = bbData.map((b, i) => `${toX(i + bbOffset)},${toY(b.lower)}`).reverse().join(' ');
        return (
          <g>
            <polygon points={`${areaTop} ${areaBtm}`} fill="rgba(56,189,248,0.04)" />
            <polyline points={ptsUp}  fill="none" stroke="rgba(56,189,248,0.35)" strokeWidth="0.8" strokeDasharray="3,2" />
            <polyline points={ptsDn}  fill="none" stroke="rgba(56,189,248,0.35)" strokeWidth="0.8" strokeDasharray="3,2" />
            <polyline points={ptsMid} fill="none" stroke="rgba(56,189,248,0.2)"  strokeWidth="0.8" />
          </g>
        );
      })()}

      {candles.map((c, i) => {
        const x  = toX(i);
        const o  = toY(c.open);
        const cl = toY(c.close);
        const hi = toY(c.high);
        const lo = toY(c.low);
        const up = c.close >= c.open;
        const col = up ? 'var(--green)' : 'var(--red)';
        const bY  = Math.min(o, cl);
        const bH  = Math.max(Math.abs(o - cl), 1);
        return (
          <g key={i}>
            <line x1={x} y1={hi} x2={x} y2={lo} stroke={col} strokeWidth="0.9" opacity="0.7" />
            <rect x={x - cW / 2} y={bY} width={cW} height={bH}
              fill={up ? 'rgba(35,209,139,0.85)' : 'rgba(241,76,76,0.85)'}
              stroke={col} strokeWidth="0.4" rx="0.5" />
          </g>
        );
      })}

      {tpPrice !== null && toY(tpPrice) > pad.t && toY(tpPrice) < pad.t + H && (
        <g>
          <line x1={pad.l} y1={toY(tpPrice)} x2={pad.l + W} y2={toY(tpPrice)}
            stroke="var(--green)" strokeWidth="1.2" strokeDasharray="6,3" opacity="0.8" />
          <rect x={pad.l + W - 36} y={toY(tpPrice) - 8} width={34} height={11} rx="2" fill="rgba(35,209,139,0.15)" />
          <text x={pad.l + W - 19} y={toY(tpPrice) + 1} textAnchor="middle" fontSize="7.5" fill="var(--green)" fontFamily="var(--mono)" fontWeight="700">TP</text>
        </g>
      )}
      {slPrice !== null && toY(slPrice) > pad.t && toY(slPrice) < pad.t + H && (
        <g>
          <line x1={pad.l} y1={toY(slPrice)} x2={pad.l + W} y2={toY(slPrice)}
            stroke="var(--red)" strokeWidth="1.2" strokeDasharray="6,3" opacity="0.8" />
          <rect x={pad.l + W - 36} y={toY(slPrice) - 8} width={34} height={11} rx="2" fill="rgba(241,76,76,0.15)" />
          <text x={pad.l + W - 19} y={toY(slPrice) + 1} textAnchor="middle" fontSize="7.5" fill="var(--red)" fontFamily="var(--mono)" fontWeight="700">SL</text>
        </g>
      )}

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
});

// ── RSI PANEL ────────────────────────────────────────────────────────

interface PanelProps {
  candles: Candle[];
  width?: number;
  height?: number;
}

export const RSIPanel = memo(function RSIPanel({ candles, width = 900, height = 80 }: PanelProps) {
  if (!candles || candles.length < 16) return null;
  const closes = candles.map(c => c.close);
  const rsiVals = calcRSI(closes, 14).filter(isFinite);
  if (rsiVals.length < 2) return null;
  const pad = { t: 6, r: 56, b: 16, l: 10 };
  const W = width - pad.l - pad.r;
  const H = height - pad.t - pad.b;
  const toX = (i: number) => pad.l + (i / (rsiVals.length - 1)) * W;
  const toY = (v: number) => pad.t + H - (v / 100) * H;
  const pts = rsiVals.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
  const last = rsiVals[rsiVals.length - 1];
  const rsiColor = last > 70 ? 'var(--red)' : last < 30 ? 'var(--green)' : 'var(--cyan)';

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display:'block' }}>
      <rect x={pad.l} y={toY(70)} width={W} height={toY(30) - toY(70)} fill="rgba(56,189,248,0.03)" />
      <line x1={pad.l} y1={toY(70)} x2={pad.l + W} y2={toY(70)} stroke="rgba(241,76,76,0.3)"   strokeWidth="0.7" strokeDasharray="3,2" />
      <line x1={pad.l} y1={toY(50)} x2={pad.l + W} y2={toY(50)} stroke="rgba(255,255,255,0.06)" strokeWidth="0.7" />
      <line x1={pad.l} y1={toY(30)} x2={pad.l + W} y2={toY(30)} stroke="rgba(74,222,128,0.28)"  strokeWidth="0.7" strokeDasharray="3,2" />
      <polyline points={`${pad.l},${pad.t + H} ${pts} ${pad.l + W},${pad.t + H}`} fill="rgba(94,234,212,0.05)" stroke="none" />
      <polyline points={pts} fill="none" stroke={rsiColor} strokeWidth="1.2" strokeLinejoin="round" />
      <text x={pad.l + W + 4} y={toY(70) + 3} fontSize="7" fill="var(--red)"   fontFamily="var(--mono)" opacity="0.7">70</text>
      <text x={pad.l + W + 4} y={toY(30) + 3} fontSize="7" fill="var(--green)" fontFamily="var(--mono)" opacity="0.7">30</text>
      <text x={pad.l + W + 4} y={toY(last) + 3} fontSize="8" fill={rsiColor} fontFamily="var(--mono)" fontWeight="700">{last.toFixed(1)}</text>
      <text x={pad.l + 3} y={pad.t + 8} fontSize="7.5" fill="var(--text3)" fontFamily="var(--mono)" fontWeight="700" letterSpacing="1">RSI(14)</text>
    </svg>
  );
});

// ── MACD PANEL ───────────────────────────────────────────────────────

export const MACDPanel = memo(function MACDPanel({ candles, width = 900, height = 80 }: PanelProps) {
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
  const toX = (i: number) => pad.l + (i / (macdData.length - 1)) * W;
  const toY = (v: number) => pad.t + H - ((v - minV) / rangeV) * H;
  const ptsM = macdData.map((d, i) => `${toX(i)},${toY(d.macd)}`).join(' ');
  const ptsS = macdData.map((d, i) => `${toX(i)},${toY(d.signal)}`).join(' ');
  const zero  = toY(0);
  const barW  = Math.max(1, W / macdData.length * 0.7);
  const last  = macdData[macdData.length - 1];

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display:'block' }}>
      {zero >= pad.t && zero <= pad.t + H && (
        <line x1={pad.l} y1={zero} x2={pad.l + W} y2={zero} stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" />
      )}
      {macdData.map((d, i) => {
        const x  = toX(i);
        const y1 = Math.min(toY(d.hist), zero);
        const y2 = Math.max(toY(d.hist), zero);
        return <rect key={i} x={x - barW / 2} y={y1} width={barW} height={Math.max(1, y2 - y1)}
          fill={d.hist >= 0 ? 'rgba(35,209,139,0.5)' : 'rgba(241,76,76,0.5)'} />;
      })}
      <polyline points={ptsM} fill="none" stroke="var(--cyan)"   strokeWidth="1.2" strokeLinejoin="round" />
      <polyline points={ptsS} fill="none" stroke="var(--orange)" strokeWidth="1.0" strokeLinejoin="round" strokeDasharray="3,2" />
      <text x={pad.l + 3} y={pad.t + 8} fontSize="7.5" fill="var(--text3)" fontFamily="var(--mono)" fontWeight="700" letterSpacing="1">MACD(12,26,9)</text>
      <text x={pad.l + W + 4} y={toY(last.macd) + 3} fontSize="8" fill="var(--cyan)" fontFamily="var(--mono)" fontWeight="700">{last.macd.toFixed(3)}</text>
    </svg>
  );
});
