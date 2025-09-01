import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Slices
import authSlice from './slices/authSlice';
import userSlice from './slices/userSlice';
import liveSlice from './slices/liveSlice';
import reelsSlice from './slices/reelsSlice';
import gamesSlice from './slices/gamesSlice';
import walletSlice from './slices/walletSlice';
import ogStoreSlice from './slices/ogStoreSlice';
import inboxSlice from './slices/inboxSlice';
import settingsSlice from './slices/settingsSlice';
import featureFlagsSlice from './slices/featureFlagsSlice';

// Persist config
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'user', 'settings', 'wallet'], // Only persist these slices
};

const persistedAuthReducer = persistReducer(persistConfig, authSlice);
const persistedUserReducer = persistReducer(persistConfig, userSlice);
const persistedSettingsReducer = persistReducer(persistConfig, settingsSlice);
const persistedWalletReducer = persistReducer(persistConfig, walletSlice);

export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
    user: persistedUserReducer,
    live: liveSlice,
    reels: reelsSlice,
    games: gamesSlice,
    wallet: persistedWalletReducer,
    ogStore: ogStoreSlice,
    inbox: inboxSlice,
    settings: persistedSettingsReducer,
    featureFlags: featureFlagsSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
