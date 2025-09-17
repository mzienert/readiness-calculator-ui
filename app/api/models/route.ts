import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { openaiService } from '@/lib/services/external-api';

export const maxDuration = 30;

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:api').toResponse();
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const models = await openaiService.getModels(process.env.OPENAI_API_KEY);
    const modelIds = models.data.map((model: any) => model.id);

    return Response.json(modelIds, { status: 200 });
  } catch (error) {
    console.error('Models API error:', error);
    return new ChatSDKError('offline:api').toResponse();
  }
}
