import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AssessmentOrchestrator } from '@/lib/ai/orchestrator';
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

// Async thunks
export const processMessage = createAsyncThunk(
  'orchestrator/processMessage',
  async ({ messages, userId }: { messages: CoreMessage[]; userId: string }) => {
    const orchestrator = new AssessmentOrchestrator();
    return await orchestrator.processMessage(messages, userId);
  }
);

export const loadSession = createAsyncThunk(
  'orchestrator/loadSession',
  async (sessionId: string) => {
    const orchestrator = new AssessmentOrchestrator();
    return await orchestrator.loadState(sessionId);
  }
);

export const saveSession = createAsyncThunk(
  'orchestrator/saveSession',
  async (state: AgentState) => {
    const orchestrator = new AssessmentOrchestrator();
    await orchestrator.saveState(state);
    return state;
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
      const orchestrator = new AssessmentOrchestrator();
      state.currentSession = orchestrator.initializeState(action.payload.userId);
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
      // Process message
      .addCase(processMessage.pending, (state) => {
        state.isProcessing = true;
        state.error = null;
      })
      .addCase(processMessage.fulfilled, (state, action) => {
        state.isProcessing = false;
        if (action.payload.state) {
          state.currentSession = action.payload.state;
        }
      })
      .addCase(processMessage.rejected, (state, action) => {
        state.isProcessing = false;
        state.error = action.error.message || 'Failed to process message';
      })
      
      // Load session
      .addCase(loadSession.fulfilled, (state, action) => {
        if (action.payload) {
          state.currentSession = action.payload;
        }
      })
      
      // Save session
      .addCase(saveSession.fulfilled, (state, action) => {
        state.currentSession = action.payload;
        if (!state.recentSessions.includes(action.payload.sessionId)) {
          state.recentSessions.unshift(action.payload.sessionId);
        }
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
  const orchestrator = new AssessmentOrchestrator();
  return orchestrator.getProgress(state.orchestrator.currentSession);
};

export default orchestratorSlice.reducer;