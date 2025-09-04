import { useCopyToClipboard } from 'usehooks-ts';
import { CopyIcon } from './icons';
import { memo } from 'react';
import { toast } from 'sonner';
import type { ChatMessage } from '@/lib/types';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

export function PureMessageActions({
  chatId,
  message,
  isLoading,
}: {
  chatId: string;
  message: ChatMessage;
  isLoading: boolean;
}) {
  const [_, copyToClipboard] = useCopyToClipboard();

  if (isLoading) return null;
  if (message.role === 'user') return null;

  return (
    <div className="flex flex-row gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              const textFromParts = message.parts
                ?.filter((part) => part.type === 'text')
                .map((part) => part.text)
                .join('\n')
                .trim();

              if (!textFromParts) {
                toast.error("There's no text to copy!");
                return;
              }

              await copyToClipboard(textFromParts);
              toast.success('Copied to clipboard!');
            }}
          >
            <CopyIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Copy</TooltipContent>
      </Tooltip>
    </div>
  );
}

export const MessageActions = memo(
  PureMessageActions,
  (prevProps, nextProps) => {
    if (prevProps.isLoading !== nextProps.isLoading) return false;
    return true;
  },
);
