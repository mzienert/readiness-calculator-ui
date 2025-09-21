import { NextRequest } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import type { CoreMessage } from 'ai';
import OpenAI from 'openai';

export const maxDuration = 60;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ASSISTANT_ID = process.env.ANALYZER_ASSISTANT_ID;

if (!ASSISTANT_ID) {
  throw new Error('ANALYZER_ASSISTANT_ID environment variable is required');
}

interface AnalyzerRequest {
  messages: CoreMessage[];
  threadId?: string;
  qualifier?: { [key: string]: string }; // Business context from qualifier
  assessmentData?: { [key: string]: string }; // Raw assessment responses
}

interface AnalyzerResponse {
  message: string;
  analysis_complete: boolean;
  scoring: {
    [category: string]: {
      [questionKey: string]: number | string;
      total: number;
      level: string;
    };
  };
  strategy_recommendation: {
    primary_strategy: string;
    rationale: string;
    constraining_factors: string[];
    enabling_factors: string[];
  };
  roadmap: {
    [phase: string]: {
      timeline: string;
      focus: string;
      specific_recommendations: string[];
    };
  };
  concerns_analysis: {
    identified_concerns: string[];
    mitigation_strategies: { [concern: string]: string };
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('🔄 [AnalyzerAgent] Starting request processing');

  try {
    // Verify authentication
    const session = await auth();
    if (!session?.user) {
      return new ChatSDKError('unauthorized:api').toResponse();
    }

    console.log(`👤 [AnalyzerAgent] User: ${session.user.id}`);

    // Parse request body
    const { messages, threadId, qualifier, assessmentData }: AnalyzerRequest =
      await request.json();

    if (!messages || !Array.isArray(messages)) {
      return new ChatSDKError(
        'bad_request:api',
        'Messages array is required',
      ).toResponse();
    }

    console.log(`📥 [AnalyzerAgent] Received ${messages.length} messages`);
    console.log(
      `📝 [AnalyzerAgent] Last user message: "${messages[messages.length - 1]?.content}"`,
    );
    if (qualifier) {
      console.log(`📊 [AnalyzerAgent] Qualifier context:`, qualifier);
    }
    if (assessmentData) {
      console.log(`📋 [AnalyzerAgent] Assessment data:`, assessmentData);
    }

    // Use thread provided by orchestrator or create new one
    let thread;
    if (threadId) {
      console.log(`🧵 [AnalyzerAgent] Using provided thread: ${threadId}`);
      thread = { id: threadId };
    } else {
      console.log('🧵 [AnalyzerAgent] Creating new thread...');
      thread = await openai.beta.threads.create();
      console.log(`✅ [AnalyzerAgent] Thread created: ${thread.id}`);
    }

    // Determine if this is the first message to analyzer (transition from assessor)
    const isFirstMessage = messages.length <= 5; // Heuristic for transition

    // Add assessment context only on first message to the analyzer thread
    if ((qualifier || assessmentData) && isFirstMessage) {
      console.log(
        '📤 [AnalyzerAgent] FIRST MESSAGE: Adding assessment context to thread...',
      );

      const qualifierInfo = qualifier?.collected_responses || qualifier || {};
      const assessmentInfo = assessmentData || {};

      const analysisContext = `ASSESSMENT DATA for analysis:

BUSINESS QUALIFIERS:
${Object.entries(qualifierInfo)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

ASSESSMENT RESPONSES:
${Object.entries(assessmentInfo)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

Please analyze this data using the 6-category scoring framework with dynamic weighting based on the business qualifiers. Generate scores, determine the appropriate AI strategy recommendation, and create a phased roadmap. Start by greeting them and explaining that you're analyzing their assessment results.`;

      await openai.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: analysisContext,
      });
      console.log(`✅ [AnalyzerAgent] Added assessment context to thread`);
    } else if (qualifier || assessmentData) {
      console.log(`📝 [AnalyzerAgent] CONTINUING THREAD: Skipping context (already provided)`);
    }

    // Add the latest user message to the thread
    console.log(
      '📤 [AnalyzerAgent] Adding latest user message to thread...',
    );
    const latestUserMessage = messages.filter((m) => m.role === 'user').pop();
    if (latestUserMessage) {
      await openai.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: latestUserMessage.content as string,
      });
      console.log(`✅ [AnalyzerAgent] Added latest user message to thread`);
    }

    // Run the assistant
    console.log(`🤖 [AnalyzerAgent] Running assistant ${ASSISTANT_ID}...`);
    console.log(`🔧 [AnalyzerAgent] Using response_format: json_object`);
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID!,
      response_format: { type: 'json_object' },
    });
    console.log(`🏃 [AnalyzerAgent] Run started: ${run.id}`);

    // Wait for completion
    console.log('⏳ [AnalyzerAgent] Waiting for assistant response...');
    let runStatus = await openai.beta.threads.runs.retrieve(run.id, {
      thread_id: thread.id,
    });

    let pollCount = 0;
    while (
      runStatus.status === 'queued' ||
      runStatus.status === 'in_progress'
    ) {
      pollCount++;
      console.log(
        `🔄 [AnalyzerAgent] Poll ${pollCount}: Status ${runStatus.status}`,
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(run.id, {
        thread_id: thread.id,
      });
    }

    console.log(
      `✅ [AnalyzerAgent] Run completed with status: ${runStatus.status}`,
    );

    if (runStatus.status !== 'completed') {
      console.error(`❌ [AnalyzerAgent] Run failed:`, runStatus.last_error);
      throw new Error(`Assistant run failed with status: ${runStatus.status}`);
    }

    // Get the assistant's response
    console.log('📨 [AnalyzerAgent] Fetching assistant response...');
    const assistantMessages = await openai.beta.threads.messages.list(
      thread.id,
    );
    const lastMessage = assistantMessages.data[0];

    // Get token usage from the run
    const tokenUsage = runStatus.usage ? {
      prompt_tokens: runStatus.usage.prompt_tokens || 0,
      completion_tokens: runStatus.usage.completion_tokens || 0,
      total_tokens: runStatus.usage.total_tokens || 0,
    } : undefined;

    if (
      lastMessage.role !== 'assistant' ||
      lastMessage.content[0].type !== 'text'
    ) {
      console.error('❌ [AnalyzerAgent] Invalid response format:', lastMessage);
      throw new Error('Invalid assistant response format');
    }

    const responseText = lastMessage.content[0].text.value;
    console.log(
      `📄 [AnalyzerAgent] Raw response (${responseText.length} chars):`,
      responseText,
    );

    // Try to parse JSON response
    let assistantResponse: AnalyzerResponse;
    try {
      assistantResponse = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ [AnalyzerAgent] JSON Parse Error:', parseError);
      console.log(
        '📝 [AnalyzerAgent] Raw response that failed to parse:',
        responseText,
      );
      console.log(
        '🔍 [AnalyzerAgent] First 200 chars:',
        responseText.substring(0, 200),
      );

      // Try to fix common JSON issues
      try {
        const cleanedResponse = responseText
          .replace(/\n/g, '\\n') // Escape newlines
          .replace(/\r/g, '\\r') // Escape carriage returns
          .replace(/\t/g, '\\t'); // Escape tabs

        console.log('🔧 [AnalyzerAgent] Attempting to parse cleaned JSON...');
        assistantResponse = JSON.parse(cleanedResponse);
        console.log('✅ [AnalyzerAgent] Successfully parsed cleaned JSON');
      } catch (secondParseError) {
        console.error(
          '❌ [AnalyzerAgent] Cleaned JSON still failed:',
          secondParseError,
        );

        // Last resort: create structured response from plain text
        console.log(
          '🔄 [AnalyzerAgent] Creating structured response from plain text...',
        );
        assistantResponse = {
          message: responseText.trim(),
          analysis_complete: true, // Assume complete for fallback
          scoring: {}, // Empty for now since we can't parse
          strategy_recommendation: {
            primary_strategy: 'Efficiency Strategy',
            rationale: 'Fallback recommendation due to parsing error',
            constraining_factors: ['Technical parsing issue'],
            enabling_factors: [],
          },
          roadmap: {},
          concerns_analysis: {
            identified_concerns: [],
            mitigation_strategies: {},
          },
        };
        console.log('✅ [AnalyzerAgent] Created fallback structured response');
      }
    }

    console.log('🎯 [AnalyzerAgent] Parsed response:', {
      message_preview: `${assistantResponse.message.substring(0, 100)}...`,
      analysis_complete: assistantResponse.analysis_complete,
      has_scoring: !!assistantResponse.scoring,
      has_strategy: !!assistantResponse.strategy_recommendation,
      has_roadmap: !!assistantResponse.roadmap,
      has_concerns: !!assistantResponse.concerns_analysis,
    });

    // Preserve thread (don't delete) for continued conversation
    console.log(`💾 [AnalyzerAgent] Preserving thread: ${thread.id}`);

    // Return in format expected by orchestrator
    const result = {
      response: assistantResponse.message,
      analysisData: {
        scoring: assistantResponse.scoring,
        strategy_recommendation: assistantResponse.strategy_recommendation,
        roadmap: assistantResponse.roadmap,
        concerns_analysis: assistantResponse.concerns_analysis,
      },
      isComplete: assistantResponse.analysis_complete,
      tokenUsage,
    };

    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`✅ [AnalyzerAgent] Request completed in ${duration}ms`);
    console.log(`📊 [AnalyzerAgent] Result:`, {
      isComplete: result.isComplete,
      hasAnalysisData: !!result.analysisData,
      responseLength: result.response.length,
    });

    return Response.json(result);
  } catch (error) {
    console.error('Analyzer agent error:', error);

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    return new ChatSDKError(
      'bad_request:api',
      'Analyzer processing failed',
    ).toResponse();
  }
}