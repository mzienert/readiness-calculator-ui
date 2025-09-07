import { QualifierAgent } from './agents/qualifier';
import { 
  type AgentState, 
  type SMBQualifier, 
  type DynamicWeighting,
  agentStateSchema 
} from './schemas';
import type { CoreMessage } from 'ai';
import { v4 as uuidv4 } from 'uuid';

export class AssessmentOrchestrator {
  private qualifierAgent = new QualifierAgent();
  // TODO: Add other agents as they're implemented
  // private assessmentAgent = new AssessmentAgent();
  // private analysisAgent = new AnalysisAgent();
  // private reportingAgent = new ReportingAgent();

  /**
   * Initialize a new assessment session
   */
  initializeState(userId: string): AgentState {
    return {
      currentAgent: 'qualifier',
      phase: 'qualifying',
      responses: [],
      sessionId: uuidv4(),
      userId,
      startedAt: new Date(),
    };
  }

  /**
   * Load existing state from storage (placeholder for now)
   */
  async loadState(sessionId: string): Promise<AgentState | null> {
    // TODO: Implement state persistence to database
    // For now, return null to always start fresh
    return null;
  }

  /**
   * Save state to storage (placeholder for now)
   */
  async saveState(state: AgentState): Promise<void> {
    // TODO: Implement state persistence to database
    console.log('Saving state:', state.sessionId, state.currentAgent, state.phase);
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
   * Process a conversation turn and return response
   */
  async processMessage(
    messages: CoreMessage[], 
    userId: string
  ): Promise<{
    response: string;
    state: AgentState;
  }> {
    console.log('🔄 Orchestrator.processMessage called');
    console.log('📥 Messages:', messages.length);
    console.log('👤 UserId:', userId);
    
    // Handle initial greeting for new assessments
    if (this.isNewAssessment(messages)) {
      console.log('🆕 New assessment detected');
      const state = this.initializeState(userId);
      const response = this.getInitialGreeting();
      
      console.log('💾 Saving initial state:', state.sessionId);
      await this.saveState(state);
      
      console.log('✅ Returning initial greeting');
      return { response, state };
    }

    // For now, we only have QualifierAgent, so route everything there
    // TODO: Load existing state and route to appropriate agent
    let state = this.initializeState(userId); // Temporary: always start fresh
    console.log('🔧 Initialized state:', state.currentAgent, state.phase);

    switch (state.currentAgent) {
      case 'qualifier': {
        console.log('👨‍💼 Routing to QualifierAgent');
        const result = await this.qualifierAgent.process(messages);
        console.log('📤 QualifierAgent result:', {
          hasResponse: !!result.response,
          responseLength: result.response?.length,
          hasQualifier: !!result.qualifier,
          hasDynamicWeighting: !!result.dynamicWeighting,
          isComplete: result.isComplete
        });
        
        // Update state with qualifier results
        if (result.qualifier) {
          console.log('📋 Adding qualifier to state:', result.qualifier);
          state.qualifier = result.qualifier;
        }
        if (result.dynamicWeighting) {
          console.log('⚖️ Adding dynamic weighting to state:', result.dynamicWeighting);
          state.dynamicWeighting = result.dynamicWeighting;
        }
        
        // Handle agent transition
        if (result.isComplete) {
          console.log('✅ Qualifier complete, transitioning to assessor');
          state.currentAgent = 'assessor';
          state.phase = 'assessing';
          // TODO: Add transition message about starting assessment
        }

        console.log('💾 Saving updated state');
        await this.saveState(state);
        
        console.log('🎯 Returning result with response length:', result.response?.length);
        return {
          response: result.response,
          state,
        };
      }

      case 'assessor': {
        // TODO: Implement AssessmentAgent processing
        return {
          response: "Assessment phase not yet implemented. This would handle the 6-category questions.",
          state,
        };
      }

      case 'analyzer': {
        // TODO: Implement AnalysisAgent processing
        return {
          response: "Analysis phase not yet implemented. This would generate scores and recommendations.",
          state,
        };
      }

      case 'reporter': {
        // TODO: Implement ReportingAgent processing
        return {
          response: "Reporting phase not yet implemented. This would generate Beautiful.ai reports.",
          state,
        };
      }

      default: {
        throw new Error(`Unknown agent: ${state.currentAgent}`);
      }
    }
  }

  /**
   * Get current assessment progress for UI display
   */
  getProgress(state: AgentState): {
    phase: string;
    currentAgent: string;
    completedSteps: number;
    totalSteps: number;
    progress: number;
  } {
    const phaseMap = {
      'qualifying': { step: 1, name: 'Business Context' },
      'assessing': { step: 2, name: 'Assessment Questions' },
      'analyzing': { step: 3, name: 'Analysis & Scoring' },
      'reporting': { step: 4, name: 'Report Generation' },
      'complete': { step: 4, name: 'Complete' },
    };

    const totalSteps = 4;
    const currentPhase = phaseMap[state.phase];
    
    return {
      phase: state.phase,
      currentAgent: state.currentAgent,
      completedSteps: currentPhase.step - 1,
      totalSteps,
      progress: Math.round(((currentPhase.step - 1) / totalSteps) * 100),
    };
  }

  /**
   * Reset assessment state (for testing/debugging)
   */
  async resetState(sessionId: string): Promise<void> {
    // TODO: Implement state reset in database
    console.log('Resetting state for session:', sessionId);
  }
}