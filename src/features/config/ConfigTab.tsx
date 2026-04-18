import { useState } from 'react';
import { useAppStore } from '@/shared/store/useAppStore';
import type { ApiEndpoint } from '@/shared/types';

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

export function ConfigTab() {
  const {
    serverUrl, setServerUrl,
    anthropicKey, setAnthropicKey,
    twelveKey, setTwelveKey,
    isDemoMode, setDemoMode,
    addToast,
  } = useAppStore();

  // Local draft state — committed to store only on SALVA
  const [draftServer,    setDraftServer]    = useState(serverUrl);
  const [draftAnthropic, setDraftAnthropic] = useState(anthropicKey);
  const [draftTwelve,    setDraftTwelve]    = useState(twelveKey);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setServerUrl(draftServer.trim());
    setAnthropicKey(draftAnthropic.trim());
    setTwelveKey(draftTwelve.trim());
    // Switch off demo mode automatically if a server URL is provided
    if (draftServer.trim()) setDemoMode(false);
    setSaved(true);
    addToast('✓', 'Configurazione salvata');
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    if (!confirm('Reset completo localStorage SwiftTrend? Il browser si ricaricherà.')) return;
    ['sw_demo_mode', 'sw_server_url', 'sw_anthropic_key', 'sw_twelve_key', 'swifttrend-store']
      .forEach(k => localStorage.removeItem(k));
    location.reload();
  };

  const fields = [
    {
      key: 'server',
      label: 'SERVER VPS URL',
      note: 'URL del tuo VPS Contabo (es. http://1.2.3.4:3000)',
      ph: 'http://IP:3000',
      val: draftServer,
      set: setDraftServer,
      type: 'text',
    },
    {
      key: 'ant',
      label: 'ANTHROPIC API KEY',
      note: 'Per AI Market Analysis — sk-ant-...',
      ph: 'sk-ant-api03-...',
      val: draftAnthropic,
      set: setDraftAnthropic,
      type: 'password',
    },
    {
      key: 'tw',
      label: 'TWELVE DATA API KEY',
      note: 'Forex, indici, metalli — twelvedata.com',
      ph: 'abc123...',
      val: draftTwelve,
      set: setDraftTwelve,
      type: 'password',
    },
  ] as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── CONFIGURAZIONE ── */}
      <div className="sw-panel">
        <div className="sw-panel-header">
          <div className="sw-panel-title">CONFIGURAZIONE SISTEMA</div>
        </div>
        <div style={{ padding: '18px 24px' }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
            {fields.map(f => (
              <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="sw-config-label">{f.label}</span>
                <div style={{ fontSize: 8, color: 'var(--text3)', marginBottom: 2 }}>{f.note}</div>
                <input
                  type={f.type}
                  className="sw-input"
                  value={f.val}
                  onChange={e => f.set(e.target.value)}
                  placeholder={f.ph}
                  autoComplete="off"
                  spellCheck={false}
                />
                {/* Show current saved value indicator */}
                {f.key === 'server' && serverUrl && (
                  <div style={{ fontSize: 8, color: 'var(--green)', marginTop: 2 }}>
                    ✓ Salvato: {serverUrl}
                  </div>
                )}
                {f.key === 'ant' && anthropicKey && (
                  <div style={{ fontSize: 8, color: 'var(--green)', marginTop: 2 }}>
                    ✓ Key salvata ({anthropicKey.length} caratteri)
                  </div>
                )}
                {f.key === 'tw' && twelveKey && (
                  <div style={{ fontSize: 8, color: 'var(--green)', marginTop: 2 }}>
                    ✓ Key salvata ({twelveKey.length} caratteri)
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── SALVA ── */}
          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="sw-btn sw-btn-cyan"
              style={{ fontSize: 11, padding: '8px 24px', fontWeight: 700, letterSpacing: 1 }}
              onClick={handleSave}
            >
              {saved ? '✓ SALVATO' : '💾 SALVA CONFIGURAZIONE'}
            </button>

            <span style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: 1 }}>DEMO MODE</span>
            <button
              type="button"
              className={`sw-btn${isDemoMode ? ' sw-btn-cyan' : ''}`}
              onClick={() => setDemoMode(!isDemoMode)}
            >
              {isDemoMode ? '✓ ATTIVO' : 'DISATTIVO'}
            </button>
            <span style={{ fontSize: 9, color: 'var(--text3)' }}>Usa dati simulati senza VPS</span>

            <button
              type="button"
              className="sw-btn"
              style={{ marginLeft: 'auto', fontSize: 8, opacity: 0.55 }}
              onClick={handleReset}
            >
              🗑 RESET LOCALSTORAGE
            </button>
          </div>

          {/* ── STATUS ATTUALE ── */}
          <div style={{
            marginTop: 16, padding: '10px 14px', borderRadius: 6,
            background: isDemoMode ? 'rgba(229,192,123,0.05)' : serverUrl ? 'rgba(35,209,139,0.05)' : 'rgba(56,189,248,0.05)',
            border: `1px solid ${isDemoMode ? 'rgba(229,192,123,0.2)' : serverUrl ? 'rgba(35,209,139,0.2)' : 'rgba(56,189,248,0.1)'}`,
            fontSize: 9, display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            <div style={{ fontWeight: 700, letterSpacing: 1, color: isDemoMode ? 'var(--yellow)' : serverUrl ? 'var(--green)' : 'var(--cyan)' }}>
              {isDemoMode ? '⚠ MODALITÀ DEMO' : serverUrl ? '● MODALITÀ LIVE' : '○ IN ATTESA DI CONFIGURAZIONE'}
            </div>
            <div style={{ color: 'var(--text3)' }}>
              Server: <span style={{ color: 'var(--text2)' }}>{serverUrl || '—'}</span>
              {' · '}
              Anthropic: <span style={{ color: anthropicKey ? 'var(--green)' : 'var(--red)' }}>{anthropicKey ? '✓' : '✗'}</span>
              {' · '}
              Twelve Data: <span style={{ color: twelveKey ? 'var(--green)' : 'var(--red)' }}>{twelveKey ? '✓' : '✗'}</span>
            </div>
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
