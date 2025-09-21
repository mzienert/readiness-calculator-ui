import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface ExampleState {
  value: number;
  loading: boolean;
  error: string | null;
}

const initialState: ExampleState = {
  value: 0,
  loading: false,
  error: null,
};

export const exampleSlice = createSlice({
  name: 'example',
  initialState,
  reducers: {
    increment: (state) => {
      state.value += 1;
    },
    decrement: (state) => {
      state.value -= 1;
    },
    incrementByAmount: (state, action: PayloadAction<number>) => {
      state.value += action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    reset: () => initialState,
  },
});

export const {
  increment,
  decrement,
  incrementByAmount,
  setLoading,
  setError,
  reset,
} = exampleSlice.actions;

export default exampleSlice.reducer;
