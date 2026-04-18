import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/shared/api/queryClient';
import { prefetchMarketData, prefetchNewsMacro, prefetchAISignals } from '@/shared/api/hooks';

export function AppProviders({ children }: { children: React.ReactNode }) {
  // Warm critical caches on first render — lazy useState fires exactly once per app mount,
  // avoids useEffect while still being synchronous with the render lifecycle.
  useState(() => {
    prefetchMarketData(queryClient);
    prefetchNewsMacro(queryClient);
    prefetchAISignals(queryClient);
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
