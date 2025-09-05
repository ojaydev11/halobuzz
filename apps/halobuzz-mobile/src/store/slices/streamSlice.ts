import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '../../services/api';

// Types
interface Stream {
  id: string;
  title: string;
  hostId: string;
  hostName: string;
  hostAvatar: string;
  thumbnail: string;
  viewers: number;
  country: string;
  countryFlag: string;
  tags: string[];
  category: string;
  isNewHost?: boolean;
  isHot?: boolean;
  startedAt: Date;
}

interface StreamState {
  streams: Stream[];
  activeStream: Stream | null;
  filter: string;
  searchQuery: string;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
}

// Initial state
const initialState: StreamState = {
  streams: [],
  activeStream: null,
  filter: 'all',
  searchQuery: '',
  loading: false,
  error: null,
  hasMore: true,
  page: 1,
};

// Async thunks
export const fetchActiveStreams = createAsyncThunk(
  'streams/fetchActive',
  async ({ page = 1, filter = 'all', search = '' }: { 
    page?: number; 
    filter?: string; 
    search?: string;
  }) => {
    const params: any = { page, limit: 10 };
    
    if (filter !== 'all') {
      params.region = filter;
    }
    
    if (search) {
      params.search = search;
    }
    
    const response = await apiService.get('/api/v1/streams/active', { params });
    return {
      streams: response.data.data,
      hasMore: response.data.hasMore,
      page,
    };
  }
);

export const joinStream = createAsyncThunk(
  'streams/join',
  async (streamId: string) => {
    const response = await apiService.post('/api/v1/streams/join', { streamId });
    return response.data.data;
  }
);

export const leaveStream = createAsyncThunk(
  'streams/leave',
  async (streamId: string) => {
    const response = await apiService.post('/api/v1/streams/leave', { streamId });
    return response.data.data;
  }
);

// Slice
const streamSlice = createSlice({
  name: 'streams',
  initialState,
  reducers: {
    setStreamFilter: (state, action: PayloadAction<string>) => {
      state.filter = action.payload;
      state.streams = []; // Clear streams when filter changes
      state.page = 1;
      state.hasMore = true;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    updateViewerCount: (state, action: PayloadAction<{ streamId: string; viewers: number }>) => {
      const stream = state.streams.find(s => s.id === action.payload.streamId);
      if (stream) {
        stream.viewers = action.payload.viewers;
      }
    },
    clearStreams: (state) => {
      state.streams = [];
      state.page = 1;
      state.hasMore = true;
    },
    setActiveStream: (state, action: PayloadAction<Stream | null>) => {
      state.activeStream = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch active streams
    builder
      .addCase(fetchActiveStreams.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchActiveStreams.fulfilled, (state, action) => {
        state.loading = false;
        
        if (action.payload.page === 1) {
          state.streams = action.payload.streams;
        } else {
          // Append for infinite scroll
          const existingIds = new Set(state.streams.map(s => s.id));
          const newStreams = action.payload.streams.filter(
            (s: Stream) => !existingIds.has(s.id)
          );
          state.streams.push(...newStreams);
        }
        
        state.hasMore = action.payload.hasMore;
        state.page = action.payload.page;
      })
      .addCase(fetchActiveStreams.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch streams';
      });

    // Join stream
    builder
      .addCase(joinStream.fulfilled, (state, action) => {
        state.activeStream = action.payload.stream;
      })
      .addCase(joinStream.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to join stream';
      });

    // Leave stream
    builder
      .addCase(leaveStream.fulfilled, (state) => {
        state.activeStream = null;
      });
  },
});

// Export actions
export const { 
  setStreamFilter, 
  setSearchQuery, 
  updateViewerCount, 
  clearStreams,
  setActiveStream 
} = streamSlice.actions;

// Export reducer
export default streamSlice.reducer;