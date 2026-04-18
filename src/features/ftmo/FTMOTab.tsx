import { useAppStore } from '@/shared/store/useAppStore';
import { useFtmoData } from '@/shared/api/hooks';
import { fmtNum } from '@/shared/utils/format';
import type { EquityPoint, FtmPortfolio, FtmPosition, StatsResponse } from '@/shared/types';

// ── FTMO CONSTANTS ───────────────────────────────────────────────────

const ACCOUNT_SIZE   = 100_000;
const DAILY_LOSS_MAX = 5_000;   // 5% di 100K
const DD_MAX         = 10_000;  // 10% di 100K
const TARGET         = 10_000;  // +10% di 100K
const DAILY_BUFFER   = 3_000;   // buffer EA (3%) — soglia di allerta

// ── STATUS COLOR HELPER ──────────────────────────────────────────────

function statusColor(val: number, warn: number, danger: number): string {
  return val >= danger ? 'var(--red)' : val >= warn ? 'var(--yellow)' : 'var(--green)';
}

// ── GAUGE SVG ────────────────────────────────────────────────────────

interface GaugeProps {
  pct:   number;
  color: string;
  size?: number;
}

function Gauge({ pct, color, size = 72 }: GaugeProps) {
  const r    = size / 2 - 6;
  const circ = Math.PI * r;
  const dash = (Math.min(100, Math.max(0, pct)) / 100) * circ;
  const arc  = `M 6 ${size / 2} A ${r} ${r} 0 0 1 ${size - 6} ${size / 2}`;
  return (
    <svg width={size} height={size / 2 + 4} viewBox={`0 0 ${size} ${size / 2 + 4}`}>
      <path d={arc} fill="none" stroke="var(--border)"  strokeWidth="5" strokeLinecap="round" />
      <path d={arc} fill="none" stroke={color}          strokeWidth="5" strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`} />
    </svg>
  );
}

// ── PROGRESS BAR ─────────────────────────────────────────────────────

interface BarProps {
  pct:    number;
  color:  string;
  height?: number;
}

function Bar({ pct, color, height = 6 }: BarProps) {
  return (
    <div style={{ background: 'var(--border)', borderRadius: 3, height, overflow: 'hidden' }}>
      <div style={{
        width: `${Math.min(100, Math.max(0, pct))}%`,
        height: '100%',
        background: color,
        borderRadius: 3,
        transition: 'width 0.5s ease',
      }} />
    </div>
  );
}

// ── METRICS FROM EQUITY LOG ──────────────────────────────────────────

interface FtmoMetrics {
  currentEq:       number;
  totalProfit:     number;
  totalProfitPct:  number;
  dailyPnL:        number;
  dailyLossPct:    number;
  maxDD:           number;
  maxDDPct:        number;
  targetPct:       number;
}

function calcMetrics(equity: EquityPoint[]): FtmoMetrics {
  const sorted     = [...equity].sort((a, b) => b.ts - a.ts);
  const latest     = sorted[0] ?? null;
  const oldest     = sorted[sorted.length - 1] ?? null;

  const currentEq      = latest?.equity  ?? ACCOUNT_SIZE;
  const totalProfit    = currentEq - ACCOUNT_SIZE;
  const totalProfitPct = (totalProfit / ACCOUNT_SIZE) * 100;

  // Daily PnL: compare current equity vs balance at start of today
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayPts   = sorted.filter(p => p.ts >= todayStart.getTime());
  const dayStartBal = todayPts.length > 0
    ? (todayPts[todayPts.length - 1].balance ?? ACCOUNT_SIZE)
    : (oldest?.balance ?? ACCOUNT_SIZE);
  const dailyPnL    = currentEq - dayStartBal;
  const dailyLossPct = dailyPnL < 0 ? (Math.abs(dailyPnL) / ACCOUNT_SIZE) * 100 : 0;

  // Max drawdown: peak-to-trough over entire history (chronological order)
  const eqVals = [...sorted].reverse().map(p => p.equity || 0).filter(v => v > 0);
  let peak = ACCOUNT_SIZE, maxDD = 0;
  for (const v of eqVals) {
    if (v > peak) peak = v;
    const dd = peak - v;
    if (dd > maxDD) maxDD = dd;
  }
  const maxDDPct  = (maxDD / ACCOUNT_SIZE) * 100;
  const targetPct = Math.min(100, Math.max(0, (totalProfit / TARGET) * 100));

  return { currentEq, totalProfit, totalProfitPct, dailyPnL, dailyLossPct, maxDD, maxDDPct, targetPct };
}

// ── PORTFOLIO ROW ────────────────────────────────────────────────────

function PositionRow({ p }: { p: FtmPosition }) {
  const isLong = p.direction === 'BULL';
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '90px 60px 100px 80px 1fr',
      gap: 10, alignItems: 'center', padding: '8px 10px',
      background: 'var(--bg)', borderRadius: 4, fontSize: 10,
    }}>
      <span style={{ fontWeight: 700, color: 'var(--text1)', fontFamily: 'var(--mono)' }}>{p.symbol}</span>
      <span style={{ color: isLong ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
        {isLong ? '▲ LONG' : '▼ SHORT'}
      </span>
      <span style={{ color: 'var(--text2)' }}>
        Entry: <b style={{ color: 'var(--text1)' }}>{p.entry.toFixed(2)}</b>
      </span>
      <span style={{ color: 'var(--text3)' }}>Lots: {p.lot_adj}</span>
      <span style={{ color: 'var(--text3)', textAlign: 'right' }}>Aperto {p.open_min}min fa</span>
    </div>
  );
}

// ── STATS ROW ────────────────────────────────────────────────────────

interface StatItem {
  label: string;
  val:   string | number;
  color: string;
}

function buildStatItems(stats: StatsResponse | null): StatItem[] {
  return [
    {
      label: 'TRADE TOTALI',
      val:   stats?.total_trades ?? '—',
      color: 'var(--text2)',
    },
    {
      label: 'WIN RATE',
      val:   stats?.win_rate_pct != null ? `${stats.win_rate_pct}%` : '—',
      color: (stats?.win_rate_pct ?? 0) >= 50 ? 'var(--green)' : 'var(--red)',
    },
    {
      label: 'WIN / LOSS',
      val:   stats ? `${stats.wins ?? 0}W / ${stats.losses ?? 0}L` : '—',
      color: 'var(--text2)',
    },
    {
      label: 'PROFIT TOTALE',
      val:   stats?.total_profit != null
        ? `${stats.total_profit >= 0 ? '+' : ''}${fmtNum(stats.total_profit)}`
        : '—',
      color: (stats?.total_profit ?? 0) >= 0 ? 'var(--green)' : 'var(--red)',
    },
  ];
}

// ── COMPONENT ────────────────────────────────────────────────────────

export function FTMOTab() {
  const { serverUrl, isDemoMode } = useAppStore();
  const { equity, portfolio, stats, isLoading, error } = useFtmoData(serverUrl, isDemoMode);

  const m            = calcMetrics(equity);
  const dailyColor   = statusColor(m.dailyLossPct, 2.5, 4.5);
  const ddColor      = statusColor(m.maxDDPct, 6, 9);
  const targetColor  = m.totalProfit >= TARGET
    ? 'var(--green)'
    : m.totalProfit >= TARGET * 0.5
      ? 'var(--cyan)'
      : 'var(--text2)';

  const ftmPortfolio: FtmPortfolio | null = portfolio;
  const ftmStats: StatsResponse | null    = stats;
  const statItems = buildStatItems(ftmStats);

  // ── Guards ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--text3)', fontSize: 11 }}>
        Caricamento dati FTMO...
      </div>
    );
  }

  if (!serverUrl && !isDemoMode) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--text3)', fontSize: 11 }}>
        Configura il Server URL nella tab ⚙ CONFIG per vedere i dati reali.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 0' }}>

      {/* ── Demo banner ── */}
      {isDemoMode && (
        <div style={{
          background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(229,192,123,0.25)',
          color: 'var(--yellow)', fontSize: 9, letterSpacing: 2,
          padding: '6px 14px', borderRadius: 4, textAlign: 'center',
        }}>
          ⚠ DEMO — I VALORI SONO SIMULATI · CONNETTI IL SERVER PER I DATI REALI
        </div>
      )}

      {/* ── Error banner ── */}
      {error && (
        <div style={{
          background: 'rgba(251,113,133,0.07)', border: '1px solid rgba(251,113,133,0.22)',
          color: 'var(--red)', fontSize: 9, padding: '6px 14px', borderRadius: 4,
        }}>
          Errore connessione: {error}
        </div>
      )}

      {/* ── Header FTMO ── */}
      <div style={{
        background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6,
        padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: 3, color: 'var(--text3)', marginBottom: 3 }}>FTMO CHALLENGE</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', letterSpacing: 1 }}>2-STEP · 100K USD</div>
          <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 2 }}>
            Daily loss ≤5% ($5k) · Drawdown ≤10% ($10k) · Target +10% ($10k)
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9, color: 'var(--text3)', marginBottom: 2 }}>EQUITY CORRENTE</div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 1, color: m.totalProfit >= 0 ? 'var(--green)' : 'var(--red)' }}>
            ${fmtNum(m.currentEq)}
          </div>
          <div style={{ fontSize: 10, color: m.totalProfit >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {m.totalProfit >= 0 ? '+' : ''}{fmtNum(m.totalProfit)} ({m.totalProfitPct.toFixed(2)}%)
          </div>
        </div>
      </div>

      {/* ── 3 Gauge cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>

        {/* Daily Loss */}
        <div style={{
          background: 'var(--panel)',
          border: `1px solid ${dailyColor === 'var(--red)' ? 'rgba(224,108,117,0.4)' : 'var(--border)'}`,
          borderRadius: 6, padding: '14px 16px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 8, letterSpacing: 2, color: 'var(--text3)', marginBottom: 6 }}>DAILY LOSS</div>
          <Gauge pct={(Math.abs(m.dailyPnL) / DAILY_LOSS_MAX) * 100} color={dailyColor} size={80} />
          <div style={{ fontSize: 15, fontWeight: 700, color: dailyColor, marginTop: 2 }}>
            {m.dailyPnL < 0 ? '-' : '+'}{fmtNum(Math.abs(m.dailyPnL))}
          </div>
          <div style={{ fontSize: 8, color: 'var(--text3)', marginTop: 2 }}>
            Max ${fmtNum(DAILY_LOSS_MAX)} · Buffer EA ${fmtNum(DAILY_BUFFER)}
          </div>
          <Bar pct={(Math.abs(m.dailyPnL < 0 ? m.dailyPnL : 0) / DAILY_LOSS_MAX) * 100} color={dailyColor} height={4} />
        </div>

        {/* Max Drawdown */}
        <div style={{
          background: 'var(--panel)',
          border: `1px solid ${ddColor === 'var(--red)' ? 'rgba(224,108,117,0.4)' : 'var(--border)'}`,
          borderRadius: 6, padding: '14px 16px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 8, letterSpacing: 2, color: 'var(--text3)', marginBottom: 6 }}>MAX DRAWDOWN</div>
          <Gauge pct={(m.maxDD / DD_MAX) * 100} color={ddColor} size={80} />
          <div style={{ fontSize: 15, fontWeight: 700, color: ddColor, marginTop: 2 }}>
            -{fmtNum(m.maxDD)} ({m.maxDDPct.toFixed(2)}%)
          </div>
          <div style={{ fontSize: 8, color: 'var(--text3)', marginTop: 2 }}>Limite FTMO ${fmtNum(DD_MAX)} (10%)</div>
          <Bar pct={(m.maxDD / DD_MAX) * 100} color={ddColor} height={4} />
        </div>

        {/* Target */}
        <div style={{
          background: 'var(--panel)',
          border: `1px solid ${m.totalProfit >= TARGET ? 'rgba(35,209,139,0.4)' : 'var(--border)'}`,
          borderRadius: 6, padding: '14px 16px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 8, letterSpacing: 2, color: 'var(--text3)', marginBottom: 6 }}>TARGET PROFIT</div>
          <Gauge pct={m.targetPct} color={targetColor} size={80} />
          <div style={{ fontSize: 15, fontWeight: 700, color: targetColor, marginTop: 2 }}>
            {m.totalProfit >= 0 ? '+' : ''}{fmtNum(m.totalProfit)}
          </div>
          <div style={{ fontSize: 8, color: 'var(--text3)', marginTop: 2 }}>
            {m.targetPct.toFixed(1)}% · Mancano ${fmtNum(Math.max(0, TARGET - m.totalProfit))}
          </div>
          <Bar pct={m.targetPct} color={targetColor} height={4} />
        </div>

      </div>

      {/* ── Portfolio aperto ── */}
      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6 }}>
        <div className="sw-panel-header">
          <div className="sw-panel-title">PORTFOLIO APERTO</div>
          <span className="sw-panel-badge">{ftmPortfolio?.count ?? 0} posizioni</span>
        </div>
        <div style={{ padding: '0 20px 14px' }}>
          {(!ftmPortfolio || ftmPortfolio.count === 0) ? (
            <div style={{ color: 'var(--text3)', fontSize: 10, padding: '12px 0', textAlign: 'center' }}>
              Nessuna posizione aperta
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {ftmPortfolio.positions.map((p, i) => (
                <PositionRow key={`${p.symbol}-${i}`} p={p} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Statistiche challenge ── */}
      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6 }}>
        <div className="sw-panel-header">
          <div className="sw-panel-title">STATISTICHE CHALLENGE</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, padding: '14px 20px' }}>
          {statItems.map(({ label, val, color }) => (
            <div key={label} style={{ textAlign: 'center', padding: '8px 0', borderRight: '1px solid var(--border)' }}>
              <div style={{ fontSize: 7, letterSpacing: 2, color: 'var(--text3)', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Regole FTMO reminder ── */}
      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6 }}>
        <div className="sw-panel-header">
          <div className="sw-panel-title">REGOLE FTMO 100K — REMINDER</div>
        </div>
        <div style={{ padding: '10px 20px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {([
            ['Daily loss max',               '5% → $5.000',    m.dailyLossPct < 2.5  ? 'var(--green)' : m.dailyLossPct < 4.5  ? 'var(--yellow)' : 'var(--red)'],
            ['Max drawdown',                 '10% → $10.000',  m.maxDDPct     < 6    ? 'var(--green)' : m.maxDDPct     < 9    ? 'var(--yellow)' : 'var(--red)'],
            ['Target profit',                '+10% → $10.000', targetColor],
            ['EA buffer daily',              '3% → $3.000',    'var(--cyan)'],
            ['Risk/trade (XAU/crypto)',       '0.50%',          'var(--text2)'],
            ['Risk/trade (EUR/GBP/JPY)',      '0.75%',          'var(--text2)'],
            ['Portfolio cap',                '30% free margin', 'var(--text2)'],
            ['Max simboli attivi',           '4',               'var(--text2)'],
          ] as [string, string, string][]).map(([rule, val, color]) => (
            <div key={rule} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 10,
            }}>
              <span style={{ color: 'var(--text3)' }}>{rule}</span>
              <span style={{ color, fontWeight: 700, fontFamily: 'var(--mono)', fontSize: 11 }}>{val}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
