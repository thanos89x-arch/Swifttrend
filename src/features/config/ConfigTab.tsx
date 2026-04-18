import { useAppStore } from '@/shared/store/useAppStore';
import type { ApiEndpoint } from '@/shared/types';

// ── Static API reference ──────────────────────────────────────────────

const API_ENDPOINTS: ApiEndpoint[] = [
  { method: 'POST', path: '/analyze-smc',  description: 'Riceve dati EA, chiama Claude (portfolio-aware), restituisce action + size' },
  { method: 'POST', path: '/portfolio',    description: "Apri/chiudi posizione nel portfolio state { action:'open'|'close', symbol }" },
  { method: 'GET',  path: '/portfolio',    description: 'Snapshot portfolio aperto corrente + gruppi correlazione' },
  { method: 'POST', path: '/log/outcome',  description: 'Aggiorna esito trade: { trade_id, outcome, profit, pips }' },
  { method: 'POST', path: '/trade',        description: 'Dati grezzi broker (apertura/chiusura): ticket, entry, SL, lots' },
  { method: 'POST', path: '/equity',       description: 'Salva snapshot equity su disco' },
  { method: 'POST', path: '/telegram',     description: 'Proxy notifiche Telegram' },
  { method: 'GET',  path: '/stats',        description: 'Win rate, P&L per action, fallback rate in real-time' },
  { method: 'GET',  path: '/log?limit=N',  description: 'Ultimi N log trade (default 50, più recente prima)' },
  { method: 'GET',  path: '/equity',       description: 'Storico equity persistente su disco' },
  { method: 'GET',  path: '/news',         description: 'Cache news corrente (RSS ForexLive, Kitco, Yahoo)' },
  { method: 'GET',  path: '/health',       description: 'Health check: Claude, news, portfolio, uptime, versione' },
];

interface FieldDef {
  label: string;
  key:   string;
  val:   string;
  set:   (v: string) => void;
  ph:    string;
  note:  string;
}

// ── Main component ────────────────────────────────────────────────────

export function ConfigTab() {
  const {
    serverUrl, setServerUrl,
    anthropicKey, setAnthropicKey,
    twelveKey, setTwelveKey,
    isDemoMode, setDemoMode,
  } = useAppStore();

  const fields: FieldDef[] = [
    { label: 'SERVER VPS URL',  key: 'server', val: serverUrl,    set: setServerUrl,    ph: 'http://IP:3000', note: 'URL del tuo VPS Contabo'   },
    { label: 'ANTHROPIC KEY',   key: 'ant',    val: anthropicKey, set: setAnthropicKey, ph: 'sk-ant-...',     note: 'Per AI market analysis'     },
    { label: 'TWELVE DATA KEY', key: 'tw',     val: twelveKey,    set: setTwelveKey,    ph: 'abc123...',      note: 'Forex, indici, metalli'     },
  ];

  const handleReset = () => {
    if (!confirm('Reset completo localStorage SwiftTrend? Il browser si ricaricherà.')) return;
    ['sw_demo_mode', 'sw_server_url', 'sw_anthropic_key', 'sw_twelve_key', 'swifttrend-store']
      .forEach(k => localStorage.removeItem(k));
    location.reload();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── CONFIGURAZIONE ── */}
      <div className="sw-panel">
        <div className="sw-panel-header">
          <div className="sw-panel-title">CONFIGURAZIONE SISTEMA</div>
        </div>
        <div style={{ padding: '18px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {fields.map(f => (
              <div key={f.key}>
                <span className="sw-config-label">{f.label}</span>
                <div style={{ fontSize: 8, color: 'var(--text3)', marginBottom: 6 }}>{f.note}</div>
                <input
                  type="password"
                  className="sw-input"
                  value={f.val}
                  onChange={e => f.set(e.target.value)}
                  placeholder={f.ph}
                />
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: 1 }}>DEMO MODE</span>
            <button
              type="button"
              className={`sw-btn${isDemoMode ? ' sw-btn-cyan' : ''}`}
              onClick={() => setDemoMode(!isDemoMode)}
            >
              {isDemoMode ? '✓ ATTIVO' : 'DISATTIVO'}
            </button>
            <span style={{ fontSize: 9, color: 'var(--text3)' }}>Usa dati simulati senza VPS</span>

            {isDemoMode && serverUrl && (
              <button
                type="button"
                className="sw-btn"
                style={{ background: 'rgba(152,195,121,0.12)', color: 'var(--green)', border: '1px solid var(--green)', marginLeft: 8 }}
                onClick={() => setDemoMode(false)}
              >
                ▶ PASSA A LIVE
              </button>
            )}

            <button
              type="button"
              className="sw-btn"
              style={{ marginLeft: 'auto', fontSize: 8, opacity: 0.55 }}
              onClick={handleReset}
            >
              🗑 RESET LOCALSTORAGE
            </button>
          </div>
        </div>
      </div>

      {/* ── API ENDPOINTS ── */}
      <div className="sw-panel">
        <div className="sw-panel-header">
          <div className="sw-panel-title">API ENDPOINTS v4.3</div>
        </div>
        <div style={{ padding: '14px 24px' }}>
          {API_ENDPOINTS.map(ep => (
            <div
              key={`${ep.method}-${ep.path}`}
              style={{
                display: 'grid', gridTemplateColumns: '40px 200px 1fr',
                gap: 12, padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 10,
              }}
            >
              <span style={{ color: ep.method === 'POST' ? 'var(--orange)' : 'var(--cyan)', fontWeight: 700, fontSize: 9 }}>
                {ep.method}
              </span>
              <span style={{ color: 'var(--green)', fontFamily: 'var(--mono)' }}>{ep.path}</span>
              <span style={{ color: 'var(--text3)', fontSize: 9 }}>{ep.description}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
