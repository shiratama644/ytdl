'use client';

import { useEffect } from 'react';
import { initTheme } from '@/lib/stores/theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initTheme();
  }, []);
  return <>{children}</>;
}
