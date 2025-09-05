import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '../../services/api';

// Types
interface Event {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  type: 'live' | 'festival' | 'promotion' | 'og_sale';
  startDate: Date;
  endDate: Date;
  highlight?: string;
  rewards?: {
    coins?: number;
    gifts?: string[];
    ogDiscount?: number;
  };
  isActive: boolean;
}

interface EventState {
  currentEvent: Event | null;
  upcomingEvents: Event[];
  pastEvents: Event[];
  loading: boolean;
  error: string | null;
}

// Initial state
const initialState: EventState = {
  currentEvent: null,
  upcomingEvents: [],
  pastEvents: [],
  loading: false,
  error: null,
};

// Async thunks
export const fetchCurrentEvents = createAsyncThunk(
  'events/fetchCurrent',
  async () => {
    const response = await apiService.get('/api/v1/events/current');
    return response.data.data;
  }
);

export const fetchUpcomingEvents = createAsyncThunk(
  'events/fetchUpcoming',
  async () => {
    const response = await apiService.get('/api/v1/events/upcoming');
    return response.data.data;
  }
);

export const participateInEvent = createAsyncThunk(
  'events/participate',
  async (eventId: string) => {
    const response = await apiService.post(`/api/v1/events/${eventId}/participate`);
    return response.data.data;
  }
);

// Slice
const eventSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    setCurrentEvent: (state, action: PayloadAction<Event | null>) => {
      state.currentEvent = action.payload;
    },
    clearEvents: (state) => {
      state.currentEvent = null;
      state.upcomingEvents = [];
      state.pastEvents = [];
    },
  },
  extraReducers: (builder) => {
    // Fetch current events
    builder
      .addCase(fetchCurrentEvents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCurrentEvents.fulfilled, (state, action) => {
        state.loading = false;
        state.currentEvent = action.payload.current;
        state.upcomingEvents = action.payload.upcoming || [];
      })
      .addCase(fetchCurrentEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch events';
      });

    // Fetch upcoming events
    builder
      .addCase(fetchUpcomingEvents.fulfilled, (state, action) => {
        state.upcomingEvents = action.payload;
      });

    // Participate in event
    builder
      .addCase(participateInEvent.fulfilled, (state, action) => {
        // Update participation status if needed
        if (state.currentEvent && state.currentEvent.id === action.payload.eventId) {
          // Update event data
        }
      });
  },
});

// Export actions
export const { setCurrentEvent, clearEvents } = eventSlice.actions;

// Export reducer
export default eventSlice.reducer;