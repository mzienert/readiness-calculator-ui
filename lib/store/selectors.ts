import type { RootState } from './index';

// Keep exact same selector names for component compatibility
export const selectCurrentAgent = (state: RootState) =>
  state.orchestrator.currentAgent;

export const selectCurrentPhase = (state: RootState) =>
  state.orchestrator.currentPhase;

export const selectShowProgress = (state: RootState) =>
  state.orchestrator.showProgress;

export const selectSidebarOpen = (state: RootState) =>
  state.orchestrator.sidebarOpen;

// Qualifier data selector (unchanged signature)
export const selectQualifierData = (state: RootState) =>
  state.orchestrator.sessionData?.qualifier;

// Assessor data selector (unchanged signature)
export const selectAssessorData = (state: RootState) =>
  state.orchestrator.sessionData?.assessor;

// Analyzer data selector (unchanged signature)
export const selectAnalyzerData = (state: RootState) =>
  state.orchestrator.sessionData?.analyzer;

export const selectAnalyzerScoring = (state: RootState) =>
  state.orchestrator.sessionData?.analyzer?.scoring;

export const selectStrategyRecommendation = (state: RootState) => {
  const analyzer = state.orchestrator.sessionData?.analyzer;
  if (!analyzer) return null;
  
  return {
    primary_strategy: analyzer.primary_strategy,
    rationale: analyzer.strategy_rationale,
  };
};

export const selectAnalyzerRoadmap = (state: RootState) => {
  const analyzer = state.orchestrator.sessionData?.analyzer;
  if (!analyzer) return null;
  
  return {
    'Phase 1': {
      timeline: analyzer.phase_1_timeline,
      focus: analyzer.phase_1_focus,
    },
    'Phase 2': {
      timeline: analyzer.phase_2_timeline,
      focus: analyzer.phase_2_focus,
    },
    'Phase 3': {
      timeline: analyzer.phase_3_timeline,
      focus: analyzer.phase_3_focus,
    },
  };
};

export const selectAnalyzerConcerns = (state: RootState) => {
  // For now, return null since concerns were removed from simplified schema
  // Can be re-added later if needed
  return null;
};

export const selectAnalysisComplete = (state: RootState) =>
  state.orchestrator.sessionData?.analyzer?.analysis_complete;

// Assessment score selector (adapted for flattened schema)
export const selectAssessmentScore = (state: RootState) => {
  const analyzer = state.orchestrator.sessionData?.analyzer;
  if (!analyzer) return null;

  const categoryScores: Record<string, number> = {
    market_strategy: analyzer.market_strategy_score || 0,
    business_understanding: analyzer.business_understanding_score || 0,
    workforce_acumen: analyzer.workforce_acumen_score || 0,
    company_culture: analyzer.company_culture_score || 0,
    role_of_technology: analyzer.role_of_technology_score || 0,
    data: analyzer.data_score || 0,
  };

  const overallScore = analyzer.overall_score || 0;

  return { overallScore, categoryScores };
};

// Progress selector (adapt to new structure)
export const selectProgress = (state: RootState) => {
  if (!state.orchestrator.currentAgent) return null;

  const phaseMap: Record<string, { step: number; name: string }> = {
    qualifier: { step: 1, name: 'Business Context' },
    assessor: { step: 2, name: 'Assessment Questions' },
    analyzer: { step: 3, name: 'Analysis & Scoring' },
    complete: { step: 4, name: 'Complete' },
  };

  const agent = state.orchestrator.currentAgent.toLowerCase();
  const currentPhase = phaseMap[agent] || phaseMap.qualifier;
  const totalSteps = 4;

  return {
    phase: agent,
    currentAgent: state.orchestrator.currentAgent,
    completedSteps: currentPhase.step - 1,
    totalSteps,
    progress: Math.round(((currentPhase.step - 1) / totalSteps) * 100),
    phaseName: currentPhase.name,
  };
};

// Responses selector (return empty array for compatibility)
export const selectResponses = (state: RootState) => {
  return [];
};

// UI state selector (unchanged)
export const selectUIState = (state: RootState) => ({
  showProgress: state.orchestrator.showProgress,
  sidebarOpen: state.orchestrator.sidebarOpen,
  hasActiveSession: Boolean(state.orchestrator.currentAgent),
});

