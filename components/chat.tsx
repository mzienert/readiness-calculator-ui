'use client';

import { DefaultChatTransport } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useEffect, useState } from 'react';
import { useSWRConfig } from 'swr';
import { ChatHeader } from '@/components/chat-header';
import { v4 as uuidv4 } from 'uuid';
import { fetchWithErrorHandlers } from '@/lib/utils';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import type { VisibilityType } from './visibility-selector';
import { unstable_serialize } from 'swr/infinite';
import { getChatHistoryPaginationKey } from './sidebar-history';
import { toast } from './toast';
import type { Session } from 'next-auth';
import { useSearchParams } from 'next/navigation';
import { useChatVisibility } from '@/hooks/use-chat-visibility';
import { useAutoResume } from '@/hooks/use-auto-resume';
import { ChatSDKError } from '@/lib/errors';
import type { ChatMessage } from '@/lib/types';
import { useDataStream } from './data-stream-provider';

export function Chat({
  id,
  initialMessages,
  initialVisibilityType,
  isReadonly,
  session,
  autoResume,
}: {
  id: string;
  initialMessages: ChatMessage[];
  initialVisibilityType: VisibilityType;
  isReadonly: boolean;
  session: Session;
  autoResume: boolean;
}) {
  const { visibilityType } = useChatVisibility({
    chatId: id,
    initialVisibilityType,
  });

  const { mutate } = useSWRConfig();
  const { setDataStream } = useDataStream();

  const [input, setInput] = useState<string>('');

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
    resumeStream,
  } = useChat<ChatMessage>({
    id,
    messages: initialMessages,
    experimental_throttle: 100,
    generateId: uuidv4,
    transport: new DefaultChatTransport({
      api: '/api/chat',
      fetch: fetchWithErrorHandlers,
      prepareSendMessagesRequest({ messages, id, body }) {
        return {
          body: {
            id,
            message: messages.at(-1),
            selectedVisibilityType: visibilityType,
            selectedChatModel: 'chat-model', // Default to primary chat model
            ...body,
          },
        };
      },
    }),
    onData: (dataPart) => {
      console.log('📱 UI onData received:', {
        type: dataPart.type,
        hasText: 'text' in dataPart,
        hasDelta: 'delta' in dataPart,
        hasId: 'id' in dataPart,
        keys: Object.keys(dataPart),
        preview: JSON.stringify(dataPart).substring(0, 100) + '...'
      });
      
      if (dataPart.type === 'text-delta' && 'delta' in dataPart) {
        console.log('📱 UI text-delta content:', `"${dataPart.delta}"`);
      }
      
      setDataStream((ds) => (ds ? [...ds, dataPart] : []));
    },
    onFinish: (message, options) => {
      console.log('📱 UI onFinish called with:', {
        messageId: message?.id,
        messageRole: message?.role,
        partsCount: message?.parts?.length,
        partsTypes: message?.parts?.map(p => p.type),
        options
      });
      
      // Log full message parts for debugging
      message?.parts?.forEach((part, idx) => {
        console.log(`📱 UI final part ${idx}:`, {
          type: part.type,
          hasText: 'text' in part,
          textLength: 'text' in part ? part.text?.length : 'no text property',
          textPreview: 'text' in part ? `"${part.text?.substring(0, 50)}..."` : 'no text',
          allKeys: Object.keys(part)
        });
        
        if (part.type === 'step-start') {
          console.log(`📱 UI full step-start part:`, part);
        }
      });
      
      mutate(unstable_serialize(getChatHistoryPaginationKey));
    },
    onError: (error) => {
      console.log('📱 UI onError called:', error);
      console.log('📱 UI error type:', error.constructor.name);
      console.log('📱 UI error message:', error.message);
      
      if (error instanceof ChatSDKError) {
        toast({
          type: 'error',
          description: error.message,
        });
      }
    },
  });

  const searchParams = useSearchParams();
  const query = searchParams.get('query');

  const [hasAppendedQuery, setHasAppendedQuery] = useState(false);

  useEffect(() => {
    if (query && !hasAppendedQuery) {
      sendMessage({
        role: 'user' as const,
        parts: [{ type: 'text', text: query }],
      });

      setHasAppendedQuery(true);
      window.history.replaceState({}, '', `/chat/${id}`);
    }
  }, [query, sendMessage, hasAppendedQuery, id]);



  useAutoResume({
    autoResume,
    initialMessages,
    resumeStream,
    setMessages,
  });

  return (
    <>
      <div className="flex flex-col min-w-0 h-dvh bg-background">
        <ChatHeader
          chatId={id}
          selectedVisibilityType={initialVisibilityType}
          isReadonly={isReadonly}
        />

        <Messages
          chatId={id}
          status={status}
          messages={messages}
          setMessages={setMessages}
          regenerate={regenerate}
          isReadonly={isReadonly}
        />

        <div className="sticky bottom-0 flex gap-2 px-4 pb-4 mx-auto w-full bg-background md:pb-6 md:max-w-3xl z-[1] border-t-0">
          {!isReadonly && (
            <MultimodalInput
              chatId={id}
              input={input}
              setInput={setInput}
              status={status}
              stop={stop}
              messages={messages}
              setMessages={setMessages}
              sendMessage={sendMessage}
              selectedVisibilityType={visibilityType}
            />
          )}
        </div>
      </div>

    </>
  );
}
