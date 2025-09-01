import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authService } from '../../services/authService';

export interface AuthState {
  isAuthenticated: boolean;
  onboardingComplete: boolean;
  ageVerified: boolean;
  countrySelected: string | null;
  user: {
    id: string | null;
    username: string | null;
    email: string | null;
    phone: string | null;
    avatar: string | null;
    ogTier: number;
    isVerified: boolean;
  } | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  onboardingComplete: false,
  ageVerified: false,
  countrySelected: null,
  user: null,
  loading: false,
  error: null,
};

// Async thunks
export const verifyAge = createAsyncThunk(
  'auth/verifyAge',
  async (age: number) => {
    if (age < 13) {
      throw new Error('You must be at least 13 years old to use this app');
    }
    return age;
  }
);

export const selectCountry = createAsyncThunk(
  'auth/selectCountry',
  async (country: string) => {
    return country;
  }
);

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }) => {
    const response = await authService.login(credentials);
    return response;
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData: { 
    username: string; 
    email: string; 
    password: string; 
    phone?: string;
    country: string;
  }) => {
    const response = await authService.register(userData);
    return response;
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async () => {
    await authService.logout();
  }
);

export const checkAuthStatus = createAsyncThunk(
  'auth/checkStatus',
  async () => {
    const response = await authService.checkAuthStatus();
    return response;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setOnboardingComplete: (state, action: PayloadAction<boolean>) => {
      state.onboardingComplete = action.payload;
    },
    setAgeVerified: (state, action: PayloadAction<boolean>) => {
      state.ageVerified = action.payload;
    },
    setCountrySelected: (state, action: PayloadAction<string>) => {
      state.countrySelected = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateUser: (state, action: PayloadAction<Partial<AuthState['user']>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Verify Age
      .addCase(verifyAge.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyAge.fulfilled, (state) => {
        state.ageVerified = true;
        state.loading = false;
      })
      .addCase(verifyAge.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Age verification failed';
      })
      // Select Country
      .addCase(selectCountry.fulfilled, (state, action) => {
        state.countrySelected = action.payload;
      })
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.loading = false;
        state.onboardingComplete = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Login failed';
      })
      // Register
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.loading = false;
        state.onboardingComplete = true;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Registration failed';
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.onboardingComplete = false;
        state.ageVerified = false;
        state.countrySelected = null;
      })
      // Check Auth Status
      .addCase(checkAuthStatus.pending, (state) => {
        state.loading = true;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.onboardingComplete = true;
        state.loading = false;
      })
      .addCase(checkAuthStatus.rejected, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.loading = false;
      });
  },
});

export const {
  setOnboardingComplete,
  setAgeVerified,
  setCountrySelected,
  clearError,
  updateUser,
} = authSlice.actions;

// Selectors
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectOnboardingComplete = (state: { auth: AuthState }) => state.auth.onboardingComplete;
export const selectAgeVerified = (state: { auth: AuthState }) => state.auth.ageVerified;
export const selectCountrySelected = (state: { auth: AuthState }) => state.auth.countrySelected;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.loading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;

export default authSlice.reducer;
