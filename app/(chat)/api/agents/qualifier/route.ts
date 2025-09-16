import { NextRequest } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import type { CoreMessage } from 'ai';
import OpenAI from 'openai';

export const maxDuration = 60;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ASSISTANT_ID = 'asst_YpUQWu9pPY3PTNBH9ZVjV2mK';

interface QualifierRequest {
  messages: CoreMessage[];
  threadId?: string;
}

interface QualifierResponse {
  message: string;
  collected_responses: { [key: string]: string };
  needs_more_info: boolean;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('🔄 [QualifierAgent] Starting request processing');

  try {
    // Verify authentication
    const session = await auth();
    if (!session?.user) {
      return new ChatSDKError('unauthorized:api').toResponse();
    }

    console.log(`👤 [QualifierAgent] User: ${session.user.id}`);

    // Parse request body
    const { messages, threadId }: QualifierRequest = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return new ChatSDKError(
        'bad_request:api',
        'Messages array is required',
      ).toResponse();
    }

    console.log(`📥 [QualifierAgent] Received ${messages.length} messages`);
    console.log(
      `📝 [QualifierAgent] Last user message: "${messages[messages.length - 1]?.content}"`,
    );

    // Use provided thread or create new one
    let thread;
    if (threadId) {
      console.log(`🧵 [QualifierAgent] Using existing thread: ${threadId}`);
      thread = { id: threadId };
    } else {
      console.log('🧵 [QualifierAgent] Creating new thread...');
      thread = await openai.beta.threads.create();
      console.log(`✅ [QualifierAgent] Thread created: ${thread.id}`);
    }

    // Add messages to thread
    if (threadId) {
      // For existing threads, only add the latest user message
      console.log(
        '📤 [QualifierAgent] Adding latest message to existing thread...',
      );
      const latestUserMessage = messages.filter((m) => m.role === 'user').pop();
      if (latestUserMessage) {
        await openai.beta.threads.messages.create(thread.id, {
          role: 'user',
          content: latestUserMessage.content as string,
        });
        console.log(`✅ [QualifierAgent] Added latest user message to thread`);
      }
    } else {
      // For new threads, add all conversation messages
      console.log('📤 [QualifierAgent] Adding all messages to new thread...');
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
        `✅ [QualifierAgent] Added ${userMessageCount} user messages to thread`,
      );
    }

    // Run the assistant
    console.log(`🤖 [QualifierAgent] Running assistant ${ASSISTANT_ID}...`);
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID,
      response_format: { type: 'json_object' },
    });
    console.log(`🏃 [QualifierAgent] Run started: ${run.id}`);

    // Wait for completion
    console.log('⏳ [QualifierAgent] Waiting for assistant response...');
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
        `🔄 [QualifierAgent] Poll ${pollCount}: Status ${runStatus.status}`,
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(run.id, {
        thread_id: thread.id,
      });
    }

    console.log(
      `✅ [QualifierAgent] Run completed with status: ${runStatus.status}`,
    );

    if (runStatus.status !== 'completed') {
      console.error(`❌ [QualifierAgent] Run failed:`, runStatus.last_error);
      throw new Error(`Assistant run failed with status: ${runStatus.status}`);
    }

    // Get the assistant's response
    console.log('📨 [QualifierAgent] Fetching assistant response...');
    const assistantMessages = await openai.beta.threads.messages.list(
      thread.id,
    );
    const lastMessage = assistantMessages.data[0];

    if (
      lastMessage.role !== 'assistant' ||
      lastMessage.content[0].type !== 'text'
    ) {
      console.error(
        '❌ [QualifierAgent] Invalid response format:',
        lastMessage,
      );
      throw new Error('Invalid assistant response format');
    }

    const responseText = lastMessage.content[0].text.value;
    console.log(
      `📄 [QualifierAgent] Raw response (${responseText.length} chars):`,
      responseText,
    );

    const assistantResponse: QualifierResponse = JSON.parse(responseText);
    console.log('🎯 [QualifierAgent] Parsed response:', {
      message_preview: `${assistantResponse.message.substring(0, 100)}...`,
      collected_responses: assistantResponse.collected_responses,
      needs_more_info: assistantResponse.needs_more_info,
    });

    // Clean up thread only if we created it (not provided from orchestrator)
    if (!threadId) {
      console.log(`🗑️ [QualifierAgent] Cleaning up thread: ${thread.id}`);
      await openai.beta.threads.delete(thread.id);
    } else {
      console.log(`💾 [QualifierAgent] Preserving shared thread: ${thread.id}`);
    }

    // Return in format expected by orchestrator
    const result = {
      response: assistantResponse.message,
      qualifier: assistantResponse.needs_more_info
        ? undefined
        : assistantResponse.collected_responses,
      isComplete: !assistantResponse.needs_more_info,
    };

    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`✅ [QualifierAgent] Request completed in ${duration}ms`);
    console.log(`📊 [QualifierAgent] Result:`, {
      isComplete: result.isComplete,
      hasQualifier: !!result.qualifier,
      responseLength: result.response.length,
    });

    return Response.json(result);
  } catch (error) {
    console.error('Qualifier agent error:', error);

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    return new ChatSDKError(
      'bad_request:api',
      'Qualifier processing failed',
    ).toResponse();
  }
}
