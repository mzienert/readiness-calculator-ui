import { z } from 'zod';

// NOTE: This module calls an OpenAI Assistant by ID via the Responses API.
// It does not add any new dependencies; it uses fetch against https://api.openai.com/v1/responses.
// Provide your Assistant ID at call time. A default is exported below.

export const DEFAULT_QUALIFIER_ASSISTANT_ID = 'asst_8xRuFxZ4vBAQhbOUk8sV8Nyd';

// -----------------------------
// Schema: Qualifier Output
// -----------------------------
// This Zod schema mirrors the structure in `Agents/Complete_JSON_Schema.md`.
export const QualifierOutputSchema = z.object({
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

export type QualifierOutput = z.infer<typeof QualifierOutputSchema>;

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
    payload.metadata = { qualifier_force_json: 'true' };
    // Optionally, you could also add a final user nudge via messages to emit only JSON
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
  // Prefer the latest output message's textual content
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
// Public Qualifier helpers
// -----------------------------

export async function startQualifier({ assistantId }: { assistantId: string }) {
  const text = await callOpenAIAssistant({
    assistantId,
    messages: [
      {
        role: 'user',
        content:
          'Begin the qualifier. Ask only the first question about employee count, then wait for my reply. Do not ask more than one question at a time.',
      },
    ],
  });
  return { message: text };
}

// Convenience wrappers that use the default assistant ID
export async function startQualifierDefault() {
  return startQualifier({ assistantId: DEFAULT_QUALIFIER_ASSISTANT_ID });
}

export async function continueQualifierDefault({
  history,
}: {
  history: Array<ConversationMessage>;
}) {
  return continueQualifier({ assistantId: DEFAULT_QUALIFIER_ASSISTANT_ID, history });
}

export async function finalizeQualifierFromAnswersDefault(args: {
  employeeCount: number;
  revenueBand: 'under $100K' | '$100K–$1M' | '$1M–$5M' | '$5M–$10M' | '$10M+';
  businessType: string;
}) {
  return finalizeQualifierFromAnswers({ assistantId: DEFAULT_QUALIFIER_ASSISTANT_ID, ...args });
}

export async function continueQualifier({
  assistantId,
  history,
}: {
  assistantId: string;
  history: Array<ConversationMessage>;
}) {
  const text = await callOpenAIAssistant({ assistantId, messages: history });
  return { message: text };
}

export async function finalizeQualifierFromAnswers({
  assistantId,
  employeeCount,
  revenueBand,
  businessType,
}: {
  assistantId: string;
  employeeCount: number;
  revenueBand: 'under $100K' | '$100K–$1M' | '$1M–$5M' | '$5M–$10M' | '$10M+';
  businessType: string;
}): Promise<QualifierOutput> {
  const text = await callOpenAIAssistant({
    assistantId,
    forceJsonOutput: true,
    messages: [
      {
        role: 'user',
        content:
          'Using our qualifier conversation so far, produce ONLY the final JSON for the SMB assessment profile per the complete schema. No prose.',
      },
      {
        role: 'user',
        content: `Answers:\n- employee_count: ${employeeCount}\n- revenue_band: ${revenueBand}\n- business_type: ${businessType}`,
      },
    ],
  });

  return parseQualifierResult(text);
}

export function parseQualifierResult(jsonText: string): QualifierOutput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (_) {
    throw new Error('Assistant did not return valid JSON');
  }
  const result = QualifierOutputSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error('Assistant JSON did not match the expected Qualifier schema');
  }
  return result.data;
}


