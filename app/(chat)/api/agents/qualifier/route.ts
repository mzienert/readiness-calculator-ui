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
}

interface QualifierResponse {
  message: string;
  collected_info: {
    employee_count?: string;
    revenue_band?: string;
    business_type?: string;
    location?: string;
  };
  needs_more_info: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await auth();
    if (!session?.user) {
      return new ChatSDKError('unauthorized:api').toResponse();
    }

    // Parse request body
    const { messages }: QualifierRequest = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return new ChatSDKError('bad_request:api', 'Messages array is required').toResponse();
    }

    // Simple implementation: Create new thread for each request
    // TODO: Later we'll add thread persistence for conversation continuity
    const thread = await openai.beta.threads.create();

    // Add all conversation messages to the thread
    for (const message of messages) {
      if (message.role === 'user') {
        await openai.beta.threads.messages.create(thread.id, {
          role: 'user',
          content: message.content as string,
        });
      }
    }

    // Run the assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID,
      response_format: { type: 'json_object' },
    });

    // Wait for completion
    let runStatus = await openai.beta.threads.runs.retrieve(run.id, {
      thread_id: thread.id,
    });

    while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(run.id, {
        thread_id: thread.id,
      });
    }

    if (runStatus.status !== 'completed') {
      throw new Error(`Assistant run failed with status: ${runStatus.status}`);
    }

    // Get the assistant's response
    const assistantMessages = await openai.beta.threads.messages.list(thread.id);
    const lastMessage = assistantMessages.data[0];

    if (lastMessage.role !== 'assistant' || lastMessage.content[0].type !== 'text') {
      throw new Error('Invalid assistant response format');
    }

    const responseText = lastMessage.content[0].text.value;
    const assistantResponse: QualifierResponse = JSON.parse(responseText);

    // Clean up thread (simple approach - no persistence yet)
    await openai.beta.threads.delete(thread.id);

    // Return in format expected by orchestrator
    const result = {
      response: assistantResponse.message,
      qualifier: assistantResponse.needs_more_info ? undefined : assistantResponse.collected_info,
      isComplete: !assistantResponse.needs_more_info,
    };

    return Response.json(result);
  } catch (error) {
    console.error('Qualifier agent error:', error);
    
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    
    return new ChatSDKError('bad_request:api', 'Qualifier processing failed').toResponse();
  }
}