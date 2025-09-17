import { z } from 'zod';

// Note: SMB Qualifier schema is now flexible (any string key-value pairs)
// This allows non-technical users to modify agent instructions without code changes

// Dynamic Weighting Configuration
export const dynamicWeightingSchema = z.object({
  solopreneurBonus: z.number().default(1), // +1 point bonus for solopreneurs
  budgetSensitive: z.boolean().default(false), // true for revenue < 100k
  ruralFocus: z.boolean().default(false), // true for rural/local businesses
  scoreAdjustment: z.number().default(0), // overall score adjustment
});

export type DynamicWeighting = z.infer<typeof dynamicWeightingSchema>;

// Token Usage Tracking Schema
export const tokenUsageSchema = z.object({
  prompt_tokens: z.number().default(0), // Tokens sent to OpenAI
  completion_tokens: z.number().default(0), // Tokens received from OpenAI
  total_tokens: z.number().default(0), // Total tokens used
});

export type TokenUsage = z.infer<typeof tokenUsageSchema>;

// Assessment Question Response Schema
export const assessmentResponseSchema = z.object({
  questionId: z.string(), // e.g., "1a", "1b", "2a", etc.
  category: z.enum([
    'market_strategy',
    'business_understanding',
    'workforce_acumen',
    'company_culture',
    'role_of_technology',
    'data',
  ]),
  score: z.number().min(1).max(5),
  response: z.string(), // user's actual response
  reasoning: z.string().optional(), // AI's reasoning for the score
});

export type AssessmentResponse = z.infer<typeof assessmentResponseSchema>;

// AI Strategy Tier Schema
export const aiStrategySchema = z.enum([
  'efficiency',
  'productivity',
  'effectiveness',
  'growth',
  'expert',
]);

export type AIStrategy = z.infer<typeof aiStrategySchema>;

// Agent State Schema
export const agentStateSchema = z.object({
  currentAgent: z.enum(['qualifier', 'assessor', 'analyzer', 'reporter']),
  phase: z.enum([
    'qualifying',
    'assessing',
    'analyzing',
    'reporting',
    'complete',
  ]),

  // Qualifier Data
  qualifier: z
    .object({
      collected_responses: z.record(z.string(), z.string()).optional(), // Flexible responses from qualifier agent
      needs_more_info: z.boolean().optional(),
    })
    .optional(),
  dynamicWeighting: dynamicWeightingSchema.optional(),

  // Assessment Data
  assessor: z
    .object({
      collected_responses: z.record(z.string(), z.string()).optional(), // Raw responses from assessor agent (flexible schema)
      currentQuestionId: z.string().optional(),
      assessment_complete: z.boolean().optional(),
    })
    .optional(),
  responses: z.array(assessmentResponseSchema).default([]), // Structured responses from analyzer agent (with scores)
  currentCategory: z
    .enum([
      'market_strategy',
      'business_understanding',
      'workforce_acumen',
      'company_culture',
      'role_of_technology',
      'data',
    ])
    .optional(),

  // Analysis Results
  categoryScores: z.record(z.string(), z.number()).optional(), // category name -> total score
  overallScore: z.number().optional(),
  recommendedStrategy: aiStrategySchema.optional(),
  roadmap: z
    .array(
      z.object({
        phase: z.string(), // "Phase 1", "Phase 2", "Phase 3"
        timeline: z.string(), // "3-6 months"
        description: z.string(),
        actions: z.array(z.string()),
      }),
    )
    .optional(),

  // Token Usage Tracking
  tokenUsage: tokenUsageSchema.default({
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
  }),

  // Metadata
  sessionId: z.string(),
  userId: z.string(),
  threadId: z.string().optional(), // OpenAI thread ID for conversation persistence
  startedAt: z.string(), // ISO date string
  completedAt: z.string().optional(), // ISO date string
});

export type AgentState = z.infer<typeof agentStateSchema>;

// Agent Response Schema (for structured outputs)
export const qualifierResponseSchema = z.object({
  type: z.literal('qualifier_complete'),
  qualifier: z.record(z.string(), z.string()), // Dynamic key-value pairs
  dynamicWeighting: dynamicWeightingSchema,
  nextMessage: z.string(), // message to user about starting assessment
  readyForAssessment: z.boolean(),
});

export type QualifierResponse = z.infer<typeof qualifierResponseSchema>;

// Orchestrator Action Schema
export const orchestratorActionSchema = z.object({
  action: z.enum(['continue', 'handoff', 'complete', 'error']),
  nextAgent: z
    .enum(['qualifier', 'assessor', 'analyzer', 'reporter'])
    .optional(),
  message: z.string().optional(),
  error: z.string().optional(),
});

export type OrchestratorAction = z.infer<typeof orchestratorActionSchema>;
