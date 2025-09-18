// Removed direct agent imports - now using API calls
import {
  type AgentState,
  type DynamicWeighting,
  agentStateSchema,
} from './schemas';
import type { CoreMessage } from 'ai';
import type { AppDispatch, RootState } from '@/lib/store';
import {
  initializeSession,
  updateSessionState,
  clearSession,
  clearError,
  addTokenUsage,
} from '@/lib/store/slices/orchestrator';
import { threadsApi, agentsApi } from '@/lib/services/api';
import { v4 as uuidv4 } from 'uuid'; // Keep for session correlation

export class AssessmentOrchestrator {
  private dispatch: AppDispatch;
  private getState: () => RootState;

  // TODO: Migrate to OpenAI Assistants API
  // Each agent will become an OpenAI Assistant with its own thread
  // Will need uuidv4() for thread management and session correlation
  // private assessmentAgent = new AssessmentAgent(); // -> OpenAI Assistant
  // private analysisAgent = new AnalysisAgent();     // -> OpenAI Assistant
  // private reportingAgent = new ReportingAgent();   // -> OpenAI Assistant

  constructor(dispatch: AppDispatch, getState: () => RootState) {
    this.dispatch = dispatch;
    this.getState = getState;
  }

  /**
   * Initialize a new assessment session (now dispatches to Redux)
   */
  async initializeNewSession(userId: string): Promise<void> {
    // Create OpenAI thread via API service
    const { threadId } = await threadsApi.create();

    this.dispatch(
      initializeSession({
        userId,
        threadId,
      }),
    );
  }

  /**
   * Get current session state from Redux
   */
  getCurrentSession(): AgentState | null {
    return this.getState().orchestrator.currentSession;
  }

  /**
   * Determine if this is the start of a new assessment
   */
  private isNewAssessment(messages: CoreMessage[]): boolean {
    // Simple heuristic: if first message or very few messages, this is new
    return messages.length <= 1;
  }

  /**
   * Generate initial greeting for new assessments
   */
  private getInitialGreeting(): string {
    return `Hello! I'm your AI Readiness Consultant, here to help you evaluate your business's readiness for AI adoption.

This assessment is designed specifically for small and medium-sized businesses in La Plata County. I'll ask you some questions about your business to provide personalized recommendations.

The process takes about 10-15 minutes and covers 6 key areas:
• Market Strategy
• Business Understanding  
• Workforce & Team
• Company Culture
• Technology Usage
• Data Practices

To get started, could you tell me a bit about your business? For example, how many people work there (including yourself)?`;
  }

  /**
   * Process a conversation turn and return response (now uses Redux state)
   */
  async processMessage(
    messages: CoreMessage[],
    userId: string,
  ): Promise<{
    response: string;
    threadId?: string;
  }> {
    try {
      console.log(`🔄 [Orchestrator] Processing message - User: ${userId}, Messages: ${messages.length}`);
      console.log(`📝 [Orchestrator] Latest message: "${messages[messages.length - 1]?.content}"`);

      this.dispatch(clearError());

      // Handle initial greeting for new assessments
      if (this.isNewAssessment(messages)) {
        console.log(`🎯 [Orchestrator] New assessment detected (${messages.length} messages)`);
        await this.initializeNewSession(userId);
        const response = this.getInitialGreeting();
        const currentSession = this.getCurrentSession();
        console.log(`✅ [Orchestrator] Initial session created - ThreadID: ${currentSession?.threadId}`);
        return { response, threadId: currentSession?.threadId };
      }

      // Get current session from Redux state
      let currentSession = this.getCurrentSession();
      console.log(`📊 [Orchestrator] Current session state:`, {
        exists: !!currentSession,
        agent: currentSession?.currentAgent,
        phase: currentSession?.phase,
        threadId: currentSession?.threadId,
      });

      // If no session exists, create one
      if (!currentSession) {
        console.log(`⚠️ [Orchestrator] No session found, creating new one`);
        await this.initializeNewSession(userId);
        currentSession = this.getCurrentSession()!;
        console.log(`✅ [Orchestrator] New session created - ThreadID: ${currentSession.threadId}`);
      }

      switch (currentSession.currentAgent) {
        case 'qualifier': {
          // Call qualifier API via service layer
          console.log(`🤖 [Orchestrator] Calling qualifier agent`);
          console.log(`🧵 [Orchestrator] Using threadId: ${currentSession.threadId}`);
          console.log(`📤 [Orchestrator] Sending ${messages.length} messages to qualifier`);

          if (!currentSession.threadId) {
            throw new Error('No thread ID available for qualifier');
          }

          const result = await agentsApi.qualifier({
            messages,
            threadId: currentSession.threadId,
          });

          console.log(`📥 [Orchestrator] Qualifier response:`, {
            responseLength: result.response.length,
            isComplete: result.isComplete,
            hasQualifier: !!result.qualifier,
            hasTokenUsage: !!result.tokenUsage,
          });

          // Update Redux state with qualifier results
          const updates: Partial<AgentState> = {};
          // Merge new responses with existing ones for progressive updates
          const existingResponses = currentSession.qualifier?.collected_responses || {};
          const newResponses = result.qualifier || {};
          updates.qualifier = {
            collected_responses: { ...existingResponses, ...newResponses },
            needs_more_info: !result.isComplete,
          };
          if (result.dynamicWeighting) {
            updates.dynamicWeighting = result.dynamicWeighting;
          }

          // Handle agent transition
          if (result.isComplete) {
            // Create new thread for assessor agent
            const { threadId: newThreadId } = await threadsApi.create();
            console.log(
              `🧵 [Orchestrator] Created new thread for assessor: ${newThreadId}`,
            );

            updates.currentAgent = 'assessor';
            updates.phase = 'assessing';
            updates.threadId = newThreadId; // Use new thread for assessor

            console.log(`🎯 [Orchestrator] TRANSITION: Qualifier complete, switching to assessor`);
            console.log(`🧠 [Orchestrator] Context prepared for assessor:`, {
              qualifierData: updates.qualifier,
              dynamicWeighting: updates.dynamicWeighting,
              newThreadId: newThreadId,
            });

            // TODO: Add transition message about starting assessment
          }

          // Track token usage if provided
          if (result.tokenUsage) {
            this.dispatch(addTokenUsage(result.tokenUsage));
          }

          // Dispatch updates to Redux
          this.dispatch(updateSessionState(updates));

          return {
            response: result.response,
            threadId: currentSession.threadId,
          };
        }

        case 'assessor': {
          // Call assessor API via service layer
          if (!currentSession.threadId) {
            throw new Error('No thread ID available for assessor');
          }

          console.log(`🧠 [Orchestrator] Passing qualifier context to assessor:`, {
            hasQualifier: !!currentSession.qualifier,
            qualifierResponses: currentSession.qualifier?.collected_responses,
            dynamicWeighting: currentSession.dynamicWeighting,
          });

          const assessorParams = {
            messages,
            threadId: currentSession.threadId,
            qualifier: currentSession.qualifier, // Pass qualifier context for personalization
          };

          console.log(`📤 [Orchestrator] EXACT ASSESSOR PARAMS:`, {
            messagesCount: assessorParams.messages.length,
            threadId: assessorParams.threadId,
            qualifierData: assessorParams.qualifier,
            lastMessage: assessorParams.messages[assessorParams.messages.length - 1],
          });

          const result = await agentsApi.assessor(assessorParams);

          // Update Redux state with assessment results
          const updates: Partial<AgentState> = {};
          // Merge new responses with existing ones for progressive updates
          const existingAssessorResponses = currentSession.assessor?.collected_responses || {};
          const newAssessorResponses = result.assessmentData || {};
          updates.assessor = {
            collected_responses: { ...existingAssessorResponses, ...newAssessorResponses },
            currentQuestionId: result.currentQuestionId,
            assessment_complete: result.isComplete,
          };

          // Handle agent transition when assessment is complete
          if (result.isComplete) {
            updates.currentAgent = 'analyzer';
            updates.phase = 'analyzing';
            // TODO: Add transition message about starting analysis
          }

          // Track token usage if provided
          if (result.tokenUsage) {
            this.dispatch(addTokenUsage(result.tokenUsage));
          }

          // Dispatch updates to Redux
          this.dispatch(updateSessionState(updates));

          return {
            response: result.response,
            threadId: currentSession.threadId,
          };
        }

        case 'analyzer': {
          // Call analyzer API via service layer
          if (!currentSession.threadId) {
            throw new Error('No thread ID available for analyzer');
          }

          console.log(`🧠 [Orchestrator] Calling analyzer with assessment data:`, {
            hasQualifier: !!currentSession.qualifier,
            hasAssessment: !!currentSession.assessor,
            qualifierResponses: currentSession.qualifier?.collected_responses,
            assessmentResponses: currentSession.assessor?.collected_responses,
          });

          const analyzerParams = {
            messages,
            threadId: currentSession.threadId,
            qualifier: currentSession.qualifier, // Pass qualifier context
            assessmentData: currentSession.assessor?.collected_responses, // Pass assessment responses
          };

          console.log(`📤 [Orchestrator] EXACT ANALYZER PARAMS:`, {
            messagesCount: analyzerParams.messages.length,
            threadId: analyzerParams.threadId,
            hasQualifierData: !!analyzerParams.qualifier,
            hasAssessmentData: !!analyzerParams.assessmentData,
            lastMessage: analyzerParams.messages[analyzerParams.messages.length - 1],
          });

          const result = await agentsApi.analyzer(analyzerParams);

          console.log(`📥 [Orchestrator] Analyzer response:`, {
            responseLength: result.response.length,
            isComplete: result.isComplete,
            hasAnalysisData: !!result.analysisData,
            hasTokenUsage: !!result.tokenUsage,
          });

          // Update Redux state with analysis results
          const updates: Partial<AgentState> = {};
          updates.analyzer = {
            scoring: result.analysisData?.scoring || {},
            strategy_recommendation: result.analysisData?.strategy_recommendation || {},
            roadmap: result.analysisData?.roadmap || {},
            concerns_analysis: result.analysisData?.concerns_analysis || {},
            analysis_complete: result.isComplete,
          };

          // Handle agent transition when analysis is complete
          if (result.isComplete) {
            updates.currentAgent = 'reporter';
            updates.phase = 'reporting';
            console.log(`🎯 [Orchestrator] TRANSITION: Analysis complete, switching to reporter`);
            // TODO: Add transition message about generating reports
          }

          // Track token usage if provided
          if (result.tokenUsage) {
            this.dispatch(addTokenUsage(result.tokenUsage));
          }

          // Dispatch updates to Redux
          this.dispatch(updateSessionState(updates));

          return {
            response: result.response,
            threadId: currentSession.threadId,
          };
        }

        case 'reporter': {
          // TODO: Implement ReportingAgent processing
          return {
            response:
              'Reporting phase not yet implemented. This would generate Beautiful.ai reports.',
          };
        }

        default: {
          throw new Error(`Unknown agent: ${currentSession.currentAgent}`);
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      // Error handling will be added to orchestrator slice later
      console.error('Orchestrator error:', errorMessage);
      throw error;
    }
  }

  /**
   * Reset assessment state (now dispatches to Redux)
   */
  resetCurrentSession(): void {
    this.dispatch(clearSession());
  }
}
