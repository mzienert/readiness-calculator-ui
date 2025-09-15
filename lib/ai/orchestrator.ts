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
  clearError 
} from '@/lib/store/slices/orchestrator';
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
    // Create OpenAI thread via API call
    const response = await fetch('/api/threads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Thread creation failed: ${response.status}`);
    }

    const { threadId } = await response.json();

    this.dispatch(initializeSession({
      userId,
      threadId
    }));
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
      this.dispatch(clearError());

      // Handle initial greeting for new assessments
      if (this.isNewAssessment(messages)) {
        await this.initializeNewSession(userId);
        const response = this.getInitialGreeting();
        const currentSession = this.getCurrentSession();
        return { response, threadId: currentSession?.threadId };
      }

      // Get current session from Redux state
      let currentSession = this.getCurrentSession();

      // If no session exists, create one
      if (!currentSession) {
        await this.initializeNewSession(userId);
        currentSession = this.getCurrentSession()!;
      }

      switch (currentSession.currentAgent) {
        case 'qualifier': {
          // Call qualifier API instead of direct agent
          const response = await fetch('/api/agents/qualifier', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages,
              threadId: currentSession.threadId
            }),
          });

          if (!response.ok) {
            throw new Error(`Qualifier API error: ${response.status}`);
          }

          const result = await response.json();

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

          return { response: result.response, threadId: currentSession.threadId };
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
