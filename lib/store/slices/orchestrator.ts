import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// Simplified state for UI + SDK session mirroring
interface OrchestratorState {
  // Session data (mirrored from SDK for UI)
  currentAgent: string | null;
  currentPhase: string | null;
  sessionData: {
    qualifier?: any;
    assessor?: any;
    analyzer?: any;
  } | null;

  // Pure UI state
  showProgress: boolean;
  sidebarOpen: boolean;
}

const initialState: OrchestratorState = {
  currentAgent: null,
  currentPhase: null,
  sessionData: null,
  showProgress: true,
  sidebarOpen: false,
};

const orchestratorSlice = createSlice({
  name: 'orchestrator',
  initialState,
  reducers: {
    // UI actions (unchanged)
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setShowProgress: (state, action: PayloadAction<boolean>) => {
      state.showProgress = action.payload;
    },

    // NEW: Sync session data from SDK
    setSessionData: (
      state,
      action: PayloadAction<{
        currentAgent: string;
        currentPhase: string;
        data: any;
      }>,
    ) => {
      state.currentAgent = action.payload.currentAgent;
      state.currentPhase = action.payload.currentPhase;

      // Store agent-specific data
      const agentName = action.payload.currentAgent.toLowerCase() as 'qualifier' | 'assessor' | 'analyzer';
      if (!state.sessionData) {
        state.sessionData = {};
      }
      state.sessionData[agentName] = action.payload.data;
    },

    clearSession: (state) => {
      state.currentAgent = null;
      state.currentPhase = null;
      state.sessionData = null;
    },
  },
});

export const { toggleSidebar, setShowProgress, setSessionData, clearSession } =
  orchestratorSlice.actions;

export default orchestratorSlice.reducer;
