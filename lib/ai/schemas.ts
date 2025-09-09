import { z } from 'zod';

// SMB Business Context Schema
export const smbQualifierSchema = z.object({
  employeeCount: z.enum(['1', '2-10', '11-50', '51-250', '250+']),
  revenueBand: z.enum(['under-100k', '100k-1m', '1m-5m', '5m-10m', '10m+']),
  businessType: z.enum(['solopreneur', 'family-owned', 'rural-local', 'small-team', 'medium-business']),
  industry: z.enum(['health-services', 'retail-trade', 'food-service', 'construction', 'professional-services', 'other']).optional(),
  location: z.string().optional(), // e.g., "La Plata County, CO"
});

export type SMBQualifier = z.infer<typeof smbQualifierSchema>;

// Dynamic Weighting Configuration
export const dynamicWeightingSchema = z.object({
  solopreneurBonus: z.number().default(1), // +1 point bonus for solopreneurs
  budgetSensitive: z.boolean().default(false), // true for revenue < 100k
  ruralFocus: z.boolean().default(false), // true for rural/local businesses
  scoreAdjustment: z.number().default(0), // overall score adjustment
});

export type DynamicWeighting = z.infer<typeof dynamicWeightingSchema>;

// Assessment Question Response Schema
export const assessmentResponseSchema = z.object({
  questionId: z.string(), // e.g., "1a", "1b", "2a", etc.
  category: z.enum(['market_strategy', 'business_understanding', 'workforce_acumen', 'company_culture', 'role_of_technology', 'data']),
  score: z.number().min(1).max(5),
  response: z.string(), // user's actual response
  reasoning: z.string().optional(), // AI's reasoning for the score
});

export type AssessmentResponse = z.infer<typeof assessmentResponseSchema>;

// AI Strategy Tier Schema
export const aiStrategySchema = z.enum(['efficiency', 'productivity', 'effectiveness', 'growth', 'expert']);

export type AIStrategy = z.infer<typeof aiStrategySchema>;

// Agent State Schema
export const agentStateSchema = z.object({
  currentAgent: z.enum(['qualifier', 'assessor', 'analyzer', 'reporter']),
  phase: z.enum(['qualifying', 'assessing', 'analyzing', 'reporting', 'complete']),
  
  // Qualifier Data
  qualifier: smbQualifierSchema.optional(),
  dynamicWeighting: dynamicWeightingSchema.optional(),
  
  // Assessment Data
  responses: z.array(assessmentResponseSchema).default([]),
  currentCategory: z.enum(['market_strategy', 'business_understanding', 'workforce_acumen', 'company_culture', 'role_of_technology', 'data']).optional(),
  currentQuestionId: z.string().optional(),
  
  // Analysis Results
  categoryScores: z.record(z.string(), z.number()).optional(), // category name -> total score
  overallScore: z.number().optional(),
  recommendedStrategy: aiStrategySchema.optional(),
  roadmap: z.array(z.object({
    phase: z.string(), // "Phase 1", "Phase 2", "Phase 3"
    timeline: z.string(), // "3-6 months"
    description: z.string(),
    actions: z.array(z.string()),
  })).optional(),
  
  // Metadata
  sessionId: z.string(),
  userId: z.string(),
  startedAt: z.string(), // ISO date string
  completedAt: z.string().optional(), // ISO date string
});

export type AgentState = z.infer<typeof agentStateSchema>;

// Agent Response Schema (for structured outputs)
export const qualifierResponseSchema = z.object({
  type: z.literal('qualifier_complete'),
  qualifier: smbQualifierSchema,
  dynamicWeighting: dynamicWeightingSchema,
  nextMessage: z.string(), // message to user about starting assessment
  readyForAssessment: z.boolean(),
});

export type QualifierResponse = z.infer<typeof qualifierResponseSchema>;

// Orchestrator Action Schema
export const orchestratorActionSchema = z.object({
  action: z.enum(['continue', 'handoff', 'complete', 'error']),
  nextAgent: z.enum(['qualifier', 'assessor', 'analyzer', 'reporter']).optional(),
  message: z.string().optional(),
  error: z.string().optional(),
});

export type OrchestratorAction = z.infer<typeof orchestratorActionSchema>;