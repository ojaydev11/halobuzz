import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authService } from '../../services/authService';

export interface UserState {
  profile: {
    id: string | null;
    username: string | null;
    email: string | null;
    phone: string | null;
    avatar: string | null;
    bio: string | null;
    ogTier: number;
    isVerified: boolean;
    followers: number;
    following: number;
    totalLikes: number;
    totalViews: number;
    joinDate: string | null;
    country: string | null;
  } | null;
  preferences: {
    notifications: {
      push: boolean;
      email: boolean;
      sms: boolean;
      liveStreams: boolean;
      messages: boolean;
      gifts: boolean;
      battles: boolean;
      games: boolean;
    };
    privacy: {
      profileVisibility: 'public' | 'private' | 'friends';
      showOnlineStatus: boolean;
      allowMessages: boolean;
      allowGifts: boolean;
    };
    content: {
      autoPlay: boolean;
      dataSaver: boolean;
      quality: 'low' | 'medium' | 'high';
      language: string;
    };
  };
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  profile: null,
  preferences: {
    notifications: {
      push: true,
      email: true,
      sms: false,
      liveStreams: true,
      messages: true,
      gifts: true,
      battles: true,
      games: true,
    },
    privacy: {
      profileVisibility: 'public',
      showOnlineStatus: true,
      allowMessages: true,
      allowGifts: true,
    },
    content: {
      autoPlay: true,
      dataSaver: false,
      quality: 'medium',
      language: 'en',
    },
  },
  loading: false,
  error: null,
};

// Async thunks
export const fetchUserProfile = createAsyncThunk(
  'user/fetchProfile',
  async () => {
    const response = await authService.checkAuthStatus();
    return response.user;
  }
);

export const updateUserProfile = createAsyncThunk(
  'user/updateProfile',
  async (profileData: Partial<UserState['profile']>) => {
    const response = await authService.updateProfile(profileData);
    return response;
  }
);

export const updateUserPreferences = createAsyncThunk(
  'user/updatePreferences',
  async (preferences: Partial<UserState['preferences']>) => {
    // Mock API call - replace with actual API
    return new Promise<UserState['preferences']>((resolve) => {
      setTimeout(() => {
        resolve(preferences as UserState['preferences']);
      }, 1000);
    });
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setProfile: (state, action: PayloadAction<UserState['profile']>) => {
      state.profile = action.payload;
    },
    updateProfileField: (state, action: PayloadAction<Partial<UserState['profile']>>) => {
      if (state.profile) {
        state.profile = { ...state.profile, ...action.payload };
      }
    },
    updatePreference: (state, action: PayloadAction<{ 
      category: keyof UserState['preferences']; 
      key: string; 
      value: any; 
    }>) => {
      const { category, key, value } = action.payload;
      if (state.preferences[category] && key in state.preferences[category]) {
        (state.preferences[category] as any)[key] = value;
      }
    },
    incrementFollowers: (state) => {
      if (state.profile) {
        state.profile.followers += 1;
      }
    },
    decrementFollowers: (state) => {
      if (state.profile && state.profile.followers > 0) {
        state.profile.followers -= 1;
      }
    },
    incrementFollowing: (state) => {
      if (state.profile) {
        state.profile.following += 1;
      }
    },
    decrementFollowing: (state) => {
      if (state.profile && state.profile.following > 0) {
        state.profile.following -= 1;
      }
    },
    incrementLikes: (state) => {
      if (state.profile) {
        state.profile.totalLikes += 1;
      }
    },
    incrementViews: (state) => {
      if (state.profile) {
        state.profile.totalViews += 1;
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Profile
      .addCase(fetchUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.profile = action.payload;
        state.loading = false;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch profile';
      })
      // Update Profile
      .addCase(updateUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.profile = action.payload;
        state.loading = false;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update profile';
      })
      // Update Preferences
      .addCase(updateUserPreferences.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUserPreferences.fulfilled, (state, action) => {
        state.preferences = { ...state.preferences, ...action.payload };
        state.loading = false;
      })
      .addCase(updateUserPreferences.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update preferences';
      });
  },
});

export const {
  setProfile,
  updateProfileField,
  updatePreference,
  incrementFollowers,
  decrementFollowers,
  incrementFollowing,
  decrementFollowing,
  incrementLikes,
  incrementViews,
  clearError,
} = userSlice.actions;

// Selectors
export const selectUserProfile = (state: { user: UserState }) => state.user.profile;
export const selectUserPreferences = (state: { user: UserState }) => state.user.preferences;
export const selectUserLoading = (state: { user: UserState }) => state.user.loading;
export const selectUserError = (state: { user: UserState }) => state.user.error;

export default userSlice.reducer;
