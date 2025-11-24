'use client';

import { Provider } from 'react-redux';
import { store } from '@/store';
import { useEffect, useState } from 'react';
import { loadCart } from '@/store/slices/cartSlice';
import { checkAuth, setInitialized } from '@/store/slices/authSlice';
import { OrderSocketProvider } from '@/providers/OrderSocketProvider';
import { getCookie } from '@/lib/cookies';

export function Providers({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    console.log('[Providers] Initializing app...');

    // Load cart from localStorage on mount
    store.dispatch(loadCart());

    // Check authentication status on mount (restore session if cookies exist)
    store.dispatch(checkAuth()).finally(() => {
      store.dispatch(setInitialized());
    });

    // Get WebSocket token from cookie (non-HTTP-only cookie for WebSocket auth)
    const token = getCookie('wsToken');
    console.log('[Providers] wsToken from cookie:', token ? `${token.substring(0, 20)}...` : 'NOT FOUND');
    setAccessToken(token);

    // Listen for token changes (login/logout events)
    const handleStorageChange = () => {
      const newToken = getCookie('wsToken');
      console.log('[Providers] Token changed. New token:', newToken ? `${newToken.substring(0, 20)}...` : 'NULL');
      setAccessToken(newToken);
    };

    // Listen for custom events when token changes
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('wsTokenChanged', handleStorageChange);

    // Set up automatic token refresh every 14 minutes (before 15min expiry)
    const refreshInterval = setInterval(() => {
      const state = store.getState();
      if (state.auth.isAuthenticated) {
        fetch('/api/auth/refresh', { method: 'POST' }).catch((error) => {
          console.error('Token refresh failed:', error);
        });
      }
    }, 14 * 60 * 1000); // 14 minutes

    return () => {
      clearInterval(refreshInterval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('wsTokenChanged', handleStorageChange);
    };
  }, []);

  return (
    <Provider store={store}>
      <OrderSocketProvider accessToken={accessToken}>
        {children}
      </OrderSocketProvider>
    </Provider>
  );
}
