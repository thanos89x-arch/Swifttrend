import { useMemo } from 'react';
import { useAppStore } from '@/shared/store/useAppStore';
import { useTradeLog, useEquity, useServerHealth, useMarketStats } from '@/shared/api/hooks';
import { ActionBadge, StatCard, Sparkline, CountdownRing } from '@/shared/ui/components';
import { fmtNum, fmtTime } from '@/shared/utils/format';

const COLOR_BY_ACTION: Record<string, string> = {
  GO_FULL: 'var(--go-full)',
  GO_HALF: 'var(--green)',
  GO_MIN: 'var(--yellow)',
  NOGO: 'var(--nogo)',
  FALLBACK: 'var(--fallback)',
};

const FILTER_OPTS = ['ALL', 'GO_FULL', 'GO_HALF', 'GO_MIN', 'NOGO', 'WIN', 'LOSS'];

export function LiveMonitor() {
  const { serverUrl, isDemoMode, addToast } = useAppStore();

  const { data: logs, isLoading: logsLoading, exportCSV } = useTradeLog(serverUrl, isDemoMode);
  const { data: equity } = useEquity(serverUrl, isDemoMode);
  const { data: health } = useServerHealth(serverUrl, isDemoMode);
  const { data: stats } = useMarketStats(serverUrl, isDemoMode);

  const healthColor = !health ? 'var(--text3)' : health.status === 'ok' ? 'var(--green)' : 'var(--red)';

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    return logs.filter(l => {
      if (FILTER_OPTS[0] === 'ALL') return true;
      if (FILTER_OPTS[5] === 'WIN') return l.outcome === 'win';
      if (FILTER_OPTS[6] === 'LOSS') return l.outcome === 'loss';
      return l.action === FILTER_OPTS[FILTER_OPTS.indexOf('ALL') + 1];
    });
  }, [logs]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* DEMO WARNING BANNER */}
      {isDemoMode && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 16px', borderRadius: 6,
          background: 'rgba(229,192,123,0.06)',
          border: '1px solid rgba(229,192,123,0.25)',
          fontSize: 9, color: 'var(--yellow)', letterSpacing: 1.5,
        }}>
          <span style={{ fontSize: 13 }}>⚠</span>
          <span><strong>MODALITÀ DEMO ATTIVA</strong> — Tutti i dati mostrati sono simulati e non riflettono operazioni reali. Configura il VPS URL in CONFIG ⚙ per passare alla modalità live.</span>
        </div>
      )}

      {/* LIVE BANNER */}
      {!isDemoMode && serverUrl && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 16px', borderRadius: 6,
          background: 'rgba(35,209,139,0.05)',
          border: '1px solid rgba(35,209,139,0.2)',
          fontSize: 9, color: 'var(--green)', letterSpacing: 1.5,
        }}>
          <span style={{ fontSize: 13 }}>●</span>
          <span><strong>MODALITÀ LIVE</strong> — Dati reali dal VPS <span style={{ color: 'var(--cyan)', fontFamily: 'var(--mono)' }}>{serverUrl}</span> · Aggiornamento ogni 15s</span>
        </div>
      )}

      {/* STAT GRID */}
      <div className="sw-stat-grid">
        <StatCard label="TOTAL TRADES" value={stats?.total_trades ?? '—'} sub="registrate su disco" />
        <StatCard label="WIN RATE AI" value={stats?.win_rate_pct != null ? `${stats.win_rate_pct}%` : '—'} accent="var(--green)" sub={`${stats?.wins ?? 0}W / ${stats?.losses ?? 0}L`} />
        <StatCard label="TOTAL PROFIT" value={stats?.total_profit != null ? `${stats.total_profit >= 0 ? '+' : ''}${fmtNum(stats.total_profit)}` : '—'} accent={stats?.total_profit >= 0 ? 'var(--green)' : 'var(--red)'} sub="su trade chiuse" />
        <StatCard label="NOGO COUNT" value={stats?.nogo_count ?? '—'} accent="var(--nogo)" sub="trade filtrate" />
        <StatCard label="FALLBACK RATE" value={stats?.fallback_rate_pct != null ? `${stats.fallback_rate_pct}%` : '—'} accent="var(--fallback)" sub="errori Claude" />
        <StatCard label="SERVER UPTIME" value={health?.uptime_s != null ? `${Math.floor(health.uptime_s / 60)}m` : '—'} accent="var(--cyan)" sub={`v${health?.version ?? '?'}`} />
      </div>

      {/* TWO COL */}
      <div className="sw-two-col">
        {/* TRADE LOG */}
        <div className="sw-panel" style={{ minHeight: 360 }}>
          <div className="sw-panel-header">
            <div className="sw-panel-title">TRADE LOG</div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className="sw-btn sw-btn-green" onClick={exportCSV}>↓ CSV</button>
              <button className="sw-btn sw-btn-cyan" disabled={logsLoading}>{logsLoading ? '⟳' : '↻ REFRESH'}</button>
            </div>
          </div>

          {/* FILTERS */}
          <div className="sw-filter-row">
            {FILTER_OPTS.map(f => (
              <button key={f} className={`sw-filter-btn${FILTER_OPTS.indexOf(f) === 0 ? ' active' : ''}`} onClick={() => {}}>{f}</button>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--text3)' }}>{filteredLogs.length} righe</span>
          </div>

          <div className="sw-panel-body">
            {filteredLogs.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center' }}>
                <div className="sw-empty" style={{ marginBottom: 12 }}>Nessuna trade nel log</div>
                {!isDemoMode && (
                  <div style={{ fontSize: 9, color: 'var(--text3)', lineHeight: 1.8 }}>
                    <div>Server raggiungibile ma <code style={{ color: 'var(--cyan)' }}>/log</code> ha restituito 0 righe.</div>
                    <div style={{ marginTop: 8, color: 'var(--yellow)' }}>Cause possibili:</div>
                    <div>① <code>trade_log.jsonl</code> non esiste ancora sul VPS → attendi la prima trade da MT5</div>
                    <div>② Il server non ha permessi di scrittura nella sua directory</div>
                    <div>③ Le trade arrivano come NOGO — sono comunque salvate nel log</div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="sw-log-row header" style={{ cursor: 'default' }}>
                  <span>TIME</span>
                  <span>SYMBOL</span>
                  <span>DIR</span>
                  <span>ACTION</span>
                  <span>ENTRY / SL</span>
                  <span>REGIME</span>
                  <span>LOT</span>
                  <span>REASON</span>
                </div>
                {filteredLogs.map((t, i) => (
                  <div key={t.trade_id || i} className="sw-log-row" onClick={() => {}}>
                    {/* TIME */}
                    <span style={{ fontSize: 9, color: 'var(--text3)' }}>{fmtTime(t.ts)}</span>
                    {/* SYMBOL */}
                    <span style={{ color: 'var(--cyan)', fontWeight: 600, fontSize: 10 }}>{t.symbol}</span>
                    {/* DIR */}
                    <span style={{ color: t.direction === 'LONG' || t.direction === 'BUY' ? 'var(--green)' : 'var(--red)', fontWeight: 700, fontSize: 10 }}>
                      {t.direction === 'LONG' || t.direction === 'BUY' ? '▲' : '▼'} {t.direction}
                    </span>
                    {/* ACTION */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <ActionBadge action={t.action} />
                    </div>
                    {/* ENTRY / SL */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <span style={{ fontSize: 9, color: 'var(--text2)', fontFamily: 'var(--mono)' }}>
                        E: {t.entry != null ? t.entry.toLocaleString('en-US', { maximumFractionDigits: 5 }) : '—'}
                      </span>
                      <span style={{ fontSize: 9, color: 'rgba(251,113,133,0.7)', fontFamily: 'var(--mono)' }}>
                        SL: {t.sl != null ? t.sl.toLocaleString('en-US', { maximumFractionDigits: 5 }) : '—'}
                      </span>
                    </div>
                    {/* REGIME */}
                    <span style={{
                      fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 2, letterSpacing: 1,
                      color: t.regime === 'BULL' ? 'var(--green)' : t.regime === 'BEAR' ? 'var(--red)' : 'var(--text3)',
                      background: t.regime === 'BULL' ? 'rgba(74,222,128,0.08)' : t.regime === 'BEAR' ? 'rgba(248,113,113,0.08)' : 'transparent',
                      border: `1px solid ${t.regime === 'BULL' ? 'rgba(74,222,128,0.2)' : t.regime === 'BEAR' ? 'rgba(251,113,133,0.2)' : 'var(--border)'}`,
                    }}>{t.regime || '—'}</span>
                    {/* LOT */}
                    <span style={{ fontSize: 10, color: t.lot_adj > 0 ? 'var(--text1)' : 'var(--text3)', fontFamily: 'var(--mono)' }}>
                      {t.lot_adj != null ? t.lot_adj.toFixed(2) : '—'}
                    </span>
                    {/* REASON */}
                    <span style={{ color: 'var(--text3)', fontSize: 9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.reason || '—'}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* EQUITY SPARKLINE */}
          <div className="sw-panel" style={{ flex: '0 0 auto' }}>
            <div className="sw-panel-header">
              <div className="sw-panel-title">EQUITY CURVE</div>
              <span className="sw-panel-badge">{equity.length} pts</span>
            </div>
            <div style={{ padding: '10px 14px' }}>
              {equity.length > 1
                ? <Sparkline data={equity} width={312} height={56} />
                : <div className="sw-empty" style={{ padding: 16 }}>In attesa</div>}
              {equity.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 9, color: 'var(--text3)' }}>
                  <span>MIN: {Math.min(...equity.map(e => e.equity || 0)).toFixed(2)}</span>
                  <span style={{ color: equity[equity.length - 1]?.equity > equity[0]?.equity ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                    {equity[equity.length - 1]?.equity?.toFixed(2)}
                  </span>
                  <span>MAX: {Math.max(...equity.map(e => e.equity || 0)).toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* BY ACTION */}
          <div className="sw-panel" style={{ flex: 1 }}>
            <div className="sw-panel-header"><div className="sw-panel-title">PER AZIONE</div></div>
            <div className="sw-panel-body">
              {!stats?.by_action ? <div className="sw-empty">Nessun dato</div> : (
                <>
                  <div className="sw-action-row header">
                    <span>ACTION</span><span>CNT</span><span>W%</span><span>AVG P&L</span><span>RATE</span>
                  </div>
                  {['GO_FULL', 'GO_HALF', 'GO_MIN', 'NOGO', 'FALLBACK'].map(a => {
                    const d = stats.by_action[a];
                    if (!d || d.count === 0) return null;
                    return (
                      <div key={a} className="sw-action-row">
                        <ActionBadge action={a} />
                        <span style={{ color: 'var(--text2)' }}>{d.count}</span>
                        <span style={{ color: d.win_rate >= 50 ? 'var(--green)' : 'var(--red)' }}>
                          {d.win_rate != null ? `${d.win_rate}%` : '—'}
                        </span>
                        <span style={{ color: (d.avg_profit ?? 0) >= 0 ? 'var(--green)' : 'var(--red)', fontSize: 9 }}>
                          {d.avg_profit != null ? `${d.avg_profit >= 0 ? '+' : ''}${fmtNum(d.avg_profit)}` : '—'}
                        </span>
                        <div className="sw-bar-wrap">
                          <div className="sw-bar-fill" style={{ width: `${d.win_rate ?? 0}%`, background: COLOR_BY_ACTION[a] }} />
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {/* SERVER HEALTH */}
          <div className="sw-panel" style={{ flex: '0 0 auto' }}>
            <div className="sw-panel-header">
              <div className="sw-panel-title">SERVER HEALTH</div>
              <div style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: healthColor, animation: 'pulse 2s infinite' }} />
            </div>
            <div style={{ padding: '9px 16px', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {[
                ['STATUS', health?.status?.toUpperCase() ?? '—'],
                ['VERSION', health?.version ?? '—'],
                ['UPTIME', health ? `${Math.floor((health.uptime_s || 0) / 60)}m ${(health.uptime_s || 0) % 60}s` : '—'],
                ['ANTHROPIC', health?.anthropic ? '✓ OK' : '✗ MISSING'],
                ['TELEGRAM', health?.telegram ? '✓ OK' : '— off'],
                ['CLAUDE CALLS', stats?.runtime?.total_claude_calls ?? '—'],
                ['ERRORS', stats?.runtime?.total_errors ?? '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
                  <span style={{ color: 'var(--text3)', letterSpacing: 1 }}>{k}</span>
                  <span style={{ color: v === '✓ OK' ? 'var(--green)' : v === '✗ MISSING' ? 'var(--red)' : 'var(--text2)', fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}