import type {
  QualifierOutputType,
  AssessorOutputType,
  AnalyzerOutputType,
} from './index';
import type { AgentState } from '@/lib/ai/schemas';

interface SDKResponse {
  message: string;
  data: QualifierOutputType | AssessorOutputType | AnalyzerOutputType;
  currentAgent: string;
  sessionId: string;
  isComplete: boolean;
}

/**
 * SessionStateManager
 * 
 * Transforms flat SDK agent outputs into the nested Redux AgentState format.
 * Mimics the old orchestrator's progressive data accumulation pattern.
 */
export class SessionStateManager {
  /**
   * Accumulates SDK agent outputs into Redux-compatible AgentState format.
   * Progressively builds up state across multiple agent calls.
   * 
   * @param existingState - Current Redux state (or null for new session)
   * @param sdkResponse - Response from /api/assessment endpoint
   * @param userId - Current user ID
   * @returns Partial AgentState to merge into Redux
   */
  static accumulate(
    existingState: AgentState | null,
    sdkResponse: SDKResponse,
    userId: string
  ): Partial<AgentState> {
    const { currentAgent, data, sessionId } = sdkResponse;
    const agentType = currentAgent.toLowerCase() as
      | 'qualifier'
      | 'assessor'
      | 'analyzer';

    // Base update object
    const updates: Partial<AgentState> = {
      sessionId,
      userId,
      currentAgent: agentType,
      phase: this.getPhaseFromAgent(agentType),
    };

    // Initialize on first call
    if (!existingState) {
      updates.startedAt = new Date().toISOString();
      updates.responses = [];
      updates.tokenUsage = {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      };
    }

    // Transform based on agent type
    switch (agentType) {
      case 'qualifier':
        updates.qualifier = this.transformQualifierData(
          data as QualifierOutputType,
          existingState?.qualifier
        );
        updates.dynamicWeighting = {
          solopreneurBonus: (data as QualifierOutputType).solopreneurBonus,
          budgetSensitive: (data as QualifierOutputType).budgetSensitive,
          ruralFocus: (data as QualifierOutputType).ruralFocus,
          scoreAdjustment: (data as QualifierOutputType).scoreAdjustment,
        };
        break;

      case 'assessor':
        updates.assessor = this.transformAssessorData(
          data as AssessorOutputType,
          existingState?.assessor
        );
        break;

      case 'analyzer':
        updates.analyzer = this.transformAnalyzerData(
          data as AnalyzerOutputType
        );
        if ((data as AnalyzerOutputType).analysis_complete) {
          updates.phase = 'complete';
          updates.completedAt = new Date().toISOString();
        }
        break;
    }

    return updates;
  }

  /**
   * Transform flat Qualifier SDK output to nested Redux structure.
   * Builds collected_responses object from individual SDK fields.
   * 
   * @param sdkData - Flat qualifier output from SDK
   * @param existing - Existing qualifier state (for accumulation)
   * @returns Nested qualifier structure for Redux
   */
  private static transformQualifierData(
    sdkData: QualifierOutputType,
    existing?: AgentState['qualifier']
  ): AgentState['qualifier'] {
    // Build collected_responses object from flat SDK fields
    const collected_responses: Record<string, string> = {
      ...existing?.collected_responses,
    };

    // Only include fields that have values (progressive accumulation)
    if (sdkData.employee_count) {
      collected_responses.employee_count = sdkData.employee_count;
    }
    if (sdkData.revenue_band) {
      collected_responses.revenue_band = sdkData.revenue_band;
    }
    if (sdkData.business_type) {
      collected_responses.business_type = sdkData.business_type;
    }
    if (sdkData.location) {
      collected_responses.location = sdkData.location;
    }
    if (sdkData.industry) {
      collected_responses.industry = sdkData.industry;
    }

    return {
      collected_responses,
      needs_more_info: sdkData.needs_more_info,
    };
  }

  /**
   * Transform flat Assessor SDK output to nested Redux structure.
   * 
   * Note: collected_responses is not populated by SDK currently.
   * Future enhancement: Parse chat history to reconstruct Q&A pairs.
   * 
   * @param sdkData - Flat assessor output from SDK
   * @param existing - Existing assessor state (for accumulation)
   * @returns Nested assessor structure for Redux
   */
  private static transformAssessorData(
    sdkData: AssessorOutputType,
    existing?: AgentState['assessor']
  ): AgentState['assessor'] {
    // TODO: Future enhancement - parse chat history to build collected_responses
    // For now, we preserve existing responses and track metadata
    return {
      collected_responses: existing?.collected_responses || {},
      currentQuestionId: sdkData.current_question_id,
      assessment_complete: sdkData.assessment_complete,
      questions_asked: sdkData.questions_asked,
      total_questions: sdkData.total_questions,
    };
  }

  /**
   * Transform flat Analyzer SDK output to nested Redux structure.
   * Builds complete nested objects for scoring, strategy, roadmap, and concerns.
   * 
   * @param sdkData - Flat analyzer output from SDK
   * @returns Nested analyzer structure for Redux
   */
  private static transformAnalyzerData(
    sdkData: AnalyzerOutputType
  ): AgentState['analyzer'] {
    return {
      scoring: {
        overall_score: sdkData.overall_score,
        market_strategy: {
          total: sdkData.market_strategy_score,
          level: this.getScoreLevel(sdkData.market_strategy_score),
        },
        business_understanding: {
          total: sdkData.business_understanding_score,
          level: this.getScoreLevel(sdkData.business_understanding_score),
        },
        workforce_acumen: {
          total: sdkData.workforce_acumen_score,
          level: this.getScoreLevel(sdkData.workforce_acumen_score),
        },
        company_culture: {
          total: sdkData.company_culture_score,
          level: this.getScoreLevel(sdkData.company_culture_score),
        },
        role_of_technology: {
          total: sdkData.role_of_technology_score,
          level: this.getScoreLevel(sdkData.role_of_technology_score),
        },
        data: {
          total: sdkData.data_score,
          level: this.getScoreLevel(sdkData.data_score),
        },
      },
      strategy_recommendation: {
        primary_strategy: sdkData.primary_strategy,
        rationale: sdkData.strategy_rationale,
      },
      roadmap: {
        'Phase 1': {
          timeline: sdkData.phase_1_timeline,
          focus: sdkData.phase_1_focus,
        },
        'Phase 2': {
          timeline: sdkData.phase_2_timeline,
          focus: sdkData.phase_2_focus,
        },
        'Phase 3': {
          timeline: sdkData.phase_3_timeline,
          focus: sdkData.phase_3_focus,
        },
      },
      concerns_analysis: {
        identified_concerns: [],
        mitigation_strategies: {},
      },
      analysis_complete: sdkData.analysis_complete,
    };
  }

  /**
   * Helper: Get score level description from numeric score.
   * Maps 0-10 scores to qualitative descriptions.
   * 
   * @param score - Numeric score (0-10)
   * @returns Qualitative level description
   */
  private static getScoreLevel(score: number): string {
    if (score >= 9) return 'Excellent';
    if (score >= 7) return 'Good';
    if (score >= 4) return 'Moderate';
    return 'Limited';
  }

  /**
   * Helper: Map agent name to phase.
   * 
   * @param agent - Agent type
   * @returns Corresponding phase
   */
  private static getPhaseFromAgent(
    agent: 'qualifier' | 'assessor' | 'analyzer'
  ): AgentState['phase'] {
    const map = {
      qualifier: 'qualifying' as const,
      assessor: 'assessing' as const,
      analyzer: 'analyzing' as const,
    };
    return map[agent];
  }
}

