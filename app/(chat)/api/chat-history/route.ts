import { auth } from '@/app/(auth)/auth';
import {
  getChatById,
  saveChat,
  saveMessages,
  getChatsByUserId
} from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';
import type { ChatMessage } from '@/lib/types';
import type { VisibilityType } from '@/components/visibility-selector';
import { generateTitleFromUserMessage } from '../../actions';

// GET: Retrieve chat history (existing functionality from /api/history)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number.parseInt(searchParams.get('limit') || '10');
  const startingAfter = searchParams.get('starting_after');
  const endingBefore = searchParams.get('ending_before');

  if (startingAfter && endingBefore) {
    return new ChatSDKError(
      'bad_request:api',
      'Only one of starting_after or ending_before can be provided.',
    ).toResponse();
  }

  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const chats = await getChatsByUserId({
    id: session.user.id,
    limit,
    startingAfter,
    endingBefore,
  });

  return Response.json(chats);
}

// POST: Save chat and messages (pure data persistence)
export async function POST(request: Request) {
  try {
    const {
      chatId,
      messages,
      selectedVisibilityType = 'private',
    }: {
      chatId: string;
      messages: ChatMessage[];
      selectedVisibilityType?: VisibilityType;
    } = await request.json();

    const session = await auth();
    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    // Check if chat exists, create if needed
    let chat = await getChatById({ id: chatId });
    if (!chat) {
      // Find first user message for title generation
      const firstUserMessage = messages.find(m => m.role === 'user');
      const title = firstUserMessage
        ? await generateTitleFromUserMessage({ message: firstUserMessage })
        : 'New Chat';

      await saveChat({
        id: chatId,
        userId: session.user.id,
        title,
        visibility: selectedVisibilityType,
      });
    } else {
      // Verify ownership
      if (chat.userId !== session.user.id) {
        return new ChatSDKError('forbidden:chat').toResponse();
      }
    }

    // Save messages to database
    if (messages.length > 0) {
      await saveMessages({
        messages: messages.map((message) => ({
          id: message.id,
          chatId,
          role: message.role,
          parts: message.parts,
          attachments: [],
          createdAt: new Date(),
        })),
      });
    }

    return Response.json({ success: true });

  } catch (error) {
    console.error('Chat history save error:', error);
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError('bad_request:api', 'Failed to save chat history').toResponse();
  }
}