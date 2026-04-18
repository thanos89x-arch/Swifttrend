import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TabId, Toast } from '@/shared/types';

interface AppStore {
  // State
  serverUrl: string;
  anthropicKey: string;
  twelveKey: string;
  isDemoMode: boolean;
  activeTab: TabId;
  toasts: Toast[];

  // Actions
  setServerUrl: (url: string) => void;
  setAnthropicKey: (key: string) => void;
  setTwelveKey: (key: string) => void;
  setDemoMode: (isDemo: boolean) => void;
  setActiveTab: (tab: TabId) => void;
  addToast: (icon: string, msg: string) => void;
  removeToast: (id: number) => void;
  clearToasts: () => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Initial state
      serverUrl: '',
      anthropicKey: '',
      twelveKey: '',
      isDemoMode: false,
      activeTab: 'LIVE MONITOR' as TabId,
      toasts: [],

      // Actions
      setServerUrl: (url) => set({ serverUrl: url }),

      setAnthropicKey: (key) => set({ anthropicKey: key }),

      setTwelveKey: (key) => set({ twelveKey: key }),

      setDemoMode: (isDemo) => set({ isDemoMode: isDemo }),

      setActiveTab: (tab) => set({ activeTab: tab }),

      addToast: (icon, msg) => {
        const newToast: Toast = {
          id: Date.now(),
          icon,
          msg,
          fading: false,
        };
        set((state) => ({
          toasts: [...state.toasts.slice(-4), newToast], // Keep max 5 toasts
        }));

        // Auto-remove after 5 seconds
        setTimeout(() => {
          get().removeToast(newToast.id);
        }, 5000);
      },

      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((toast) => toast.id !== id),
        })),

      clearToasts: () => set({ toasts: [] }),
    }),
    {
      name: 'swifttrend-store',
      partialize: (state) => ({
        serverUrl: state.serverUrl,
        anthropicKey: state.anthropicKey,
        twelveKey: state.twelveKey,
        isDemoMode: state.isDemoMode,
        activeTab: state.activeTab,
      }),
    }
  )
);