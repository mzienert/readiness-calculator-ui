'use client';

// Simple inline reasoning components
function Reasoning({
  children,
  isStreaming,
  defaultOpen,
  ...props
}: {
  children: React.ReactNode;
  isStreaming?: boolean;
  defaultOpen?: boolean;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className="reasoning-container border rounded-lg p-2 bg-muted"
    >
      {children}
    </div>
  );
}

function ReasoningTrigger() {
  return (
    <div className="text-sm font-medium mb-2 text-muted-foreground">
      Thinking...
    </div>
  );
}

function ReasoningContent({ children }: { children: React.ReactNode }) {
  return <div className="text-sm whitespace-pre-wrap">{children}</div>;
}

interface MessageReasoningProps {
  isLoading: boolean;
  reasoning: string;
}

export function MessageReasoning({
  isLoading,
  reasoning,
}: MessageReasoningProps) {
  return (
    <Reasoning
      isStreaming={isLoading}
      defaultOpen={true}
      data-testid="message-reasoning"
    >
      <ReasoningTrigger />
      <ReasoningContent>{reasoning}</ReasoningContent>
    </Reasoning>
  );
}
