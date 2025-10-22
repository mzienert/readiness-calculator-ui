'use client';

import { useChat } from '@ai-sdk/react';
import { useCallback, useState } from 'react';
import { useSWRConfig } from 'swr';
import { v4 as uuidv4 } from 'uuid';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { updateSessionState } from '@/lib/store/slices/orchestrator';
import { selectCurrentSession } from '@/lib/store/selectors';
import { SessionStateManager } from '@/lib/agents/session-state-manager';
import type { ChatMessage } from '@/lib/types';
import { toast } from '@/components/toast';
import { unstable_serialize } from 'swr/infinite';
import { getChatHistoryPaginationKey } from '@/components/sidebar-history';
import { chatApi } from '@/lib/services/api';

interface UseOrchestratedChatProps {
  id: string;
  initialMessages: ChatMessage[];
  userId: string;
}

export function useOrchestratedChat({
  id,
  initialMessages,
  userId,
}: UseOrchestratedChatProps) {
  const dispatch = useAppDispatch();
  const { mutate } = useSWRConfig();
  const currentSession = useAppSelector(selectCurrentSession);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Use standard useChat hook
  const chat = useChat<ChatMessage>({
    id,
    messages: initialMessages,
    generateId: uuidv4,
  });

  // New sendMessage using SDK endpoint
  const sendMessage = useCallback(
    async (message: any) => {
      if (isProcessing) {
        toast({
          type: 'error',
          description: 'Please wait for the current response to complete.',
        });
        return;
      }

      setIsProcessing(true);

      try {
        // Extract text from message
        let messageText = '';
        if (message.content) {
          messageText = message.content;
        } else if (message.parts && message.parts.length > 0) {
          const textPart = message.parts.find((p: any) => p.type === 'text');
          messageText = textPart?.text || '';
        }

        if (!messageText) {
          toast({
            type: 'error',
            description: 'Please enter a message.',
          });
          setIsProcessing(false);
          return;
        }

        // Create user message
        const userMessage: ChatMessage = {
          id: message.id || uuidv4(),
          role: 'user',
          parts: message.parts || [
            { type: 'text', text: messageText },
          ],
          metadata: { createdAt: new Date().toISOString() },
        };

        // Add user message to UI immediately
        chat.setMessages([...chat.messages, userMessage]);

        // Call unified SDK endpoint
        const response = await fetch('/api/assessment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: messageText,
            sessionId: sessionId,
            chatId: id,
          }),
        });

        if (!response.ok) {
          throw new Error(`Assessment API failed: ${response.status}`);
        }

        const result = await response.json();

        // Update session ID
        setSessionId(result.sessionId);

        // Transform SDK response to Redux format using SessionStateManager
        const reduxUpdates = SessionStateManager.accumulate(
          currentSession,
          result,
          userId
        );

        // Dispatch transformed data to Redux
        dispatch(updateSessionState(reduxUpdates));

        // Create assistant message
        const assistantMessage: ChatMessage = {
          id: uuidv4(),
          role: 'assistant',
          parts: [{ type: 'text', text: result.message }],
          metadata: { createdAt: new Date().toISOString() },
        };

        // Save to database
        try {
          await chatApi.saveHistory({
            chatId: id,
            messages: [userMessage, assistantMessage],
            selectedVisibilityType: 'private',
            threadId: result.sessionId,
          });
        } catch (dbError) {
          console.error('Failed to save chat history:', dbError);
          // Don't throw - message still shows in UI
        }

        // Update UI with final messages
        chat.setMessages([...chat.messages, userMessage, assistantMessage]);

        // Trigger SWR revalidation
        mutate(unstable_serialize(getChatHistoryPaginationKey));
      } catch (error) {
        console.error('Chat error:', error);
        toast({
          type: 'error',
          description: 'I apologize, but I encountered an error. Please try again.',
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [chat, userId, isProcessing, id, mutate, sessionId, dispatch],
  );

  return {
    ...chat,
    sendMessage,
    status: isProcessing ? 'streaming' : 'ready',
    isProcessing,
  };
}
