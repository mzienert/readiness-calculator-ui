'use client';

import type { UIMessage } from 'ai';
import React, {
  useRef,
  useEffect,
  useCallback,
  type Dispatch,
  type SetStateAction,
  memo,
} from 'react';
import { toast } from 'sonner';
import { useLocalStorage, useWindowSize } from 'usehooks-ts';

import { StopIcon } from './icons';
import { Button } from './ui/button';
// Simple inline suggested actions component
function SuggestedActions() {
  return null;
}
// Simple inline prompt input components
function PromptInput({
  children,
  className,
  onSubmit,
}: {
  children: React.ReactNode;
  className?: string;
  onSubmit?: (e: React.FormEvent) => void;
}) {
  return (
    <form className={className} onSubmit={onSubmit}>
      {children}
    </form>
  );
}

const PromptInputTextarea = React.forwardRef<
  HTMLTextAreaElement,
  {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    onKeyDown?: (e: React.KeyboardEvent) => void;
    autoFocus?: boolean;
    'data-testid'?: string;
    minHeight?: number;
    maxHeight?: number;
    style?: React.CSSProperties;
    disableAutoResize?: boolean;
    rows?: number;
  }
>((props, ref) => {
  const {
    value,
    onChange,
    placeholder,
    disabled,
    className,
    onKeyDown,
    autoFocus,
    minHeight,
    maxHeight,
    style,
    disableAutoResize,
    rows,
    ...rest
  } = props;
  const textareaStyle = {
    minHeight: minHeight ? `${minHeight}px` : undefined,
    maxHeight: maxHeight ? `${maxHeight}px` : undefined,
    ...style,
  };
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      onKeyDown={onKeyDown}
      autoFocus={autoFocus}
      rows={rows || 1}
      style={textareaStyle}
      {...rest}
    />
  );
});

PromptInputTextarea.displayName = 'PromptInputTextarea';

function PromptInputToolbar({
  children,
  className,
}: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

function PromptInputSubmit({
  children,
  disabled,
  status,
  className,
  size,
  ...rest
}: {
  children: React.ReactNode;
  disabled?: boolean;
  status?: string;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Button
      type="submit"
      disabled={disabled}
      className={className}
      size={size || 'sm'}
      {...rest}
    >
      {children}
    </Button>
  );
}
import type { UseChatHelpers } from '@ai-sdk/react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import { useScrollToBottom } from '@/hooks/use-scroll-to-bottom';
import type { ChatMessage } from '@/lib/types';

function PureMultimodalInput({
  chatId,
  input,
  setInput,
  status,
  stop,
  messages,
  setMessages,
  sendMessage,
}: {
  chatId: string;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  status: UseChatHelpers<ChatMessage>['status'];
  stop: () => void;
  messages: Array<UIMessage>;
  setMessages: UseChatHelpers<ChatMessage>['setMessages'];
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, []);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  };

  const resetHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = '98px';
    }
  };

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    'input',
    '',
  );

  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      // Prefer DOM value over localStorage to handle hydration
      const finalValue = domValue || localStorageInput || '';
      setInput(finalValue);
      adjustHeight();
    }
    // Only run once after hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLocalStorageInput(input);
  }, [input, setLocalStorageInput]);

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
  };

  const submitForm = useCallback(() => {
    window.history.replaceState({}, '', `/chat/${chatId}`);

    sendMessage({
      role: 'user',
      parts: [
        {
          type: 'text',
          text: input,
        },
      ],
    });

    setLocalStorageInput('');
    resetHeight();
    setInput('');

    if (width && width > 768) {
      textareaRef.current?.focus();
    }
  }, [input, setInput, sendMessage, setLocalStorageInput, width, chatId]);

  const { isAtBottom, scrollToBottom } = useScrollToBottom();

  useEffect(() => {
    if (status === 'submitted') {
      scrollToBottom();
    }
  }, [status, scrollToBottom]);

  return (
    <div className="flex relative flex-col gap-4 w-full">
      <AnimatePresence>
        {!isAtBottom && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="absolute bottom-28 left-1/2 z-50 -translate-x-1/2"
          >
            <Button
              data-testid="scroll-to-bottom-button"
              className="rounded-full"
              size="icon"
              variant="outline"
              onClick={(event) => {
                event.preventDefault();
                scrollToBottom();
              }}
            >
              <ArrowDown />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {messages.length === 0 && <SuggestedActions />}

      <PromptInput
        className=""
        onSubmit={(event) => {
          event.preventDefault();
          if (status !== 'ready') {
            toast.error('Please wait for the model to finish its response!');
          } else {
            submitForm();
          }
        }}
      >
        <PromptInputTextarea
          data-testid="multimodal-input"
          ref={textareaRef}
          placeholder="Send a message..."
          value={input}
          onChange={handleInput}
          minHeight={48}
          maxHeight={48}
          disableAutoResize={true}
          style={{ height: '48px', minHeight: '48px', maxHeight: '48px' }}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          rows={1}
          autoFocus
        />
        <PromptInputToolbar className="px-2 py-1">
          {status === 'submitted' ? (
            <StopButton stop={stop} setMessages={setMessages} />
          ) : (
            <PromptInputSubmit
              status={status}
              disabled={!input.trim()}
              className="rounded-md"
              size="sm"
            >
              Submit
            </PromptInputSubmit>
          )}
        </PromptInputToolbar>
      </PromptInput>
    </div>
  );
}

export const MultimodalInput = memo(
  PureMultimodalInput,
  (prevProps, nextProps) => {
    if (prevProps.input !== nextProps.input) return false;
    if (prevProps.status !== nextProps.status) return false;

    return true;
  },
);

function PureStopButton({
  stop,
  setMessages,
}: {
  stop: () => void;
  setMessages: UseChatHelpers<ChatMessage>['setMessages'];
}) {
  return (
    <Button
      data-testid="stop-button"
      className="rounded-full p-1.5 h-fit border dark:border-zinc-600"
      onClick={(event) => {
        event.preventDefault();
        stop();
        setMessages((messages) => messages);
      }}
    >
      <StopIcon size={14} />
    </Button>
  );
}

const StopButton = memo(PureStopButton);
