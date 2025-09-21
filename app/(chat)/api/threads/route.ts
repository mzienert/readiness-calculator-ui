import type { NextRequest } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await auth();
    if (!session?.user) {
      return new ChatSDKError('unauthorized:api').toResponse();
    }

    console.log(`🧵 [ThreadAPI] Creating thread for user: ${session.user.id}`);

    // Create OpenAI thread
    const thread = await openai.beta.threads.create();

    console.log(`✅ [ThreadAPI] Thread created: ${thread.id}`);

    return Response.json({ threadId: thread.id });
  } catch (error) {
    console.error('Thread creation error:', error);

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    return new ChatSDKError(
      'bad_request:api',
      'Thread creation failed',
    ).toResponse();
  }
}
