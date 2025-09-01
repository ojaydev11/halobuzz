import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface GamesState {
  games: any[];
  currentGame: any | null;
  isLoading: boolean;
}

const initialState: GamesState = {
  games: [],
  currentGame: null,
  isLoading: false,
};

const gamesSlice = createSlice({
  name: 'games',
  initialState,
  reducers: {
    setGames: (state, action: PayloadAction<any[]>) => {
      state.games = action.payload;
    },
    setCurrentGame: (state, action: PayloadAction<any>) => {
      state.currentGame = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const { setGames, setCurrentGame, setLoading } = gamesSlice.actions;
export default gamesSlice.reducer;
