import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User } from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  initialized: false,
};

// Helper to get user from cookie (client-side)
const getUserFromCookie = (): User | null => {
  if (typeof window === 'undefined') return null;
  try {
    const userCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('user='));
    if (userCookie) {
      const userData = decodeURIComponent(userCookie.split('=')[1]);
      return JSON.parse(userData);
    }
  } catch (error) {
    console.error('Error parsing user cookie:', error);
  }
  return null;
};

// Async thunks - using Next.js API routes with HTTP-only cookies
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.error || 'Login failed');
      }

      // New standardized format: data.data?.user or data.user (backward compatible)
      return data.data?.user || data.user;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (
    userData: { email: string; password: string; name: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.error || 'Registration failed');
      }

      // New standardized format: data.data?.user or data.user (backward compatible)
      return data.data?.user || data.user || data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Registration failed');
    }
  }
);

export const checkAuth = createAsyncThunk(
  'auth/checkAuth',
  async (_, { rejectWithValue }) => {
    try {
      // First check if user cookie exists
      const user = getUserFromCookie();
      if (!user) {
        return rejectWithValue('Not authenticated');
      }

      // Verify with server (suppress 401 errors in console as they're expected)
      const response = await fetch('/api/auth/me', {
        // Don't log 401 errors to console - they're expected when not logged in
        credentials: 'same-origin',
      });

      if (!response.ok) {
        // Silently fail for 401 - user just isn't logged in
        if (response.status === 401) {
          return rejectWithValue('Not authenticated');
        }
        return rejectWithValue('Session expired');
      }

      const data = await response.json();
      // New standardized format: data.data?.user or data.user (backward compatible)
      return data.data?.user || data.user;
    } catch (error: any) {
      // Don't log network errors for auth checks
      return rejectWithValue('Authentication check failed');
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
    });

    if (!response.ok) {
      console.error('Logout failed on server');
    }

    return;
  } catch (error: any) {
    return rejectWithValue(error.message || 'Logout failed');
  }
});

export const refreshSession = createAsyncThunk(
  'auth/refreshSession',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
      });

      if (!response.ok) {
        return rejectWithValue('Session refresh failed');
      }

      return;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Session refresh failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.initialized = true;
    },
    clearAuth: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      state.initialized = true;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    setInitialized: (state) => {
      state.initialized = true;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.initialized = true;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.initialized = true;
      });

    // Register
    builder
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Check Auth
    builder
      .addCase(checkAuth.pending, (state) => {
        state.loading = true;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.initialized = true;
        state.error = null;
      })
      .addCase(checkAuth.rejected, (state) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.initialized = true;
      });

    // Logout
    builder
      .addCase(logout.pending, (state) => {
        state.loading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.loading = false;
        state.error = null;
      })
      .addCase(logout.rejected, (state) => {
        // Clear state even if logout fails on server
        state.user = null;
        state.isAuthenticated = false;
        state.loading = false;
      });

    // Refresh Session
    builder
      .addCase(refreshSession.fulfilled, (state) => {
        // Session refreshed successfully
        state.error = null;
      })
      .addCase(refreshSession.rejected, (state) => {
        // Clear auth state if refresh fails
        state.user = null;
        state.isAuthenticated = false;
      });
  },
});

export const { setUser, clearAuth, updateUser, setInitialized, clearError } = authSlice.actions;
export default authSlice.reducer;
