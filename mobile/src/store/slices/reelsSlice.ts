import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ReelsState {
  reels: any[];
  currentReel: any | null;
  isLoading: boolean;
}

const initialState: ReelsState = {
  reels: [],
  currentReel: null,
  isLoading: false,
};

const reelsSlice = createSlice({
  name: 'reels',
  initialState,
  reducers: {
    setReels: (state, action: PayloadAction<any[]>) => {
      state.reels = action.payload;
    },
    setCurrentReel: (state, action: PayloadAction<any>) => {
      state.currentReel = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const { setReels, setCurrentReel, setLoading } = reelsSlice.actions;
export default reelsSlice.reducer;
