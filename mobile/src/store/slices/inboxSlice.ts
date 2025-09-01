import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface InboxState {
  messages: any[];
  currentChat: any | null;
  isLoading: boolean;
}

const initialState: InboxState = {
  messages: [],
  currentChat: null,
  isLoading: false,
};

const inboxSlice = createSlice({
  name: 'inbox',
  initialState,
  reducers: {
    setMessages: (state, action: PayloadAction<any[]>) => {
      state.messages = action.payload;
    },
    setCurrentChat: (state, action: PayloadAction<any>) => {
      state.currentChat = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const { setMessages, setCurrentChat, setLoading } = inboxSlice.actions;
export default inboxSlice.reducer;
