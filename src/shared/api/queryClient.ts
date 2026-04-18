import { QueryClient, type QueryClientConfig } from '@tanstack/react-query';

// Exponential back-off capped at 30 s: 1s → 2s → 4s → … → 30s
const exponentialBackoff = (attempt: number): number =>
  Math.min(1_000 * 2 ** attempt, 30_000);

const config: QueryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime:            10_000,   // override per-hook where required
      gcTime:               300_000,
      retry:                2,
      retryDelay:           exponentialBackoff,
      refetchOnWindowFocus: false,    // financial data doesn't need tab-focus refetch
      refetchOnReconnect:   true,
      networkMode:          'always', // don't pause on flaky network detection
      throwOnError:         false,    // ready for future ErrorBoundary opt-in
    },
    mutations: {
      retry:       0,                 // mutations are not idempotent — never auto-retry
      networkMode: 'always',
    },
  },
};

export const queryClient = new QueryClient(config);
