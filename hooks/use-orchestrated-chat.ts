'use client';

import { useChat, type UseChatHelpers } from '@ai-sdk/react';
import { useCallback, useEffect, useState } from 'react';
import { useSWRConfig } from 'swr';
import { v4 as uuidv4 } from 'uuid';
import { AssessmentOrchestrator } from '@/lib/ai/orchestrator';
import { useAppDispatch } from '@/lib/store/hooks';
import { store } from '@/lib/store';
import type { ChatMessage } from '@/lib/types';
import type { CoreMessage } from 'ai';
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
  // Redux integration for client-side orchestrator
  const dispatch = useAppDispatch();
  const { mutate } = useSWRConfig();
  const [orchestrator] = useState(
    () => new AssessmentOrchestrator(dispatch, () => store.getState()),
  );

  // Track processing state
  const [isProcessing, setIsProcessing] = useState(false);

  // Use the regular useChat hook but intercept its behavior
  const chat = useChat<ChatMessage>({
    id,
    messages: initialMessages,
    generateId: uuidv4,

    // We'll override the transport behavior
    api: '/api/dummy', // This won't actually be called

    // Custom send function that processes through orchestrator
    sendExtraMessageFields: true,
  });

  // Override the sendMessage function to use orchestrator + new chat-history endpoint
  const sendMessage = useCallback(
    async (message: any) => {
      console.log('🎯🎯🎯 [useOrchestratedChat] SENDMESSAGE CALLED!!!');
      console.log('🎯🎯🎯 [useOrchestratedChat] message:', message);
      console.log('🎯🎯🎯 [useOrchestratedChat] isProcessing:', isProcessing);

      if (isProcessing) {
        toast({
          type: 'error',
          description: 'Please wait for the current response to complete.',
        });
        return;
      }

      setIsProcessing(true);

      try {
        // Create user message
        const userMessage: ChatMessage = {
          id: message.id || uuidv4(),
          role: 'user',
          parts: message.parts || [
            { type: 'text', text: message.content || '' },
          ],
          metadata: { createdAt: new Date().toISOString() },
        };

        // Add user message to chat immediately for UI responsiveness
        chat.setMessages([...chat.messages, userMessage]);

        // Get conversation context for orchestrator
        const coreMessages: CoreMessage[] = [...chat.messages, userMessage].map(
          (msg) => ({
            role: msg.role,
            content: msg.parts
              .map((part) => (part.type === 'text' ? part.text : ''))
              .join(''),
          }),
        );

        // Process through CLIENT-SIDE orchestrator (calls agent endpoints)
        console.log('🎯 [useOrchestratedChat] About to call orchestrator.processMessage');
        console.log('🎯 [useOrchestratedChat] coreMessages:', coreMessages.length);
        console.log('🎯 [useOrchestratedChat] userId:', userId);

        const result = await orchestrator.processMessage(coreMessages, userId);

        console.log('🎯 [useOrchestratedChat] orchestrator.processMessage returned:', result);

        // Create orchestrator response message
        const assistantMessage: ChatMessage = {
          id: uuidv4(),
          role: 'assistant',
          parts: [{ type: 'text', text: result.response }],
          metadata: { createdAt: new Date().toISOString() },
        };

        // Save both messages to database via API service
        await chatApi.saveHistory({
          chatId: id,
          messages: [userMessage, assistantMessage],
          selectedVisibilityType: 'private',
          threadId: result.threadId,
        });

        // Update chat with final messages
        chat.setMessages([...chat.messages, userMessage, assistantMessage]);

        // Trigger SWR revalidation for chat history
        mutate(unstable_serialize(getChatHistoryPaginationKey));
      } catch (error) {
        console.error('Orchestrated chat error:', error);
        toast({
          type: 'error',
          description:
            'I apologize, but I encountered an error. Please try again.',
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [chat, orchestrator, userId, isProcessing, id, mutate],
  );

  // Create a custom status that reflects our processing state
  const status: UseChatHelpers<ChatMessage>['status'] = isProcessing
    ? 'streaming'
    : 'ready';

  return {
    ...chat,
    sendMessage,
    status,
    isProcessing,
  };
}
