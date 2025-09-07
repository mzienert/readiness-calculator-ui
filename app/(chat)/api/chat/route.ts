import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  streamText,
} from 'ai';
import { AssessmentOrchestrator } from '@/lib/ai/orchestrator';
import { auth, type UserType } from '@/app/(auth)/auth';
import { type RequestHints, systemPrompt } from '@/lib/ai/prompts';
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
} from '@/lib/db/queries';
import { v4 as uuidv4 } from 'uuid';
import { convertToUIMessages } from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { myProvider } from '@/lib/ai/providers';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import { postRequestBodySchema, type PostRequestBody } from './schema';
import { geolocation } from '@vercel/functions';
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from 'resumable-stream';
import { after } from 'next/server';
import { ChatSDKError } from '@/lib/errors';
import type { ChatMessage } from '@/lib/types';
import type { ChatModel } from '@/lib/ai/models';
import type { VisibilityType } from '@/components/visibility-selector';

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes('REDIS_URL')) {
        console.log(
          ' > Resumable streams are disabled due to missing REDIS_URL',
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (error) {
    console.error('Chat API validation error:', error);
    return new ChatSDKError('bad_request:api').toResponse();
  }

  try {
    const {
      id,
      message,
      selectedChatModel,
      selectedVisibilityType,
    }: {
      id: string;
      message: ChatMessage;
      selectedChatModel: ChatModel['id'];
      selectedVisibilityType: VisibilityType;
    } = requestBody;

    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const userType: UserType = session.user.type;

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      return new ChatSDKError('rate_limit:chat').toResponse();
    }

    const chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message,
      });

      await saveChat({
        id,
        userId: session.user.id,
        title,
        visibility: selectedVisibilityType,
      });
    } else {
      if (chat.userId !== session.user.id) {
        return new ChatSDKError('forbidden:chat').toResponse();
      }
    }

    const messagesFromDb = await getMessagesByChatId({ id });
    const uiMessages = [...convertToUIMessages(messagesFromDb), message];

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    console.log('💾 Saving user message:', {
      id: message.id,
      role: 'user',
      partsCount: message.parts?.length,
      partsTypes: message.parts?.map(p => p.type),
    });

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: 'user',
          parts: message.parts,
          attachments: [],
          createdAt: new Date(),
        },
      ],
    });

    const streamId = uuidv4();
    await createStreamId({ streamId, chatId: id });

    // Initialize orchestrator for multi-agent assessment
    const orchestrator = new AssessmentOrchestrator();
    
    const stream = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        try {
          console.log('🚀 Starting stream execution');
          console.log('📝 Converting messages for orchestrator...');
          
          // Process message through multi-agent orchestrator
          const result = await orchestrator.processMessage(
            convertToModelMessages(uiMessages),
            session.user.id
          );

          console.log('🎭 Orchestrator result received:', {
            hasResponse: !!result.response,
            responseLength: result.response?.length,
            phase: result.state.phase,
            agent: result.state.currentAgent
          });

          // Log the full response for debugging
          console.log('📄 Full response text:', result.response);

          // The orchestrator already has the final text, send it directly as text chunks
          console.log('💬 Writing orchestrator response directly as text parts...');
          
          // Write proper UI message stream chunks
          console.log('📝 Writing text-start chunk...');
          dataStream.write({
            type: 'text-start',
            id: uuidv4(),
          });

          // Write the text content as chunks
          const words = result.response.split(' ');
          console.log('📝 Writing', words.length, 'text-delta chunks...');
          for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const isLast = i === words.length - 1;
            
            dataStream.write({
              type: 'text-delta',
              delta: word + (isLast ? '' : ' '),
              id: uuidv4(),
            });
          }

          console.log('📝 Writing text-end chunk...');
          dataStream.write({
            type: 'text-end',
            id: uuidv4(),
          });

          console.log('✅ Stream execution completed successfully');

        } catch (error) {
          console.error('💥 Orchestrator error:', error);
          console.error('📍 Error stack:', error.stack);
          
          // Fallback to simple streamText if orchestrator fails
          console.log('🔄 Using fallback streamText...');
          const fallbackResult = streamText({
            model: myProvider.languageModel(selectedChatModel),
            system: systemPrompt({ selectedChatModel, requestHints }),
            messages: convertToModelMessages(uiMessages),
            experimental_transform: smoothStream({ chunking: 'word' }),
          });

          dataStream.merge(fallbackResult.toUIMessageStream());
        }
      },
      generateId: uuidv4,
      onFinish: async ({ messages }) => {
        console.log('💾 onFinish called with messages:', messages.length);
        console.log('📊 Message details:', messages.map(m => ({
          id: m.id,
          role: m.role,
          partsCount: m.parts?.length,
          partsTypes: m.parts?.map(p => p.type),
        })));

        try {
          await saveMessages({
            messages: messages.map((message) => ({
              id: message.id,
              role: message.role,
              parts: message.parts,
              createdAt: new Date(),
              attachments: [],
              chatId: id,
            })),
          });
          console.log('✅ Messages saved successfully');
        } catch (error) {
          console.error('💥 Failed to save messages:', error);
          // Don't re-throw here to avoid breaking the stream response
        }
      },
      onError: () => {
        return 'Oops, an error occurred!';
      },
    });

    const streamContext = getStreamContext();

    if (streamContext) {
      return new Response(
        await streamContext.resumableStream(streamId, () =>
          stream.pipeThrough(new JsonToSseTransformStream()),
        ),
      );
    } else {
      return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
    }
  } catch (error) {
    console.error('Chat route error:', error);
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    // Return error response for non-ChatSDKError cases
    return new ChatSDKError('bad_request:api').toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const chat = await getChatById({ id });

  if (chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
