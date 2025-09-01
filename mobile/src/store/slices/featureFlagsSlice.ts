import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface FeatureFlagsState {
  flags: Record<string, boolean>;
  isLoading: boolean;
}

const initialState: FeatureFlagsState = {
  flags: {},
  isLoading: false,
};

const featureFlagsSlice = createSlice({
  name: 'featureFlags',
  initialState,
  reducers: {
    setFlags: (state, action: PayloadAction<Record<string, boolean>>) => {
      state.flags = action.payload;
    },
    setFlag: (state, action: PayloadAction<{ key: string; value: boolean }>) => {
      state.flags[action.payload.key] = action.payload.value;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const { setFlags, setFlag, setLoading } = featureFlagsSlice.actions;
export default featureFlagsSlice.reducer;
