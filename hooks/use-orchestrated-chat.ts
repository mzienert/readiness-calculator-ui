'use client';

import { useChat } from '@ai-sdk/react';
import { useCallback, useState } from 'react';
import { useSWRConfig } from 'swr';
import { v4 as uuidv4 } from 'uuid';
import { useAppDispatch } from '@/lib/store/hooks';
import { setSessionData } from '@/lib/store/slices/orchestrator';
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
          console.error('❌ [Chat Hook] API returned error:', response.status, response.statusText);
          throw new Error('Assessment API failed');
        }

        const result = await response.json();
        
        console.log('✅ [Chat Hook] Received response from API');
        console.log('📥 [Chat Hook] Response details:', {
          currentAgent: result.currentAgent,
          sessionId: result.sessionId,
          isComplete: result.isComplete,
          messageLength: result.message?.length || 0,
          dataKeys: Object.keys(result.data || {}),
        });
        console.log('📄 [Chat Hook] Full response:', JSON.stringify(result, null, 2));

        // Update session ID
        setSessionId(result.sessionId);
        console.log('🆔 [Chat Hook] Session ID updated:', result.sessionId);

        // Update Redux with session data (for UI components)
        console.log('📦 [Chat Hook] Dispatching to Redux...');
        dispatch(
          setSessionData({
            currentAgent: result.currentAgent,
            currentPhase: result.currentAgent.toLowerCase(),
            data: result.data,
          }),
        );
        console.log('✅ [Chat Hook] Redux updated with:', {
          currentAgent: result.currentAgent,
          currentPhase: result.currentAgent.toLowerCase(),
          dataKeys: Object.keys(result.data || {}),
        });

        // Create assistant message
        const assistantMessage: ChatMessage = {
          id: uuidv4(),
          role: 'assistant',
          parts: [{ type: 'text', text: result.message }],
          metadata: { createdAt: new Date().toISOString() },
        };
        console.log('💬 [Chat Hook] Created assistant message:', {
          id: assistantMessage.id,
          messagePreview: result.message.substring(0, 100) + '...',
        });

        // Save to database
        console.log('💾 [Chat Hook] Saving to database...');
        try {
          await chatApi.saveHistory({
            chatId: id,
            messages: [userMessage, assistantMessage],
            selectedVisibilityType: 'private',
            threadId: result.sessionId,
          });
          console.log('✅ [Chat Hook] Messages saved to database');
        } catch (dbError) {
          console.error('❌ [Chat Hook] Database save failed:', dbError);
          // Don't throw - message still shows in UI
        }

        // Update UI with final messages
        console.log('🖼️  [Chat Hook] Updating UI with messages...');
        chat.setMessages([...chat.messages, userMessage, assistantMessage]);
        console.log('✅ [Chat Hook] UI updated with', chat.messages.length + 2, 'total messages');

        // Trigger SWR revalidation
        console.log('🔄 [Chat Hook] Triggering SWR revalidation...');
        mutate(unstable_serialize(getChatHistoryPaginationKey));
        console.log('✅ [Chat Hook] Complete! Ready for next message.');
      } catch (error) {
        console.error('❌ [Chat Hook] Chat error:', error);
        console.error('❌ [Chat Hook] Error details:', {
          type: typeof error,
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        toast({
          type: 'error',
          description: 'I apologize, but I encountered an error. Please try again.',
        });
      } finally {
        console.log('🏁 [Chat Hook] Request processing finished');
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
