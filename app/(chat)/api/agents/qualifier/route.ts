import { NextRequest } from 'next/server';
import { QualifierAgent } from '@/lib/ai/agents/qualifier';
import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import type { CoreMessage } from 'ai';

export const maxDuration = 60;

interface QualifierRequest {
  messages: CoreMessage[];
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

    // Process with qualifier agent (server-side AI calls)
    const qualifierAgent = new QualifierAgent();
    const result = await qualifierAgent.process(messages);

    return Response.json(result);
  } catch (error) {
    console.error('Qualifier agent error:', error);
    
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    
    return new ChatSDKError('bad_request:api', 'Qualifier processing failed').toResponse();
  }
}