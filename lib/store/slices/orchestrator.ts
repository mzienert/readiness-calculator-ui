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
    initializeSession: (state, action: PayloadAction<{ userId: string }>) => {
      state.currentSession = {
        currentAgent: 'qualifier',
        phase: 'qualifying',
        responses: [],
        sessionId: crypto.randomUUID(),
        userId: action.payload.userId,
        startedAt: new Date(),
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

// Selectors
export const selectCurrentSession = (state: { orchestrator: OrchestratorState }) => 
  state.orchestrator.currentSession;

export const selectCurrentAgent = (state: { orchestrator: OrchestratorState }) => 
  state.orchestrator.currentSession?.currentAgent;

export const selectCurrentPhase = (state: { orchestrator: OrchestratorState }) => 
  state.orchestrator.currentSession?.phase;

export const selectIsProcessing = (state: { orchestrator: OrchestratorState }) => 
  state.orchestrator.isProcessing;

export const selectProgress = (state: { orchestrator: OrchestratorState }) => {
  if (!state.orchestrator.currentSession) return null;
  
  // Progress calculation moved from orchestrator class to selector
  const session = state.orchestrator.currentSession;
  const phaseMap = {
    qualifying: { step: 1, name: 'Business Context' },
    assessing: { step: 2, name: 'Assessment Questions' },
    analyzing: { step: 3, name: 'Analysis & Scoring' },
    reporting: { step: 4, name: 'Report Generation' },
    complete: { step: 4, name: 'Complete' },
  };

  const totalSteps = 4;
  const currentPhase = phaseMap[session.phase];

  return {
    phase: session.phase,
    currentAgent: session.currentAgent,
    completedSteps: currentPhase.step - 1,
    totalSteps,
    progress: Math.round(((currentPhase.step - 1) / totalSteps) * 100),
  };
};

export default orchestratorSlice.reducer;