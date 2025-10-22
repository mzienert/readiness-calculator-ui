import { NextRequest } from 'next/server';
import { run } from '@openai/agents';
import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import {
  agents,
  QualifierOutputType,
  AssessorOutputType,
  AnalyzerOutputType,
} from '@/lib/agents';
import { getSession, setSession } from '@/lib/agents/session-store';

export const maxDuration = 60;

interface AssessmentRequest {
  message: string;
  sessionId?: string;
  chatId: string;
}

interface AssessmentResponse {
  message: string;
  data: QualifierOutputType | AssessorOutputType | AnalyzerOutputType;
  currentAgent: string;
  sessionId: string;
  isComplete: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const session = await auth();
    if (!session?.user) {
      return new ChatSDKError('unauthorized:api').toResponse();
    }

    // Parse request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (parseError) {
      return new ChatSDKError('bad_request:api', 'Invalid JSON in request body').toResponse();
    }

    const { message, sessionId, chatId }: AssessmentRequest = requestBody;

    if (!message) {
      return new ChatSDKError('bad_request:api', 'Message is required').toResponse();
    }

    // Session management
    const newSessionId = sessionId || crypto.randomUUID();
    const existingState = sessionId ? getSession(sessionId) : undefined;

    // Agent selection
    const startAgent = existingState ? existingState._currentAgent : agents.qualifier;

    // Build input
    const input = existingState
      ? [...existingState.history, { role: 'user' as const, content: message }]
      : message;

    // Call SDK
    const result = await run(startAgent, input);

    // Save state
    setSession(newSessionId, result.state);

    // Extract output
    const outputData = result.finalOutput as QualifierOutputType | AssessorOutputType | AnalyzerOutputType;
    const currentAgentName = result.lastAgent?.name || 'Qualifier';

    // Check completion
    const isComplete =
      currentAgentName === 'Analyzer' &&
      (outputData as AnalyzerOutputType).analysis_complete;

    // Build response
    const response: AssessmentResponse = {
      message: outputData.message,
      data: outputData,
      currentAgent: currentAgentName,
      sessionId: newSessionId,
      isComplete,
    };

    return Response.json(response);
  } catch (error) {
    console.error('Assessment API error:', error);

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    return new ChatSDKError(
      'bad_request:api',
      `Assessment processing failed: ${errorMessage}`
    ).toResponse();
  }
}
