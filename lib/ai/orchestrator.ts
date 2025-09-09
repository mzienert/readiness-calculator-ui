import { QualifierAgent } from './agents/qualifier';
import {
  type AgentState,
  type SMBQualifier,
  type DynamicWeighting,
  agentStateSchema,
} from './schemas';
import type { CoreMessage } from 'ai';
import type { AppDispatch, RootState } from '@/lib/store';
import { 
  initializeSession, 
  updateSessionState,
  clearSession,
  clearError 
} from '@/lib/store/slices/orchestrator';
import { v4 as uuidv4 } from 'uuid'; // Keep for OpenAI assistant thread management

export class AssessmentOrchestrator {
  private qualifierAgent = new QualifierAgent();
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
  initializeNewSession(userId: string): void {
    this.dispatch(initializeSession({ userId }));
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
  }> {
    try {
      this.dispatch(clearError());

      // Handle initial greeting for new assessments
      if (this.isNewAssessment(messages)) {
        this.initializeNewSession(userId);
        const response = this.getInitialGreeting();
        return { response };
      }

      // Get current session from Redux state
      let currentSession = this.getCurrentSession();
      
      // If no session exists, create one
      if (!currentSession) {
        this.initializeNewSession(userId);
        currentSession = this.getCurrentSession()!;
      }

      switch (currentSession.currentAgent) {
        case 'qualifier': {
          const result = await this.qualifierAgent.process(messages);

          // Update Redux state with qualifier results
          const updates: Partial<AgentState> = {};
          if (result.qualifier) {
            updates.qualifier = result.qualifier;
          }
          if (result.dynamicWeighting) {
            updates.dynamicWeighting = result.dynamicWeighting;
          }

          // Handle agent transition
          if (result.isComplete) {
            updates.currentAgent = 'assessor';
            updates.phase = 'assessing';
            // TODO: Add transition message about starting assessment
          }

          // Dispatch updates to Redux
          this.dispatch(updateSessionState(updates));

          return { response: result.response };
        }

        case 'assessor': {
          // TODO: Implement AssessmentAgent processing
          return {
            response:
              'Assessment phase not yet implemented. This would handle the 6-category questions.',
          };
        }

        case 'analyzer': {
          // TODO: Implement AnalysisAgent processing
          return {
            response:
              'Analysis phase not yet implemented. This would generate scores and recommendations.',
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.dispatch(updateSessionState({ error: errorMessage }));
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
