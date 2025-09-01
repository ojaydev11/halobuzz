import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface LiveState {
  streams: any[];
  currentStream: any | null;
  isLoading: boolean;
}

const initialState: LiveState = {
  streams: [],
  currentStream: null,
  isLoading: false,
};

const liveSlice = createSlice({
  name: 'live',
  initialState,
  reducers: {
    setStreams: (state, action: PayloadAction<any[]>) => {
      state.streams = action.payload;
    },
    setCurrentStream: (state, action: PayloadAction<any>) => {
      state.currentStream = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const { setStreams, setCurrentStream, setLoading } = liveSlice.actions;
export default liveSlice.reducer;
