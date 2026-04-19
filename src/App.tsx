import { useAppStore } from '@/shared/store/useAppStore';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';
import type { TabId } from '@/shared/types';
import { LiveMonitor } from '@/features/live-monitor/LiveMonitor';
import { PerformanceTab } from '@/features/performance/PerformanceTab';
import { FTMOTab } from '@/features/ftmo/FTMOTab';
import { MarketAnalysis } from '@/features/market-ai/MarketAnalysis';
import { NewsTab } from '@/features/news/NewsTab';
import { MacroTab } from '@/features/macro/MacroTab';
import { ConfigTab } from '@/features/config/ConfigTab';
import { ConsigliTab } from '@/features/signals/ConsigliTab';
import { ToastContainer } from '@/shared/ui/ToastContainer';
import { PriceTicker } from '@/shared/ui/PriceTicker';

// ── Ordinamento canonico dei tab – unica fonte di verità ──────────────
const TABS: TabId[] = [
  'LIVE MONITOR',
  'PERFORMANCE',
  'FTMO 100K',
  'MARKET AI',
  'NEWS FEED',
  'MACRO',
  'CONFIG',
  '⭐ CONSIGLI',
];

// ── Tab router ────────────────────────────────────────────────────────
// Ogni branch verrà rimpiazzato dal componente reale in FASE 2.
function TabContent({ tab }: { tab: TabId }) {
  switch (tab) {
    case 'LIVE MONITOR':
      return <LiveMonitor />;
    case 'PERFORMANCE':
      return <PerformanceTab />;
    case 'FTMO 100K':
      return <FTMOTab />;
    case 'MARKET AI':
      return <MarketAnalysis />;
    case 'NEWS FEED':
      return <NewsTab />;
    case 'MACRO':
      return <MacroTab />;
    case 'CONFIG':
      return <ConfigTab />;
    case '⭐ CONSIGLI':
      return <ConsigliTab />;
    default:
      return (
        <div className="sw-empty-wrap">
          <div className="sw-empty">{tab} – in corso di migrazione</div>
        </div>
      );
  }
}

// ── Shell dell'applicazione ───────────────────────────────────────────
function AppContent() {
  const { activeTab, setActiveTab, isDemoMode, toasts, removeToast } =
    useAppStore();

  return (
    <div className="sw-root">
      {/* ── Header ── */}
      <div className="sw-header">
        <div className="sw-logo">
          <span className="sw-logo-icon">⚡</span>
          <span className="sw-logo-name">SwiftTrend AI</span>
          <span className="sw-logo-ver">v22</span>
          {isDemoMode && <span className="sw-demo-badge">DEMO</span>}
        </div>

        <nav className="sw-tabs" aria-label="Navigazione tab">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`sw-tab${activeTab === tab ? ' sw-tab--active' : ''}`}
              onClick={() => setActiveTab(tab)}
              aria-current={activeTab === tab ? 'page' : undefined}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Ticker prezzi live ── */}
      <PriceTicker />

      {/* ── Contenuto principale ── */}
      <main className="sw-main">
        <TabContent tab={activeTab} />
      </main>

      {/* ── Notifiche toast ── */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

// ── Entry point ───────────────────────────────────────────────────────
export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
