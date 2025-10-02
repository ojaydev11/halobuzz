import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Performance: Define interfaces outside component to avoid re-creation
interface User {
  id: string;
  email: string;
  username: string;
  profile?: any;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'AUTH_RESET_ERROR' };

// Performance: Memoized reducer to prevent unnecessary re-renders
const authReducer = React.memo((state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return { ...state, isLoading: true, error: null };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        user: action.payload,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        error: action.payload,
      };
    case 'AUTH_LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        error: null,
      };
    case 'AUTH_RESET_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
});

// Performance: Pre-computed initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Performance: Separate contexts to avoid unnecessary re-renders
const AuthStateContext = createContext<AuthState>(initialState);
const AuthDispatchContext = createContext<React.Dispatch<AuthAction> | null>(null);

// Performance: Storage operations with caching
class AuthStorage {
  private static cache: Map<string, any> = new Map();

  static async getToken(): Promise<string | null> {
    if (this.cache.has('token')) {
      return this.cache.get('token');
    }
    try {
      const token = await AsyncStorage.getItem('authToken');
      this.cache.set('token', token);
      return token;
    } catch {
      return null;
    }
  }

  static async setToken(token: string): Promise<void> {
    this.cache.set('token', token);
    try {
      await AsyncStorage.setItem('authToken', token);
    } catch {
      // Fail silently
    }
  }

  static async removeToken(): Promise<void> {
    this.cache.delete('token');
    try {
      await AsyncStorage.removeItem('authToken');
    } catch {
      // Fail silently
    }
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const isInitialized = useRef(false);
  const retryCount = useRef(0);

  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;

      // Performance: Use requestAnimationFrame for non-critical init
      if (Platform.OS === 'web' && 'requestAnimationFrame' in window) {
        requestAnimationFrame(() => checkAuthStatus());
      } else {
        setTimeout(() => checkAuthStatus(), 0);
      }
    }
  }, []);

  const checkAuthStatus = async () => {
    try {
      dispatch({ type: 'AUTH_START' });
      const token = await AuthStorage.getToken();

      if (token) {
        // Performance: Lazy load API to avoid blocking startup
        const { validateToken } = await import('@/lib/api');
        const user = await validateToken(token);

        if (user) {
          dispatch({ type: 'AUTH_SUCCESS', payload: user });
        } else {
          await AuthStorage.removeToken();
          dispatch({ type: 'AUTH_FAILURE', payload: 'Token validation failed' });
        }
      } else {
        dispatch({ type: 'AUTH_FAILURE', payload: 'No token found' });
      }
    } catch (error) {
      // Performance: Exponential backoff for retries
      retryCount.current++;
      if (retryCount.current < 3) {
        setTimeout(() => checkAuthStatus(), Math.pow(2, retryCount.current) * 1000);
      } else {
        dispatch({ type: 'AUTH_FAILURE', payload: 'Authentication check failed' });
      }
    }
  };

  return (
    <AuthStateContext.Provider value={state}>
      <AuthDispatchContext.Provider value={dispatch}>
        {children}
      </AuthDispatchContext.Provider>
    </AuthStateContext.Provider>
  );
});

// Performance: Split hooks to prevent unnecessary re-renders
export const useAuthState = () => {
  const context = useContext(AuthStateContext);
  if (!context) {
    throw new Error('useAuthState must be used within AuthProvider');
  }
  return context;
};

export const useAuthDispatch = () => {
  const context = useContext(AuthDispatchContext);
  if (!context) {
    throw new Error('useAuthDispatch must be used within AuthProvider');
  }
  return context;
};

// Performance: Memoized combined hook for backward compatibility
const useAuthHook = React.memo(() => {
  const state = useAuthState();
  const dispatch = useAuthDispatch();

  // Performance: Memoized actions
  const actions = React.useMemo(() => ({
    login: async (token: string, user: User) => {
      await AuthStorage.setToken(token);
      dispatch({ type: 'AUTH_SUCCESS', payload: user });
    },
    logout: async () => {
      await AuthStorage.removeToken();
      dispatch({ type: 'AUTH_LOGOUT' });
    },
    resetError: () => dispatch({ type: 'AUTH_RESET_ERROR' }),
  }), [dispatch]);

  return { ...state, ...actions };
});

export const useAuth = useAuthHook;

AuthProvider.displayName = 'AuthProvider';