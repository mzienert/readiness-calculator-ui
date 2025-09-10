import { z } from 'zod';

// NOTE: This module calls an OpenAI Assistant by ID via the Responses API.
// It does not add any new dependencies; it uses fetch against https://api.openai.com/v1/responses.
// Provide your Assistant ID at call time. A default is exported below.

export const DEFAULT_ASSESSMENT_ASSISTANT_ID = 'asst_7sHspkfcdRygnHL1u3FBfvfA';

// -----------------------------
// Schema: Assessment Output
// -----------------------------
// Mirrors the structure in `Agents/Complete_JSON_Schema.md`.
// We validate the outer shape and key metadata while allowing pass-through
// for nested assessment results and category content.
export const AssessmentOutputSchema = z.object({
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
    assessment_result: z.object({}).passthrough(),
  }),
});

export type AssessmentOutput = z.infer<typeof AssessmentOutputSchema>;

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
    payload.metadata = { assessment_force_json: 'true' };
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
// Public Assessment helpers
// -----------------------------

/**
 * Start the 6-category assessment (asks only the first question and waits).
 * Provide the prior Qualifier JSON to establish context.
 */
export async function startAssessment({
  assistantId,
  qualifierJson,
}: {
  assistantId: string;
  qualifierJson: unknown;
}) {
  const qualifierJsonText = typeof qualifierJson === 'string' ? qualifierJson : JSON.stringify(qualifierJson, null, 2);
  const text = await callOpenAIAssistant({
    assistantId,
    messages: [
      {
        role: 'user',
        content:
          'Begin the SMB AI readiness assessment. Ask only the first question (1a) and wait for my reply. Use the provided qualifier JSON as context. Do not ask more than one question at a time.',
      },
      {
        role: 'user',
        content: `Qualifier JSON (context):\n${qualifierJsonText}`,
      },
    ],
  });
  return { message: text };
}

// Convenience wrappers that use the default assistant ID
export async function startAssessmentDefault(args: { qualifierJson: unknown }) {
  return startAssessment({ assistantId: DEFAULT_ASSESSMENT_ASSISTANT_ID, ...args });
}

export async function continueAssessment({
  assistantId,
  history,
}: {
  assistantId: string;
  history: Array<ConversationMessage>;
}) {
  const text = await callOpenAIAssistant({ assistantId, messages: history });
  return { message: text };
}

export async function continueAssessmentDefault({
  history,
}: {
  history: Array<ConversationMessage>;
}) {
  return continueAssessment({ assistantId: DEFAULT_ASSESSMENT_ASSISTANT_ID, history });
}

/**
 * Finalize the assessment into JSON using the conversation history and base Qualifier JSON.
 * Returns parsed AssessmentOutput validated against the assessment schema.
 */
export async function finalizeAssessmentFromHistory({
  assistantId,
  qualifierJson,
  history,
}: {
  assistantId: string;
  qualifierJson: unknown;
  history: Array<ConversationMessage>;
}): Promise<AssessmentOutput> {
  const qualifierJsonText = typeof qualifierJson === 'string' ? qualifierJson : JSON.stringify(qualifierJson);
  const text = await callOpenAIAssistant({
    assistantId,
    forceJsonOutput: true,
    messages: [
      ...history,
      {
        role: 'user',
        content:
          'Using the Qualifier JSON provided below and our assessment conversation so far, produce ONLY the final JSON per the complete schema. No prose. Merge results into the provided structure and preserve existing keys and values. Do not apply dynamic weighting or strategies.',
      },
      {
        role: 'user',
        content: `Qualifier JSON:\n${qualifierJsonText}`,
      },
    ],
  });

  return parseAssessmentResult(text);
}

export async function finalizeAssessmentFromHistoryDefault(args: {
  qualifierJson: unknown;
  history: Array<ConversationMessage>;
}) {
  return finalizeAssessmentFromHistory({ assistantId: DEFAULT_ASSESSMENT_ASSISTANT_ID, ...args });
}

export function parseAssessmentResult(jsonText: string): AssessmentOutput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (_) {
    throw new Error('Assistant did not return valid JSON');
  }
  const result = AssessmentOutputSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error('Assistant JSON did not match the expected Assessment schema');
  }
  return result.data;
}


