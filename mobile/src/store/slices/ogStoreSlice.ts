import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface OGStoreState {
  items: any[];
  currentItem: any | null;
  isLoading: boolean;
}

const initialState: OGStoreState = {
  items: [],
  currentItem: null,
  isLoading: false,
};

const ogStoreSlice = createSlice({
  name: 'ogStore',
  initialState,
  reducers: {
    setItems: (state, action: PayloadAction<any[]>) => {
      state.items = action.payload;
    },
    setCurrentItem: (state, action: PayloadAction<any>) => {
      state.currentItem = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const { setItems, setCurrentItem, setLoading } = ogStoreSlice.actions;
export default ogStoreSlice.reducer;
