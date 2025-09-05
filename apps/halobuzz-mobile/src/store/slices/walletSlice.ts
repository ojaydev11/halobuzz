import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '../../services/api';

// Types
interface Transaction {
  id: string;
  type: 'credit' | 'debit' | 'gift' | 'reward';
  amount: number;
  description: string;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed';
}

interface WalletState {
  balance: number;
  pendingBalance: number;
  transactions: Transaction[];
  dailyBonusAvailable: boolean;
  dailyStreak: number;
  loading: boolean;
  error: string | null;
}

// Initial state
const initialState: WalletState = {
  balance: 0,
  pendingBalance: 0,
  transactions: [],
  dailyBonusAvailable: false,
  dailyStreak: 0,
  loading: false,
  error: null,
};

// Async thunks
export const fetchWalletInfo = createAsyncThunk(
  'wallet/fetchInfo',
  async () => {
    const response = await apiService.get('/api/v1/wallet/info');
    return response.data.data;
  }
);

export const checkDailyBonus = createAsyncThunk(
  'wallet/checkDailyBonus',
  async () => {
    const response = await apiService.get('/api/v1/wallet/daily-bonus/check');
    return response.data.data;
  }
);

export const claimDailyBonus = createAsyncThunk(
  'wallet/claimDailyBonus',
  async () => {
    const response = await apiService.post('/api/v1/wallet/daily-bonus/claim');
    return response.data.data;
  }
);

export const topUpCoins = createAsyncThunk(
  'wallet/topUp',
  async ({ provider, amount }: { provider: string; amount: number }) => {
    const response = await apiService.post(`/api/v1/wallet/topup/${provider}`, { 
      amount 
    });
    return response.data.data;
  }
);

// Slice
const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    updateBalance: (state, action: PayloadAction<number>) => {
      state.balance = action.payload;
    },
    addTransaction: (state, action: PayloadAction<Transaction>) => {
      state.transactions.unshift(action.payload);
      if (state.transactions.length > 50) {
        state.transactions.pop(); // Keep only last 50 transactions
      }
    },
    setDailyBonusAvailable: (state, action: PayloadAction<boolean>) => {
      state.dailyBonusAvailable = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch wallet info
    builder
      .addCase(fetchWalletInfo.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWalletInfo.fulfilled, (state, action) => {
        state.loading = false;
        state.balance = action.payload.balance;
        state.pendingBalance = action.payload.pendingBalance;
        state.transactions = action.payload.transactions;
      })
      .addCase(fetchWalletInfo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch wallet info';
      });

    // Check daily bonus
    builder
      .addCase(checkDailyBonus.fulfilled, (state, action) => {
        state.dailyBonusAvailable = action.payload.available;
        state.dailyStreak = action.payload.streak;
      });

    // Claim daily bonus
    builder
      .addCase(claimDailyBonus.pending, (state) => {
        state.loading = true;
      })
      .addCase(claimDailyBonus.fulfilled, (state, action) => {
        state.loading = false;
        state.dailyBonusAvailable = false;
        state.balance = action.payload.newBalance;
        state.dailyStreak = action.payload.streak;
        
        // Add bonus transaction
        state.transactions.unshift({
          id: action.payload.transactionId,
          type: 'reward',
          amount: action.payload.bonusAmount,
          description: `Daily Bonus - Day ${action.payload.streak}`,
          timestamp: new Date(),
          status: 'completed',
        });
      })
      .addCase(claimDailyBonus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to claim daily bonus';
      });

    // Top up coins
    builder
      .addCase(topUpCoins.pending, (state) => {
        state.loading = true;
      })
      .addCase(topUpCoins.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.status === 'success') {
          state.pendingBalance += action.payload.amount;
        }
      })
      .addCase(topUpCoins.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to top up coins';
      });
  },
});

// Export actions
export const { 
  updateBalance, 
  addTransaction, 
  setDailyBonusAvailable 
} = walletSlice.actions;

// Export reducer
export default walletSlice.reducer;