import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';

export const maxDuration = 30;

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:api').toResponse();
    }

    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const models = await response.json();

    return Response.json(models, { status: 200 });
  } catch (error) {
    console.error('Models API error:', error);
    return new ChatSDKError('offline:api').toResponse();
  }
}