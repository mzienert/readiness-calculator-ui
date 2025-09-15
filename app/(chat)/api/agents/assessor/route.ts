import { NextRequest } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import type { CoreMessage } from 'ai';
import OpenAI from 'openai';

export const maxDuration = 60;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ASSISTANT_ID = 'asst_wmitwNMH5YwodUGXryvV1CuA';

interface AssessorRequest {
  messages: CoreMessage[];
  threadId?: string;
  qualifier?: { [key: string]: string }; // Pass qualifier context for personalization
}

interface AssessorResponse {
  message: string;
  collected_responses: {
    question_1a_response?: string;
    question_1b_response?: string;
    question_2a_response?: string;
    question_2b_response?: string;
    question_3a_response?: string;
    question_3b_response?: string;
    question_4a_response?: string;
    question_4b_response?: string;
    question_5a_response?: string;
    question_5b_response?: string;
    question_6a_response?: string;
    question_6b_response?: string;
  };
  current_question_id: string;
  assessment_complete: boolean;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('🔄 [AssessorAgent] Starting request processing');

  try {
    // Verify authentication
    const session = await auth();
    if (!session?.user) {
      return new ChatSDKError('unauthorized:api').toResponse();
    }

    console.log(`👤 [AssessorAgent] User: ${session.user.id}`);

    // Parse request body
    const { messages, threadId, qualifier }: AssessorRequest = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return new ChatSDKError(
        'bad_request:api',
        'Messages array is required',
      ).toResponse();
    }

    console.log(`📥 [AssessorAgent] Received ${messages.length} messages`);
    console.log(
      `📝 [AssessorAgent] Last user message: "${messages[messages.length - 1]?.content}"`,
    );
    if (qualifier) {
      console.log(`📊 [AssessorAgent] Qualifier context:`, qualifier);
    }

    // Use provided thread or create new one
    let thread;
    if (threadId) {
      console.log(`🧵 [AssessorAgent] Using existing thread: ${threadId}`);
      thread = { id: threadId };
    } else {
      console.log('🧵 [AssessorAgent] Creating new thread...');
      thread = await openai.beta.threads.create();
      console.log(`✅ [AssessorAgent] Thread created: ${thread.id}`);
    }

    // Add qualifier context as initial system message if provided and it's a new thread
    if (!threadId && qualifier) {
      console.log('📤 [AssessorAgent] Adding qualifier context to new thread...');
      const qualifierContext = `BUSINESS CONTEXT from qualification:
${Object.entries(qualifier)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

Please use this context to personalize your assessment questions and language.`;

      await openai.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: qualifierContext,
      });
      console.log(`✅ [AssessorAgent] Added qualifier context to thread`);
    }

    // Add messages to thread
    if (threadId) {
      // For existing threads, only add the latest user message
      console.log(
        '📤 [AssessorAgent] Adding latest message to existing thread...',
      );
      const latestUserMessage = messages.filter((m) => m.role === 'user').pop();
      if (latestUserMessage) {
        await openai.beta.threads.messages.create(thread.id, {
          role: 'user',
          content: latestUserMessage.content as string,
        });
        console.log(`✅ [AssessorAgent] Added latest user message to thread`);
      }
    } else {
      // For new threads, add all conversation messages
      console.log('📤 [AssessorAgent] Adding all messages to new thread...');
      let userMessageCount = 0;
      for (const message of messages) {
        if (message.role === 'user') {
          await openai.beta.threads.messages.create(thread.id, {
            role: 'user',
            content: message.content as string,
          });
          userMessageCount++;
        }
      }
      console.log(
        `✅ [AssessorAgent] Added ${userMessageCount} user messages to thread`,
      );
    }

    // Run the assistant
    console.log(`🤖 [AssessorAgent] Running assistant ${ASSISTANT_ID}...`);
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID,
      response_format: { type: 'json_object' },
    });
    console.log(`🏃 [AssessorAgent] Run started: ${run.id}`);

    // Wait for completion
    console.log('⏳ [AssessorAgent] Waiting for assistant response...');
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
        `🔄 [AssessorAgent] Poll ${pollCount}: Status ${runStatus.status}`,
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(run.id, {
        thread_id: thread.id,
      });
    }

    console.log(
      `✅ [AssessorAgent] Run completed with status: ${runStatus.status}`,
    );

    if (runStatus.status !== 'completed') {
      console.error(`❌ [AssessorAgent] Run failed:`, runStatus.last_error);
      throw new Error(`Assistant run failed with status: ${runStatus.status}`);
    }

    // Get the assistant's response
    console.log('📨 [AssessorAgent] Fetching assistant response...');
    const assistantMessages = await openai.beta.threads.messages.list(
      thread.id,
    );
    const lastMessage = assistantMessages.data[0];

    if (
      lastMessage.role !== 'assistant' ||
      lastMessage.content[0].type !== 'text'
    ) {
      console.error(
        '❌ [AssessorAgent] Invalid response format:',
        lastMessage,
      );
      throw new Error('Invalid assistant response format');
    }

    const responseText = lastMessage.content[0].text.value;
    console.log(
      `📄 [AssessorAgent] Raw response (${responseText.length} chars):`,
      responseText,
    );

    const assistantResponse: AssessorResponse = JSON.parse(responseText);
    console.log('🎯 [AssessorAgent] Parsed response:', {
      message_preview: `${assistantResponse.message.substring(0, 100)}...`,
      current_question_id: assistantResponse.current_question_id,
      assessment_complete: assistantResponse.assessment_complete,
      responses_count: Object.keys(assistantResponse.collected_responses).length,
    });

    // Preserve thread (don't delete) for continued conversation
    console.log(`💾 [AssessorAgent] Preserving shared thread: ${thread.id}`);

    // Return in format expected by orchestrator
    const result = {
      response: assistantResponse.message,
      assessmentData: assistantResponse.assessment_complete
        ? assistantResponse.collected_responses
        : undefined,
      currentQuestionId: assistantResponse.current_question_id,
      isComplete: assistantResponse.assessment_complete,
    };

    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`✅ [AssessorAgent] Request completed in ${duration}ms`);
    console.log(`📊 [AssessorAgent] Result:`, {
      isComplete: result.isComplete,
      hasAssessmentData: !!result.assessmentData,
      currentQuestionId: result.currentQuestionId,
      responseLength: result.response.length,
    });

    return Response.json(result);
  } catch (error) {
    console.error('Assessor agent error:', error);

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    return new ChatSDKError(
      'bad_request:api',
      'Assessor processing failed',
    ).toResponse();
  }
}