'use client';

import { useEffect, useState } from 'react';
import { useSWRConfig } from 'swr';
import { ChatHeader } from '@/components/chat-header';
import { v4 as uuidv4 } from 'uuid';
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
import type { ChatMessage } from '@/lib/types';
import { AssessmentProgress } from './assessment-progress';
import { AssessmentOrchestrator } from '@/lib/ai/orchestrator';
import { useAppDispatch } from '@/lib/store/hooks';
import { store } from '@/lib/store';

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
  
  // Redux integration for orchestrator
  const dispatch = useAppDispatch();
  
  // Create orchestrator instance with Redux dependencies
  const orchestrator = new AssessmentOrchestrator(dispatch, () => store.getState());

  const [input, setInput] = useState<string>('');

  // Custom message handler using orchestrator (replaces regular chat)
  const handleOrchestratorMessage = async (message: ChatMessage) => {
    try {
      // Convert messages to CoreMessage format for orchestrator
      const coreMessages = [...messages, message].map(msg => ({
        role: msg.role,
        content: msg.parts.map(part => part.type === 'text' ? part.text : '').join(''),
      }));

      // Process through client-side orchestrator
      const result = await orchestrator.processMessage(coreMessages, session.user.id);

      // Create assistant response message
      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        parts: [{ type: 'text', text: result.response }],
        metadata: { createdAt: new Date().toISOString() },
      };

      // Update messages state directly (no server call needed)
      setMessages([...messages, message, assistantMessage]);
    } catch (error) {
      console.error('Orchestrator error:', error);
      toast({
        type: 'error',
        description: 'Assessment error occurred. Please try again.',
      });
    }
  };

  // Replace useChat with local state management for orchestrator-based chat
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [status, setStatus] = useState<'loading' | 'idle'>('idle');
  
  // Custom sendMessage function that uses orchestrator
  const sendMessage = async (message?: any) => {
    if (!message) return;
    
    // Ensure message has required fields
    const fullMessage: ChatMessage = {
      id: message.id || uuidv4(),
      role: message.role || 'user',
      parts: message.parts || [{ type: 'text', text: message.text || message.content || '' }],
      metadata: message.metadata || { createdAt: new Date().toISOString() },
    };
    
    setStatus('loading');
    await handleOrchestratorMessage(fullMessage);
    setStatus('idle');
    mutate(unstable_serialize(getChatHistoryPaginationKey));
  };

  // Stub functions for compatibility (not needed with orchestrator)
  const stop = () => setStatus('idle');
  const regenerate = async () => {
    if (messages.length > 0) {
      const lastUserMessage = messages.findLast(m => m.role === 'user');
      if (lastUserMessage) {
        const previousMessages = messages.slice(0, messages.findLastIndex(m => m.role === 'user'));
        setMessages(previousMessages);
        await sendMessage(lastUserMessage);
      }
    }
  };
  const resumeStream = () => {}; // Not needed for orchestrator

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
      <div className="flex h-dvh bg-background">
        {/* Main chat area */}
        <div className="flex flex-col min-w-0 flex-1">
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

        {/* Assessment progress sidebar */}
        <AssessmentProgress />
      </div>

    </>
  );
}
