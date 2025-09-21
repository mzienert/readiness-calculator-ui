import type {
  QualifierRequest,
  QualifierResponse,
  AssessorRequest,
  AssessorResponse,
  AnalyzerRequest,
  AnalyzerResponse,
  ThreadResponse,
} from './api';
// Environment variable utilities not needed - using direct check

/**
 * Mock data based on existing test scenarios
 */
const mockQualifierData = {
  employee_count: '5',
  revenue_band: '$500K',
  business_type: 'Marketing Agency',
  location: 'Durango, Colorado'
};

const mockAssessmentData = {
  question_1a_response: 'We have a good understanding of our local market in Durango and see growth opportunities, especially with tourism businesses.',
  question_1b_response: 'We know our main competitors but mostly focus on our own client work rather than monitoring them closely.',
  question_2a_response: 'We have identified key pain points like client communication taking too much time and project management being disorganized.',
  question_2b_response: 'Our main goals are to increase efficiency, reduce time spent on admin work, and grow revenue by 20% this year.',
  question_3a_response: 'Our team is adaptable and everyone wears multiple hats. We are all quick learners.',
  question_3b_response: 'I encourage the team to try new tools and processes when they will help us work better.',
  question_4a_response: 'We are open to new ideas but need to be careful not to disrupt our client work.',
  question_4b_response: 'We are willing to try new things but prefer to start small and test before committing fully.',
  question_5a_response: 'We use basic tools like email, Google Workspace, and some project management software.',
  question_5b_response: 'I handle most tech decisions myself with occasional help from a freelance IT person.',
  question_6a_response: 'Most of our data is in spreadsheets and Google Drive. We can access what we need.',
  question_6b_response: 'Our data is decent but could be better organized. We know what is accurate and what is not.'
};

const mockAnalysisData = {
  scoring: {
    market_strategy: { score: 7, rationale: 'Good local market understanding with growth opportunities identified' },
    business_understanding: { score: 8, rationale: 'Clear pain points identified with specific growth goals' },
    workforce_acumen: { score: 7, rationale: 'Adaptable team with learning mindset' },
    company_culture: { score: 6, rationale: 'Open to innovation but cautious about disruption' },
    role_of_technology: { score: 5, rationale: 'Basic technology usage with some support gaps' },
    data: { score: 5, rationale: 'Accessible but could be better organized' }
  },
  strategy_recommendation: {
    tier: 'Productivity',
    focus_areas: ['Process Automation', 'Client Communication', 'Data Organization']
  },
  roadmap: {
    immediate: 'Implement basic AI tools for client communication',
    short_term: 'Automate project management workflows',
    long_term: 'Develop comprehensive AI-driven business intelligence'
  },
  concerns_analysis: {
    risk_tolerance: 'moderate',
    implementation_barriers: ['resource_constraints', 'technical_expertise']
  }
};

/**
 * Mock delay to simulate API response time
 */
function mockDelay(ms = 500): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Mock threads API
 */
export const mockThreadsApi = {
  async create(): Promise<ThreadResponse> {
    await mockDelay(200);
    return {
      threadId: `mock-thread-${Date.now()}-${Math.random().toString(36).substring(7)}`
    };
  }
};

/**
 * Mock agents API - Quick Complete scenario
 * Each agent completes in 1-2 responses with realistic data
 */
export const mockAgentsApi = {
  async qualifier(request: QualifierRequest): Promise<QualifierResponse> {
    console.log('🎭 [MockAgent] Qualifier called with:', {
      messagesCount: request.messages.length,
      threadId: request.threadId
    });
    console.log('🎭 [MockAgent] RETURNING MOCK RESPONSE - NO HTTP REQUEST SHOULD BE MADE');

    await mockDelay();

    // Quick complete: Always complete on any user response
    return {
      response: `Thank you! I can see you're a ${mockQualifierData.business_type} in ${mockQualifierData.location} with ${mockQualifierData.employee_count} team members and around ${mockQualifierData.revenue_band} in revenue.

That gives me a great foundation to personalize your assessment. Now I'm going to hand you over to our Assessment Specialist who will walk you through 6 key areas of AI readiness.

Ready to begin your assessment?`,
      qualifier: mockQualifierData,
      isComplete: true,
      dynamicWeighting: {
        businessSize: 'small',
        technologyReadiness: 'emerging'
      },
      tokenUsage: {
        prompt_tokens: 150,
        completion_tokens: 75,
        total_tokens: 225
      }
    };
  },

  async assessor(request: AssessorRequest): Promise<AssessorResponse> {
    console.log('🎭 [MockAgent] Assessor called with:', {
      messagesCount: request.messages.length,
      threadId: request.threadId,
      hasQualifier: !!request.qualifier
    });

    await mockDelay();

    // Quick complete: Always complete on any user response
    return {
      response: `Perfect! I've completed your comprehensive assessment across all 6 key areas. Based on your responses, I can see you have a solid foundation with some great opportunities for AI implementation.

Your assessment is now complete and I'm passing your results to our Analysis Specialist who will calculate your scores and provide personalized recommendations.

They'll be with you shortly to share your AI Readiness results!`,
      assessmentData: mockAssessmentData,
      currentQuestionId: 'complete',
      isComplete: true,
      tokenUsage: {
        prompt_tokens: 200,
        completion_tokens: 85,
        total_tokens: 285
      }
    };
  },

  async analyzer(request: AnalyzerRequest): Promise<AnalyzerResponse> {
    console.log('🎭 [MockAgent] Analyzer called with:', {
      messagesCount: request.messages.length,
      threadId: request.threadId,
      hasQualifier: !!request.qualifier,
      hasAssessmentData: !!request.assessmentData
    });

    await mockDelay(800); // Slightly longer for analysis

    // Quick complete: Always complete on any user response
    return {
      response: `Excellent! I've completed your AI Readiness Analysis. Here are your results:

**Overall AI Readiness: Productivity Tier**

**Category Scores:**
• Market Strategy: 7/10 - Strong local market understanding
• Business Understanding: 8/10 - Clear goals and pain points identified
• Workforce & Team: 7/10 - Adaptable team with learning mindset
• Company Culture: 6/10 - Open to innovation, appropriately cautious
• Technology Usage: 5/10 - Basic tools, room for enhancement
• Data Practices: 5/10 - Accessible but needs organization

**Recommended Focus:** Start with AI tools for client communication and project management automation.

Your analysis is complete! Ready to generate your professional report?`,
      analysisData: mockAnalysisData,
      isComplete: true,
      tokenUsage: {
        prompt_tokens: 300,
        completion_tokens: 150,
        total_tokens: 450
      }
    };
  }
};

/**
 * Check if mocking is enabled via environment variable
 */
export function isMockingEnabled(): boolean {
  // Direct check works better than getEnvBoolean with Next.js client-side env vars
  return process.env.NEXT_PUBLIC_MOCK_AGENTS === 'true';
}