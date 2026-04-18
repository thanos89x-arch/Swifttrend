import { memo } from 'react';
import { useSvgId } from '@/shared/hooks/useSvgId';
import { fmtDate } from '@/shared/utils/format';
import type { EquityPoint } from '@/shared/types';

// ── STAT CARD ────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number | undefined;
  sub?: string;
  accent?: string;
}

export const StatCard = memo(function StatCard({
  label,
  value,
  sub,
  accent = 'var(--cyan)',
}: StatCardProps) {
  const subClass =
    typeof sub === 'string' && sub.startsWith('+')
      ? 'sw-stat-sub up'
      : typeof sub === 'string' && sub.startsWith('-')
        ? 'sw-stat-sub down'
        : 'sw-stat-sub';
  return (
    <div className="sw-stat-card" style={{ '--accent': accent } as React.CSSProperties}>
      <div className="sw-stat-label">{label}</div>
      <div className="sw-stat-value">{value ?? '—'}</div>
      {sub && <div className={subClass}>{sub}</div>}
    </div>
  );
});

// ── ACTION BADGE ─────────────────────────────────────────────────────

interface ActionBadgeProps {
  action?: string;
}

export const ActionBadge = memo(function ActionBadge({ action }: ActionBadgeProps) {
  if (!action) return <span style={{ color: 'var(--text3)', fontSize: 9 }}>—</span>;
  return <span className={`sw-action ${action}`}>{action.replace('_', ' ')}</span>;
});

// ── SPARKLINE ────────────────────────────────────────────────────────

interface SparklineProps {
  data: EquityPoint[];
  width?: number;
  height?: number;
  showArea?: boolean;
}

export const Sparkline = memo(function Sparkline({
  data,
  width = 200,
  height = 44,
  showArea = true,
}: SparklineProps) {
  const id = useSvgId('sg');
  if (!data || data.length < 2)
    return (
      <div
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text3)',
          fontSize: 9,
        }}
      >
        NO DATA
      </div>
    );
  const vals = data.map(d => d.equity || d.balance || 0).filter(v => v > 0);
  if (vals.length < 2) return null;
  const min   = Math.min(...vals);
  const max   = Math.max(...vals);
  const range = max - min || 1;
  const pts   = vals
    .map((v, i) => {
      const x = (i / (vals.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(' ');
  const last  = vals[vals.length - 1];
  const first = vals[0];
  const up    = last >= first;
  const col   = up ? 'var(--green)' : 'var(--red)';
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
      {showArea && (
        <polyline points={`${pts} ${width},${height} 0,${height}`} fill={`url(#${id})`} stroke="none" />
      )}
      <polyline points={pts} fill="none" stroke={col} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="3" fill={col} />
      <circle cx={lastX} cy={lastY} r="6" fill="none" stroke={col} strokeWidth="1" opacity="0.35">
        <animate attributeName="r"       values="4;8;4"         dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.35;0;0.35"   dur="2.5s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
});

// ── EQUITY CHART ─────────────────────────────────────────────────────

interface EquityChartProps {
  data: EquityPoint[];
  width?: number;
  height?: number;
}

export const EquityChart = memo(function EquityChart({
  data,
  width = 700,
  height = 160,
}: EquityChartProps) {
  const gId = useSvgId('eq-grad');
  if (!data || data.length < 2)
    return <div className="sw-empty">In attesa di dati equity</div>;

  const vals  = data.map(d => d.equity || 0);
  const min   = Math.min(...vals);
  const max   = Math.max(...vals);
  const range = max - min || 1;
  const pad   = { t: 10, r: 10, b: 28, l: 60 };
  const W     = width  - pad.l - pad.r;
  const H     = height - pad.t - pad.b;

  const pts = vals
    .map((v, i) => {
      const x = pad.l + (i / (vals.length - 1)) * W;
      const y = pad.t + H - ((v - min) / range) * H;
      return `${x},${y}`;
    })
    .join(' ');

  const firstPt = `${pad.l},${pad.t + H}`;
  const lastPt  = `${pad.l + W},${pad.t + H}`;
  const up  = vals[vals.length - 1] >= vals[0];
  const col = up ? 'var(--green)' : 'var(--red)';

  const ticks  = 4;
  const yLines = Array.from({ length: ticks + 1 }, (_, i) => {
    const v = min + (range / ticks) * i;
    const y = pad.t + H - ((v - min) / range) * H;
    return { y, v };
  });
  const xLabels = [0, Math.floor(data.length / 2), data.length - 1].map(i => ({
    x:     pad.l + (i / (data.length - 1)) * W,
    label: fmtDate(data[i]?.ts),
  }));

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={col} stopOpacity="0.38" />
          <stop offset="100%" stopColor={col} stopOpacity="0" />
        </linearGradient>
        <filter id={`${gId}-glow`}>
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {yLines.map(({ y, v }) => (
        <g key={v}>
          <line x1={pad.l} y1={y} x2={pad.l + W} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          <text x={pad.l - 6} y={y + 3} textAnchor="end" fontSize="8" fill="var(--text3)" fontFamily="var(--mono)">
            {v.toFixed(0)}
          </text>
        </g>
      ))}
      <polyline points={`${firstPt} ${pts} ${lastPt}`} fill={`url(#${gId})`} stroke="none" />
      <polyline
        points={pts}
        fill="none"
        stroke={col}
        strokeWidth="2.5"
        strokeLinejoin="round"
        filter={`url(#${gId}-glow)`}
      />
      {xLabels.map(({ x, label }) => (
        <text key={label} x={x} y={height - 4} textAnchor="middle" fontSize="8" fill="var(--text3)" fontFamily="var(--mono)">
          {label}
        </text>
      ))}
    </svg>
  );
});

// ── DRAWDOWN CHART ───────────────────────────────────────────────────

interface DrawdownChartProps {
  data: EquityPoint[];
  width?: number;
  height?: number;
}

export const DrawdownChart = memo(function DrawdownChart({
  data,
  width = 700,
  height = 80,
}: DrawdownChartProps) {
  const gId = useSvgId('dd-grad');
  if (!data || data.length < 2) return null;

  const vals = data.map(d => d.equity || 0);
  let peak = vals[0];
  const dds = vals.map(v => {
    if (v > peak) peak = v;
    return peak > 0 ? ((v - peak) / peak) * 100 : 0;
  });
  const minDD = Math.min(...dds);
  const pad   = { t: 4, r: 10, b: 20, l: 44 };
  const W     = width  - pad.l - pad.r;
  const H     = height - pad.t - pad.b;
  const pts   = dds
    .map((v, i) => {
      const x = pad.l + (i / (dds.length - 1)) * W;
      const y = pad.t + H - ((v - minDD) / (-minDD || 1)) * H;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="var(--red)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--red)" stopOpacity="0.03" />
        </linearGradient>
      </defs>
      <polyline
        points={`${pad.l},${pad.t + H} ${pts} ${pad.l + W},${pad.t + H}`}
        fill={`url(#${gId})`}
        stroke="none"
      />
      <polyline
        points={pts}
        fill="none"
        stroke="var(--red)"
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeDasharray="3,2"
      />
      <text x={pad.l - 4} y={pad.t + H}  textAnchor="end" fontSize="8" fill="var(--text3)" fontFamily="var(--mono)">0%</text>
      <text x={pad.l - 4} y={pad.t + 8}  textAnchor="end" fontSize="8" fill="var(--red)"   fontFamily="var(--mono)">{minDD.toFixed(1)}%</text>
      <text x={pad.l + W / 2} y={height - 2} textAnchor="middle" fontSize="8" fill="var(--text3)" fontFamily="var(--mono)">DRAWDOWN</text>
    </svg>
  );
});

// ── COUNTDOWN RING ───────────────────────────────────────────────────

interface CountdownRingProps {
  seconds: number;
  total?: number;
}

export const CountdownRing = memo(function CountdownRing({
  seconds,
  total = 15,
}: CountdownRingProps) {
  const pct  = seconds / total;
  const r    = 5;
  const circ = 2 * Math.PI * r;
  return (
    <svg className="sw-countdown-ring" viewBox="0 0 14 14">
      <circle cx="7" cy="7" r={r} fill="none" stroke="var(--border2)" strokeWidth="1.5" />
      <circle
        cx="7"
        cy="7"
        r={r}
        fill="none"
        stroke="var(--cyan)"
        strokeWidth="1.5"
        strokeDasharray={`${circ * pct} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s linear' }}
      />
    </svg>
  );
});
