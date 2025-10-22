import type { RootState } from './index';

// Session selectors
export const selectCurrentSession = (state: RootState) =>
  state.orchestrator.currentSession;

export const selectCurrentAgent = (state: RootState) =>
  state.orchestrator.currentSession?.currentAgent;

export const selectCurrentPhase = (state: RootState) =>
  state.orchestrator.currentSession?.phase;

export const selectSessionId = (state: RootState) =>
  state.orchestrator.currentSession?.sessionId;

// Processing selectors
export const selectIsProcessing = (state: RootState) =>
  state.orchestrator.isProcessing;

export const selectError = (state: RootState) => 
  state.orchestrator.error;

export const selectHasError = (state: RootState) =>
  Boolean(state.orchestrator.error);

// UI selectors
export const selectShowProgress = (state: RootState) =>
  state.orchestrator.showProgress;

export const selectSidebarOpen = (state: RootState) =>
  state.orchestrator.sidebarOpen;

// Agent data selectors (now reference currentSession)
export const selectQualifierData = (state: RootState) =>
  state.orchestrator.currentSession?.qualifier;

export const selectAssessorData = (state: RootState) =>
  state.orchestrator.currentSession?.assessor;

export const selectAnalyzerData = (state: RootState) =>
  state.orchestrator.currentSession?.analyzer;

export const selectAnalyzerScoring = (state: RootState) =>
  state.orchestrator.currentSession?.analyzer?.scoring;

export const selectDynamicWeighting = (state: RootState) =>
  state.orchestrator.currentSession?.dynamicWeighting;

export const selectStrategyRecommendation = (state: RootState) => {
  const analyzer = state.orchestrator.currentSession?.analyzer;
  if (!analyzer?.strategy_recommendation) return null;
  
  return {
    primary_strategy: analyzer.strategy_recommendation.primary_strategy,
    rationale: analyzer.strategy_recommendation.rationale,
  };
};

export const selectAnalyzerRoadmap = (state: RootState) =>
  state.orchestrator.currentSession?.analyzer?.roadmap;

export const selectAnalyzerConcerns = (state: RootState) =>
  state.orchestrator.currentSession?.analyzer?.concerns_analysis;

export const selectAnalysisComplete = (state: RootState) =>
  state.orchestrator.currentSession?.analyzer?.analysis_complete;

// Assessment score selector (now reads from nested scoring structure)
export const selectAssessmentScore = (state: RootState) => {
  const scoring = state.orchestrator.currentSession?.analyzer?.scoring;
  if (!scoring) return null;

  const categoryScores: Record<string, number> = {
    market_strategy: scoring.market_strategy?.total || 0,
    business_understanding: scoring.business_understanding?.total || 0,
    workforce_acumen: scoring.workforce_acumen?.total || 0,
    company_culture: scoring.company_culture?.total || 0,
    role_of_technology: scoring.role_of_technology?.total || 0,
    data: scoring.data?.total || 0,
  };

  const overallScore = scoring.overall_score || 0;

  return { overallScore, categoryScores };
};

// Progress selector (adapt to restored structure)
export const selectProgress = (state: RootState) => {
  if (!state.orchestrator.currentSession) return null;

  const session = state.orchestrator.currentSession;
  const phaseMap: Record<string, { step: number; name: string }> = {
    qualifying: { step: 1, name: 'Business Context' },
    assessing: { step: 2, name: 'Assessment Questions' },
    analyzing: { step: 3, name: 'Analysis & Scoring' },
    reporting: { step: 4, name: 'Report Generation' },
    complete: { step: 4, name: 'Complete' },
  };

  const currentPhase = phaseMap[session.phase] || phaseMap.qualifying;
  const totalSteps = 4;

  return {
    phase: session.phase,
    currentAgent: session.currentAgent,
    completedSteps: currentPhase.step - 1,
    totalSteps,
    progress: Math.round(((currentPhase.step - 1) / totalSteps) * 100),
    phaseName: currentPhase.name,
  };
};

// Responses selector (return from session)
export const selectResponses = (state: RootState) => {
  return state.orchestrator.currentSession?.responses || [];
};

// UI state selector (updated for currentSession)
export const selectUIState = (state: RootState) => ({
  isProcessing: state.orchestrator.isProcessing,
  error: state.orchestrator.error,
  showProgress: state.orchestrator.showProgress,
  sidebarOpen: state.orchestrator.sidebarOpen,
  hasActiveSession: Boolean(state.orchestrator.currentSession),
});

