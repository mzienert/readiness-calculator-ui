import { z } from 'zod';

// NOTE: This module calls an OpenAI Assistant by ID via the Responses API.
// It does not add any new dependencies; it uses fetch against https://api.openai.com/v1/responses.
// Provide your Assistant ID at call time. A default is exported below.

export const DEFAULT_ANALYSIS_ASSISTANT_ID = 'asst_d0z29zrFrY54J0diL7vejGOp';

// -----------------------------
// Schema: Analysis Output
// -----------------------------
// Mirrors the structure used by Assessment/Qualifier and adds analysis-only fields.
// We validate key metadata while allowing pass-through for nested content.
export const AnalysisOutputSchema = z.object({
  ai_readiness_assessment: z.object({
    metadata: z.object({
      version: z.literal('SMB-1.0'),
      title: z.string(),
      description: z.string(),
      scoring_range: z.object({ min: z.number(), max: z.number(), category_min: z.number(), category_max: z.number() }),
      scoring_levels: z.record(z.string(), z.string()),
      qualifiers: z.object({
        employee_count: z.object({ description: z.string(), value: z.number().nullable() }),
        revenue_band: z.object({ description: z.string(), value: z.string().nullable() }),
        business_type: z.object({ description: z.string(), value: z.string().nullable() }),
      }),
      dynamic_weighting: z.object({
        description: z.string(),
        rules: z.object({
          solopreneur_relaxation: z.boolean().nullable(),
          small_team_relaxation: z.boolean().nullable(),
          rural_focus_weighting: z.boolean().nullable(),
          budget_modifier: z.boolean().nullable(),
        }),
        notes: z.string().nullable(),
      }),
    }),
    categories: z.any(),
    scoring_matrices: z.any(),
    ai_strategies: z.any(),
    client_concerns: z.any(),
    assessment_result: z
      .object({})
      .passthrough(),
  }),
});

export type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>;

// -----------------------------
// OpenAI Responses API helpers
// -----------------------------

type ConversationMessage = { role: 'user' | 'assistant'; content: string };

interface CallAssistantParams {
  assistantId: string;
  messages: Array<ConversationMessage>;
  forceJsonOutput?: boolean;
}

async function callOpenAIAssistant({ assistantId, messages, forceJsonOutput }: CallAssistantParams): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  // Build Responses API payload
  const payload: any = {
    assistant_id: assistantId,
    input: messages.map((m) => ({
      role: m.role,
      content: [
        {
          type: 'input_text',
          text: m.content,
        },
      ],
    })),
  };

  // When forcing final JSON, strongly instruct the assistant
  if (forceJsonOutput) {
    payload.metadata = { analysis_force_json: 'true' };
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI Responses API error: ${response.status} ${errText}`);
  }

  const data: any = await response.json();

  // Extract text in a robust way from the Responses API structure
  const texts: Array<string> = [];
  try {
    if (Array.isArray(data.output)) {
      for (const item of data.output) {
        if (item.type === 'message' && item.message && Array.isArray(item.message.content)) {
          for (const c of item.message.content) {
            if (c.type === 'output_text' && c.text) {
              texts.push(c.text);
            } else if (c.type === 'text' && c.text) {
              texts.push(c.text);
            } else if (typeof c === 'string') {
              texts.push(c);
            }
          }
        }
      }
    }
  } catch (_) {
    // fall through to other heuristics
  }

  // Fallbacks
  if (texts.length === 0 && typeof data.output_text === 'string') {
    texts.push(data.output_text);
  }
  if (texts.length === 0 && data?.message?.content?.[0]?.text) {
    texts.push(data.message.content[0].text);
  }

  const combined = texts.join('\n').trim();
  if (!combined) {
    throw new Error('No textual output found in Responses API result');
  }
  return combined;
}

// -----------------------------
// Public Analysis helpers
// -----------------------------

/**
 * Start analysis (optional conversational step; usually analysis is finalize-only).
 * Provide the full Assessment JSON as context; the assistant should not ask questions.
 */
export async function startAnalysis({
  assistantId,
  assessmentJson,
}: {
  assistantId: string;
  assessmentJson: unknown;
}) {
  const assessmentJsonText = typeof assessmentJson === 'string' ? assessmentJson : JSON.stringify(assessmentJson, null, 2);
  const text = await callOpenAIAssistant({
    assistantId,
    messages: [
      {
        role: 'user',
        content:
          'You are the AnalysisAgent. Read the provided assessment JSON context. Do not ask questions. Acknowledge readiness to produce final analysis JSON when requested.',
      },
      {
        role: 'user',
        content: `Assessment JSON (context):\n${assessmentJsonText}`,
      },
    ],
  });
  return { message: text };
}

export async function startAnalysisDefault(args: { assessmentJson: unknown }) {
  return startAnalysis({ assistantId: DEFAULT_ANALYSIS_ASSISTANT_ID, ...args });
}

export async function continueAnalysis({
  assistantId,
  history,
}: {
  assistantId: string;
  history: Array<ConversationMessage>;
}) {
  const text = await callOpenAIAssistant({ assistantId, messages: history });
  return { message: text };
}

export async function continueAnalysisDefault({
  history,
}: {
  history: Array<ConversationMessage>;
}) {
  return continueAnalysis({ assistantId: DEFAULT_ANALYSIS_ASSISTANT_ID, history });
}

/**
 * Finalize the analysis into JSON using the full Assessment JSON (including scores and qualifiers).
 * Returns parsed AnalysisOutput validated against the analysis schema.
 */
export async function finalizeAnalysisFromAssessment({
  assistantId,
  assessmentJson,
  history,
}: {
  assistantId: string;
  assessmentJson: unknown;
  history?: Array<ConversationMessage>;
}): Promise<AnalysisOutput> {
  const assessmentJsonText = typeof assessmentJson === 'string' ? assessmentJson : JSON.stringify(assessmentJson);
  const text = await callOpenAIAssistant({
    assistantId,
    forceJsonOutput: true,
    messages: [
      ...(history ?? []),
      {
        role: 'user',
        content:
          'Using the assessment JSON provided below (with qualifiers, dynamic weighting flags, scores, and concerns), produce ONLY the final JSON for analysis fields per the complete schema. No prose. Preserve existing structure and keys. Fill only analysis-related fields under assessment_result, including overall_score, readiness_level, recommended_strategies, client_concerns_addressed, strategy_rationale, roadmap, assessor="AnalysisAgent", and dynamic_weights_applied with all required logging fields.',
      },
      {
        role: 'user',
        content: `Assessment JSON:\n${assessmentJsonText}`,
      },
    ],
  });

  return parseAnalysisResult(text);
}

export async function finalizeAnalysisFromAssessmentDefault(args: {
  assessmentJson: unknown;
  history?: Array<ConversationMessage>;
}) {
  return finalizeAnalysisFromAssessment({ assistantId: DEFAULT_ANALYSIS_ASSISTANT_ID, ...args });
}

export function parseAnalysisResult(jsonText: string): AnalysisOutput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (_) {
    throw new Error('Assistant did not return valid JSON');
  }
  const result = AnalysisOutputSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error('Assistant JSON did not match the expected Analysis schema');
  }
  return result.data;
}
