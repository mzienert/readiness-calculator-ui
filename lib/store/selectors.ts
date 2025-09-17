import type { RootState } from './index';
import { createSelector } from '@reduxjs/toolkit';

// Basic session selectors
export const selectCurrentSession = (state: RootState) =>
  state.orchestrator.currentSession;

export const selectCurrentAgent = (state: RootState) =>
  state.orchestrator.currentSession?.currentAgent;

export const selectCurrentPhase = (state: RootState) =>
  state.orchestrator.currentSession?.phase;

export const selectSessionId = (state: RootState) =>
  state.orchestrator.currentSession?.sessionId;

export const selectUserId = (state: RootState) =>
  state.orchestrator.currentSession?.userId;

export const selectStartedAt = (state: RootState) =>
  state.orchestrator.currentSession?.startedAt;

// Processing and error selectors
export const selectIsProcessing = (state: RootState) =>
  state.orchestrator.isProcessing;

export const selectError = (state: RootState) => state.orchestrator.error;

export const selectHasError = (state: RootState) =>
  Boolean(state.orchestrator.error);

// UI state selectors
export const selectShowProgress = (state: RootState) =>
  state.orchestrator.showProgress;

export const selectSidebarOpen = (state: RootState) =>
  state.orchestrator.sidebarOpen;

export const selectRecentSessions = (state: RootState) =>
  state.orchestrator.recentSessions;

// Assessment data selectors
export const selectQualifierData = (state: RootState) =>
  state.orchestrator.currentSession?.qualifier;

export const selectDynamicWeighting = (state: RootState) =>
  state.orchestrator.currentSession?.dynamicWeighting;

export const selectResponses = createSelector(
  [(state: RootState) => state.orchestrator.currentSession?.responses],
  (responses) => responses || [],
);

export const selectResponsesCount = (state: RootState) =>
  state.orchestrator.currentSession?.responses?.length || 0;

export const selectAssessmentComplete = (state: RootState) =>
  state.orchestrator.currentSession?.phase === 'complete';

export const selectAssessmentScore = (state: RootState) =>
  state.orchestrator.currentSession?.assessmentScore;

export const selectStrategyRecommendation = (state: RootState) =>
  state.orchestrator.currentSession?.strategyRecommendation;

// Session status selectors
export const selectHasActiveSession = (state: RootState) =>
  Boolean(state.orchestrator.currentSession);

export const selectSessionAge = (state: RootState) => {
  const session = state.orchestrator.currentSession;
  if (!session?.startedAt) return null;
  return Date.now() - new Date(session.startedAt).getTime();
};

export const selectIsNewSession = (state: RootState) => {
  const age = selectSessionAge(state);
  if (age === null) return false;
  return age < 5 * 60 * 1000; // Less than 5 minutes old
};

// Computed progress selector
export const selectProgress = (state: RootState) => {
  if (!state.orchestrator.currentSession) return null;

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
    phaseName: currentPhase.name,
  };
};

// Combined selectors for complex UI needs
export const selectSessionSummary = (state: RootState) => {
  const session = state.orchestrator.currentSession;
  if (!session) return null;

  return {
    sessionId: session.sessionId,
    userId: session.userId,
    currentAgent: session.currentAgent,
    phase: session.phase,
    startedAt: session.startedAt,
    responsesCount: session.responses?.length || 0,
    isComplete: session.phase === 'complete',
    hasQualifier: Boolean(session.qualifier),
    hasScore: Boolean(session.assessmentScore),
  };
};

export const selectUIState = (state: RootState) => ({
  isProcessing: state.orchestrator.isProcessing,
  error: state.orchestrator.error,
  showProgress: state.orchestrator.showProgress,
  sidebarOpen: state.orchestrator.sidebarOpen,
  hasActiveSession: Boolean(state.orchestrator.currentSession),
});

// Category-specific response selectors
export const selectResponsesByCategory = createSelector(
  [selectResponses],
  (responses) =>
    responses.reduce(
      (acc, response) => {
        if (!acc[response.category]) {
          acc[response.category] = [];
        }
        acc[response.category].push(response);
        return acc;
      },
      {} as Record<string, typeof responses>,
    ),
);

export const selectCategoryScores = createSelector(
  [selectResponsesByCategory],
  (responsesByCategory) =>
    Object.entries(responsesByCategory).reduce(
      (acc, [category, responses]) => {
        const avgScore =
          responses.reduce((sum, r) => sum + r.score, 0) / responses.length;
        acc[category] = Math.round(avgScore * 10) / 10; // Round to 1 decimal
        return acc;
      },
      {} as Record<string, number>,
    ),
);
