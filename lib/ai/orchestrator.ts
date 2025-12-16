// Removed direct agent imports - now using API calls
import type {
  AgentState,
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
import { analyticsApi } from '@/lib/services/analytics';

export class AssessmentOrchestrator {
  private dispatch: AppDispatch;
  private getState: () => RootState;
  private readonly MAX_TRANSITION_DEPTH = 5; // Safety limit to prevent infinite recursion

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
   * Handle seamless transition to next agent
   * Creates synthetic message and recursively calls next agent
   */
  private async transitionToNextAgent(
    messages: CoreMessage[],
    userId: string,
    currentDepth: number,
  ): Promise<{ response: string; threadId?: string }> {
    console.log(`🔄 [Orchestrator] Auto-transitioning to next agent (depth: ${currentDepth + 1})`);

    // Create synthetic message to trigger next agent
    const syntheticMessage: CoreMessage = {
      role: 'user',
      content: 'continue', // Placeholder to trigger next agent
    };

    // Add synthetic message to history
    const messagesWithTransition = [...messages, syntheticMessage];

    // Recursively process with next agent (depth increases)
    return await this.processMessage(
      messagesWithTransition,
      userId,
      currentDepth + 1
    );
  }

  /**
   * Process a conversation turn and return response (now uses Redux state)
   */
  async processMessage(
    messages: CoreMessage[],
    userId: string,
    transitionDepth: number = 0,
  ): Promise<{
    response: string;
    threadId?: string;
  }> {
    try {
      // Guard against infinite recursion
      if (transitionDepth > this.MAX_TRANSITION_DEPTH) {
        throw new Error(
          `Maximum transition depth exceeded (${this.MAX_TRANSITION_DEPTH}). Possible infinite loop.`
        );
      }

      console.log(`🚨 [Orchestrator] ORCHESTRATOR PROCESSMESSAGE CALLED!!!`);
      console.log(`🔄 [Orchestrator] Processing message - Depth: ${transitionDepth}, User: ${userId}, Messages: ${messages.length}`);
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

          console.log('🔍 [Orchestrator] About to call agentsApi.qualifier');
          console.log('🔍 [Orchestrator] agentsApi.qualifier function:', agentsApi.qualifier.toString().substring(0, 100));

          const result = await agentsApi.qualifier({
            messages,
            threadId: currentSession.threadId,
          });

          console.log('🔍 [Orchestrator] agentsApi.qualifier returned:', typeof result);

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
            // Save anonymized qualifier snapshot
            await analyticsApi.saveSnapshot({
              sessionId: currentSession.sessionId,
              agentType: 'qualifier',
              snapshotData: updates.qualifier || {},
            });

            // Create new thread for assessor agent
            const { threadId: newThreadId } = await threadsApi.create();
            console.log(
              `🧵 [Orchestrator] Created new thread for assessor: ${newThreadId}`,
            );

            updates.currentAgent = 'assessor';
            updates.phase = 'assessing';
            updates.threadId = newThreadId; // Use new thread for assessor

            console.log(`🎯 [Orchestrator] TRANSITION: Qualifier → Assessor`);
            console.log(`🧠 [Orchestrator] Context prepared for assessor:`, {
              qualifierData: updates.qualifier,
              dynamicWeighting: updates.dynamicWeighting,
              newThreadId: newThreadId,
            });

            // Dispatch state updates BEFORE transitioning
            this.dispatch(updateSessionState(updates));

            // Track token usage before transition
            if (result.tokenUsage) {
              this.dispatch(addTokenUsage(result.tokenUsage));
            }

            // Auto-transition to assessor
            return await this.transitionToNextAgent(
              messages,
              userId,
              transitionDepth
            );
          }

          // If not complete, return qualifier's response normally
          if (result.tokenUsage) {
            this.dispatch(addTokenUsage(result.tokenUsage));
          }

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
            // Save anonymized assessor snapshot
            await analyticsApi.saveSnapshot({
              sessionId: currentSession.sessionId,
              agentType: 'assessor',
              snapshotData: updates.assessor || {},
            });

            updates.currentAgent = 'analyzer';
            updates.phase = 'analyzing';

            console.log(`🎯 [Orchestrator] TRANSITION: Assessor → Analyzer`);

            // Dispatch state updates BEFORE transitioning
            this.dispatch(updateSessionState(updates));

            // Track token usage before transition
            if (result.tokenUsage) {
              this.dispatch(addTokenUsage(result.tokenUsage));
            }

            // Auto-transition to analyzer
            return await this.transitionToNextAgent(
              messages,
              userId,
              transitionDepth
            );
          }

          // If not complete, return assessor's response normally
          if (result.tokenUsage) {
            this.dispatch(addTokenUsage(result.tokenUsage));
          }

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

          // PRODUCTION DEBUG: Log the exact analysis data structure
          console.log('🔍 [Orchestrator] PRODUCTION DEBUG - Raw analysisData:', result.analysisData);
          console.log('🔍 [Orchestrator] PRODUCTION DEBUG - Scoring data:', result.analysisData?.scoring);
          console.log('🔍 [Orchestrator] PRODUCTION DEBUG - Strategy data:', result.analysisData?.strategy_recommendation);
          console.log('🔍 [Orchestrator] PRODUCTION DEBUG - Roadmap data:', result.analysisData?.roadmap);

          // Update Redux state with analysis results
          const updates: Partial<AgentState> = {};
          updates.analyzer = {
            scoring: result.analysisData?.scoring || {},
            strategy_recommendation: result.analysisData?.strategy_recommendation || {},
            roadmap: result.analysisData?.roadmap || {},
            concerns_analysis: result.analysisData?.concerns_analysis || {},
            analysis_complete: result.isComplete,
          };

          // PRODUCTION DEBUG: Log what we're storing in Redux
          console.log('🔍 [Orchestrator] PRODUCTION DEBUG - Updates to store:', updates.analyzer);

          // Handle completion when analysis is complete (temporary solution)
          if (result.isComplete) {
            // Save anonymized analyzer snapshot
            await analyticsApi.saveSnapshot({
              sessionId: currentSession.sessionId,
              agentType: 'analyzer',
              snapshotData: updates.analyzer || {},
            });

            updates.currentAgent = 'analyzer'; // Stay on analyzer since we're showing temp report
            updates.phase = 'complete';
            console.log(`🎯 [Orchestrator] ANALYSIS COMPLETE: Showing temporary assessment report`);
            // Note: Beautiful.ai integration will be added later to replace this
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

      console.error(`❌ [Orchestrator] Error at depth ${transitionDepth}:`, errorMessage);

      // If error during transition (depth > 0), log warning
      if (transitionDepth > 0) {
        console.warn(`⚠️ [Orchestrator] Error during auto-transition, user may need to retry`);
      }

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
