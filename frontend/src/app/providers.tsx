'use client';

import { Provider } from 'react-redux';
import { store } from '@/store';
import { useEffect } from 'react';
import { loadCart } from '@/store/slices/cartSlice';
import { checkAuth, setInitialized } from '@/store/slices/authSlice';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Load cart from localStorage on mount
    store.dispatch(loadCart());

    // Check authentication status on mount (restore session if cookies exist)
    store.dispatch(checkAuth()).finally(() => {
      store.dispatch(setInitialized());
    });

    // Set up automatic token refresh every 14 minutes (before 15min expiry)
    const refreshInterval = setInterval(() => {
      const state = store.getState();
      if (state.auth.isAuthenticated) {
        fetch('/api/auth/refresh', { method: 'POST' }).catch((error) => {
          console.error('Token refresh failed:', error);
        });
      }
    }, 14 * 60 * 1000); // 14 minutes

    return () => clearInterval(refreshInterval);
  }, []);

  return <Provider store={store}>{children}</Provider>;
}
