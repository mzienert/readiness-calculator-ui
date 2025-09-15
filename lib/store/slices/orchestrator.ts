import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { AgentState } from '@/lib/ai/schemas';
import type { CoreMessage } from 'ai';

interface OrchestratorState {
  // Current session state
  currentSession: AgentState | null;
  
  // Processing state
  isProcessing: boolean;
  error: string | null;
  
  // UI state
  showProgress: boolean;
  sidebarOpen: boolean;
  
  // History (if needed)
  recentSessions: string[];
}

const initialState: OrchestratorState = {
  currentSession: null,
  isProcessing: false,
  error: null,
  showProgress: true,
  sidebarOpen: false,
  recentSessions: [],
};

// Database thunks (placeholders for future implementation)
export const loadSessionFromDB = createAsyncThunk(
  'orchestrator/loadSessionFromDB',
  async (sessionId: string) => {
    // TODO: Implement database loading
    console.log('Loading session from DB:', sessionId);
    return null; // Return AgentState | null
  }
);

export const saveSessionToDB = createAsyncThunk(
  'orchestrator/saveSessionToDB',
  async (state: AgentState) => {
    // TODO: Implement database persistence
    console.log('Saving session to DB:', state.sessionId);
    return state;
  }
);

export const resetSessionInDB = createAsyncThunk(
  'orchestrator/resetSessionInDB',
  async (sessionId: string) => {
    // TODO: Implement database reset
    console.log('Resetting session in DB:', sessionId);
  }
);

const orchestratorSlice = createSlice({
  name: 'orchestrator',
  initialState,
  reducers: {
    // UI actions
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setShowProgress: (state, action: PayloadAction<boolean>) => {
      state.showProgress = action.payload;
    },
    
    // Session management
    initializeSession: (state, action: PayloadAction<{ userId: string; threadId?: string }>) => {
      state.currentSession = {
        currentAgent: 'qualifier',
        phase: 'qualifying',
        responses: [],
        sessionId: crypto.randomUUID(),
        userId: action.payload.userId,
        threadId: action.payload.threadId,
        startedAt: new Date().toISOString(),
      };
      state.error = null;
    },
    
    updateSessionState: (state, action: PayloadAction<Partial<AgentState>>) => {
      if (state.currentSession) {
        Object.assign(state.currentSession, action.payload);
      }
    },
    
    clearSession: (state) => {
      state.currentSession = null;
      state.error = null;
    },
    
    clearError: (state) => {
      state.error = null;
    },
  },
  
  extraReducers: (builder) => {
    builder
      // Load session from DB
      .addCase(loadSessionFromDB.fulfilled, (state, action) => {
        if (action.payload) {
          state.currentSession = action.payload;
        }
      })
      .addCase(loadSessionFromDB.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to load session';
      })
      
      // Save session to DB
      .addCase(saveSessionToDB.fulfilled, (state, action) => {
        state.currentSession = action.payload;
        if (!state.recentSessions.includes(action.payload.sessionId)) {
          state.recentSessions.unshift(action.payload.sessionId);
        }
      })
      .addCase(saveSessionToDB.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to save session';
      })
      
      // Reset session in DB
      .addCase(resetSessionInDB.fulfilled, (state) => {
        state.currentSession = null;
      })
      .addCase(resetSessionInDB.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to reset session';
      });
  },
});

export const {
  toggleSidebar,
  setShowProgress,
  initializeSession,
  updateSessionState,
  clearSession,
  clearError,
} = orchestratorSlice.actions;


export default orchestratorSlice.reducer;