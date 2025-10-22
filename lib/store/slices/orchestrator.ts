import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AgentState } from '@/lib/ai/schemas';

// Restored original state structure
interface OrchestratorState {
  // Current session state (using original AgentState format)
  currentSession: AgentState | null;
  
  // Processing state
  isProcessing: boolean;
  error: string | null;
  
  // UI state
  showProgress: boolean;
  sidebarOpen: boolean;
  
  // History
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
    initializeSession: (
      state,
      action: PayloadAction<{ userId: string; threadId?: string }>
    ) => {
      state.currentSession = {
        currentAgent: 'qualifier',
        phase: 'qualifying',
        responses: [],
        tokenUsage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        sessionId: crypto.randomUUID(),
        userId: action.payload.userId,
        threadId: action.payload.threadId,
        startedAt: new Date().toISOString(),
      };
      state.error = null;
    },

    updateSessionState: (state, action: PayloadAction<Partial<AgentState>>) => {
      if (state.currentSession) {
        // Merge updates into existing session
        Object.assign(state.currentSession, action.payload);
      } else {
        // Initialize session with the provided data
        state.currentSession = action.payload as AgentState;
      }
    },

    clearSession: (state) => {
      state.currentSession = null;
      state.error = null;
    },

    clearError: (state) => {
      state.error = null;
    },

    setProcessing: (state, action: PayloadAction<boolean>) => {
      state.isProcessing = action.payload;
    },

    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
  },
});

export const { 
  toggleSidebar, 
  setShowProgress, 
  initializeSession,
  updateSessionState,
  clearSession,
  clearError,
  setProcessing,
  setError,
} =
  orchestratorSlice.actions;

export default orchestratorSlice.reducer;
