import { useAppStore } from '@/shared/store/useAppStore';
import { useTradeLog, useEquity, useMarketStats } from '@/shared/api/hooks';
import { StatCard, EquityChart, DrawdownChart } from '@/shared/ui/components';
import { fmtNum } from '@/shared/utils/format';
import type { Trade, EquityPoint, StatsResponse } from '@/shared/types';

// ── PIE ARC HELPER ───────────────────────────────────────────────────

function pieArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const toRad = (d: number) => (d - 90) * (Math.PI / 180);
  const x1 = cx + r * Math.cos(toRad(startDeg));
  const y1 = cy + r * Math.sin(toRad(startDeg));
  const x2 = cx + r * Math.cos(toRad(endDeg));
  const y2 = cy + r * Math.sin(toRad(endDeg));
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`;
}

// ── DERIVED METRICS ──────────────────────────────────────────────────

interface MonthlyBar {
  label: string;
  value: number;
}

function buildMonthly(logs: Trade[]): MonthlyBar[] {
  const m: Record<string, number> = {};
  logs
    .filter(l => l.profit !== undefined)
    .forEach(l => {
      const key = new Date(l.ts).toLocaleDateString('it-IT', { month: 'short', year: '2-digit' });
      m[key] = (m[key] ?? 0) + (l.profit ?? 0);
    });
  return Object.entries(m)
    .slice(-6)
    .map(([k, v]) => ({ label: k, value: +v.toFixed(2) }));
}

interface PieSlice {
  label: string;
  val: number;
  col: string;
  pct: number;
  startDeg: number;
  endDeg: number;
}

function buildPieSlices(logs: Trade[]): { slices: PieSlice[]; pieData: Omit<PieSlice, 'pct' | 'startDeg' | 'endDeg'>[] } {
  const wins   = logs.filter(l => l.outcome === 'WIN').length;
  const losses = logs.filter(l => l.outcome === 'LOSS').length;
  const bes    = logs.filter(l => l.outcome === 'BREAKEVEN').length;
  const total  = wins + losses + bes || 1;

  const pieData = [
    { label: 'WIN',       val: wins,   col: 'var(--green)'  },
    { label: 'LOSS',      val: losses, col: 'var(--red)'    },
    { label: 'BREAKEVEN', val: bes,    col: 'var(--yellow)' },
  ];

  let start = 0;
  const slices: PieSlice[] = pieData.map(p => {
    const pct      = p.val / total;
    const end      = start + pct * 360;
    const startDeg = start;
    start          = end;
    return { ...p, pct, startDeg, endDeg: end };
  });

  return { slices, pieData };
}

function buildBestWorst(logs: Trade[]): { bestT: Trade | null; worstT: Trade | null } {
  const closed = logs.filter(l => l.profit !== undefined);
  const bestT  = closed.reduce<Trade | null>(
    (b, l) => (l.profit! > (b?.profit ?? -Infinity) ? l : b),
    null,
  );
  const worstT = closed.reduce<Trade | null>(
    (b, l) => (l.profit! < (b?.profit ?? Infinity) ? l : b),
    null,
  );
  return { bestT, worstT };
}

function calcMaxStreak(logs: Trade[]): number {
  let max = 0, cur = 0;
  logs.forEach(l => {
    if (l.outcome === 'WIN') { cur++; max = Math.max(max, cur); } else { cur = 0; }
  });
  return max;
}

// ── NOGO BREAKDOWN ───────────────────────────────────────────────────

interface NogoRow {
  label: string;
  val: number;
  color: string;
  bold?: boolean;
}

function buildNogoRows(logs: Trade[]): NogoRow[] {
  const nogoLogs    = logs.filter(l => l.action === 'NOGO');
  const nogoClaude  = nogoLogs.filter(l => !l.blocked_by).length;
  const nogoNews    = nogoLogs.filter(l => l.blocked_by === 'news_filter').length;
  const nogoCircuit = nogoLogs.filter(l => l.blocked_by === 'circuit_breaker').length;
  return [
    { label: 'NOGO — Claude',          val: nogoClaude,        color: 'var(--nogo)'   },
    { label: 'NOGO — News Filter',     val: nogoNews,          color: 'var(--orange)' },
    { label: 'NOGO — Circuit Breaker', val: nogoCircuit,       color: 'var(--red)'    },
    { label: 'NOGO — Total',           val: nogoLogs.length,   color: 'var(--yellow)', bold: true },
  ];
}

// ── MONTHLY BAR ──────────────────────────────────────────────────────

function MonthlyBar({ monthly }: { monthly: MonthlyBar[] }) {
  if (monthly.length === 0)
    return <div className="sw-empty" style={{ padding: 20 }}>Nessun dato</div>;

  const maxAbs = Math.max(...monthly.map(x => Math.abs(x.value)), 1);
  return (
    <>
      {monthly.map(m => {
        const pct     = (Math.abs(m.value) / maxAbs) * 100;
        const barLeft = m.value >= 0 ? '50%' : `${50 - pct / 2}%`;
        const barW    = `${pct / 2}%`;
        return (
          <div
            key={m.label}
            style={{ display: 'grid', gridTemplateColumns: '52px 1fr 64px', gap: 8, alignItems: 'center', fontSize: 10 }}
          >
            <span style={{ color: 'var(--text3)', fontSize: 9 }}>{m.label}</span>
            <div style={{ height: 12, background: 'var(--bg4)', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'var(--border2)' }} />
              <div style={{
                position: 'absolute', left: barLeft, width: barW, height: '100%',
                background: m.value >= 0 ? 'var(--green)' : 'var(--red)',
                opacity: 0.7, borderRadius: 2,
              }} />
            </div>
            <span style={{ color: m.value >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600, textAlign: 'right', fontSize: 9 }}>
              {m.value >= 0 ? '+' : ''}{fmtNum(m.value)}
            </span>
          </div>
        );
      })}
    </>
  );
}

// ── COMPONENT ────────────────────────────────────────────────────────

export function PerformanceTab() {
  const { serverUrl, isDemoMode } = useAppStore();

  const { data: logs    = [] } = useTradeLog(serverUrl, isDemoMode);
  const { data: equity  = [] } = useEquity(serverUrl, isDemoMode);
  const { data: stats        } = useMarketStats(serverUrl, isDemoMode);

  const typedLogs:   Trade[]         = logs   as Trade[];
  const typedEquity: EquityPoint[]   = equity as EquityPoint[];
  const typedStats:  StatsResponse | undefined = stats;

  const monthly                = buildMonthly(typedLogs);
  const { slices, pieData }    = buildPieSlices(typedLogs);
  const { bestT, worstT }      = buildBestWorst(typedLogs);
  const maxStreak              = calcMaxStreak(typedLogs);
  const nogoRows               = buildNogoRows(typedLogs);
  const wins                   = typedLogs.filter(l => l.outcome === 'WIN').length;
  const total                  = typedLogs.filter(l => l.outcome !== undefined).length || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── TOP STATS ── */}
      <div className="sw-stat-grid">
        <StatCard
          label="BEST TRADE"
          value={bestT ? `+${fmtNum(bestT.profit)}` : '—'}
          accent="var(--green)"
          sub={bestT?.symbol}
        />
        <StatCard
          label="WORST TRADE"
          value={worstT ? `${fmtNum(worstT.profit)}` : '—'}
          accent="var(--red)"
          sub={worstT?.symbol}
        />
        <StatCard
          label="MAX STREAK"
          value={maxStreak}
          accent="var(--cyan)"
          sub="consecutive wins"
        />
        <StatCard
          label="TOTAL PROFIT"
          value={
            typedStats?.total_profit != null
              ? `${typedStats.total_profit >= 0 ? '+' : ''}${fmtNum(typedStats.total_profit)}`
              : '—'
          }
          accent={typedStats?.total_profit != null && typedStats.total_profit >= 0 ? 'var(--green)' : 'var(--red)'}
        />
        <StatCard
          label="WIN RATE"
          value={typedStats?.win_rate_pct != null ? `${typedStats.win_rate_pct}%` : '—'}
          accent="var(--go-full)"
          sub={`${typedStats?.wins ?? 0}W / ${typedStats?.losses ?? 0}L`}
        />
        <StatCard
          label="NOGO SAVES"
          value={typedStats?.nogo_count ?? '—'}
          accent="var(--yellow)"
          sub="filtrate da AI"
        />
      </div>

      {/* ── EQUITY + DRAWDOWN ── */}
      <div className="sw-panel">
        <div className="sw-panel-header">
          <div className="sw-panel-title">EQUITY CURVE</div>
          <span className="sw-panel-badge">{typedEquity.length} punti</span>
        </div>
        <div style={{ padding: '14px 16px 6px' }}>
          <EquityChart data={typedEquity} width={820} height={160} />
        </div>
        <div style={{ padding: '0 16px 14px' }}>
          <div style={{ fontSize: 8, color: 'var(--text3)', letterSpacing: 2, marginBottom: 4 }}>DRAWDOWN</div>
          <DrawdownChart data={typedEquity} width={820} height={70} />
        </div>
      </div>

      {/* ── NOGO BREAKDOWN ── */}
      <div className="sw-panel">
        <div className="sw-panel-header">
          <div className="sw-panel-title">NOGO BREAKDOWN</div>
        </div>
        <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {nogoRows.map(r => (
            <div
              key={r.label}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '6px 10px', background: 'var(--bg3)', borderRadius: 3,
                border: '1px solid var(--border)', fontFamily: 'var(--mono)', fontSize: 10,
              }}
            >
              <span style={{ color: 'var(--text2)', letterSpacing: 1, fontWeight: r.bold ? 700 : 400 }}>{r.label}</span>
              <span style={{ color: r.color, fontWeight: 700, fontSize: 13 }}>{r.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── PIE + MONTHLY ── */}
      <div className="sw-perf-grid">

        {/* OUTCOME PIE */}
        <div className="sw-panel">
          <div className="sw-panel-header">
            <div className="sw-panel-title">OUTCOME DISTRIBUTION</div>
          </div>
          <div style={{ padding: 16, display: 'flex', gap: 24, alignItems: 'center' }}>
            <svg width="120" height="120" viewBox="0 0 120 120">
              {slices.map((s, i) =>
                s.val > 0 ? (
                  <path
                    key={i}
                    d={pieArc(60, 60, 50, s.startDeg, s.endDeg > s.startDeg + 358 ? s.startDeg + 358 : s.endDeg)}
                    fill={s.col}
                    opacity="0.85"
                  />
                ) : null,
              )}
              <circle cx="60" cy="60" r="28" fill="var(--bg2)" />
              <text x="60" y="56" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">
                {Math.round((wins / total) * 100)}%
              </text>
              <text x="60" y="68" textAnchor="middle" fontSize="8" fill="var(--text3)" fontFamily="var(--mono)">WIN</text>
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pieData.map(p => (
                <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: p.col, flexShrink: 0 }} />
                  <span style={{ color: 'var(--text2)', width: 80 }}>{p.label}</span>
                  <span style={{ color: p.col, fontWeight: 700 }}>{p.val}</span>
                  <span style={{ color: 'var(--text3)' }}>({Math.round((p.val / total) * 100)}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MONTHLY P&L BAR */}
        <div className="sw-panel">
          <div className="sw-panel-header">
            <div className="sw-panel-title">P&L MENSILE</div>
          </div>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <MonthlyBar monthly={monthly} />
          </div>
        </div>

      </div>
    </div>
  );
}
