import { configureStore } from '@reduxjs/toolkit';
import orchestratorReducer from './slices/orchestrator';

export const store = configureStore({
  reducer: {
    orchestrator: orchestratorReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;