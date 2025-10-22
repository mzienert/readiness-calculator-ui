import { Agent } from '@openai/agents';
import { z } from 'zod';
import agentConfig from './agent_config.json';

// ============================================================================
// SCHEMAS - Structured Output Definitions
// ============================================================================

/**
 * Qualifier Output Schema
 * Collects business context: employees, revenue, type, location, industry
 */
export const QualifierOutputSchema = z.object({
  message: z.string(),
  employee_count: z.string(),
  revenue_band: z.string(),
  business_type: z.string(),
  location: z.string(),
  industry: z.string(),
  needs_more_info: z.boolean(),
  solopreneurBonus: z.number(),
  budgetSensitive: z.boolean(),
  ruralFocus: z.boolean(),
  scoreAdjustment: z.number(),
});

export type QualifierOutputType = z.infer<typeof QualifierOutputSchema>;

/**
 * Assessor Output Schema
 * Tracks assessment progress across 6 categories
 */
export const AssessorOutputSchema = z.object({
  message: z.string(),
  current_question_id: z.string(),
  assessment_complete: z.boolean(),
  questions_asked: z.number(),
  total_questions: z.number(),
});

export type AssessorOutputType = z.infer<typeof AssessorOutputSchema>;

/**
 * Analyzer Output Schema
 * Generates scores, strategy recommendation, and roadmap
 */
export const AnalyzerOutputSchema = z.object({
  message: z.string(),
  analysis_complete: z.boolean(),
  overall_score: z.number(),
  // Individual category scores
  market_strategy_score: z.number(),
  business_understanding_score: z.number(),
  workforce_acumen_score: z.number(),
  company_culture_score: z.number(),
  role_of_technology_score: z.number(),
  data_score: z.number(),
  // Strategy
  primary_strategy: z.string(),
  strategy_rationale: z.string(),
  // Roadmap phases
  phase_1_timeline: z.string(),
  phase_1_focus: z.string(),
  phase_2_timeline: z.string(),
  phase_2_focus: z.string(),
  phase_3_timeline: z.string(),
  phase_3_focus: z.string(),
});

export type AnalyzerOutputType = z.infer<typeof AnalyzerOutputSchema>;

// ============================================================================
// AGENT DEFINITIONS - OpenAI Agents SDK Configuration
// ============================================================================

// Extract agent configurations from JSON
const { agents: agentConfigs } = agentConfig;

// Create agents with proper handoff references
// Note: Agents must be created in reverse order so handoffs can reference them
export const analyzerAgent = new Agent({
  name: agentConfigs.analyzer.name,
  instructions: agentConfigs.analyzer.instructions,
  model: agentConfigs.analyzer.model,
  outputType: AnalyzerOutputSchema,
});

export const assessorAgent = new Agent({
  name: agentConfigs.assessor.name,
  instructions: agentConfigs.assessor.instructions,
  model: agentConfigs.assessor.model,
  outputType: AssessorOutputSchema,
  handoffs: [analyzerAgent],
  handoffDescription: agentConfigs.assessor.handoffDescription,
});

export const qualifierAgent = new Agent({
  name: agentConfigs.qualifier.name,
  instructions: agentConfigs.qualifier.instructions,
  model: agentConfigs.qualifier.model,
  outputType: QualifierOutputSchema,
  handoffs: [assessorAgent],
});

// Export for easy access
export const agents = {
  qualifier: qualifierAgent,
  assessor: assessorAgent,
  analyzer: analyzerAgent,
};

