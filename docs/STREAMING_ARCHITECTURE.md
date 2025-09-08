# Streaming Architecture Documentation

## Overview

This document details the streaming architecture implemented for the AI Readiness Calculator's multi-agent chat system. The architecture enables real-time streaming of responses from our orchestrated AI agents to the frontend UI using the Vercel AI SDK v5.

## Architecture Flow

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐    ┌──────────────────┐
│   User Input    │───▶│   Orchestrator   │───▶│ Direct Streaming │───▶│   Frontend UI    │
└─────────────────┘    └──────────────────┘    └─────────────────┘    └──────────────────┘
        │                       │                        │                       │
        │                       ▼                        ▼                       ▼
   Text Message           Multi-Agent              UI Message Chunks        Rendered Text
                         Processing                      Stream
                    (QualifierAgent)
```

## Components

### 1. Orchestrator Layer

**Location**: `/lib/ai/orchestrator.ts`

**Purpose**: Manages multi-agent conversation flow and returns structured responses.

**Key Methods**:
- `processMessage()`: Routes messages through appropriate agents
- `initializeState()`: Sets up assessment session state
- `saveState()`: Persists agent state

**Output**: Plain text response from agent processing (603+ characters)

### 2. Direct Streaming Layer

**Location**: `/app/(chat)/api/chat/route.ts`

**Purpose**: Converts orchestrator text responses into AI SDK v5 compatible streaming chunks.

**Implementation**:
```typescript
const directStream = new ReadableStream({
  start(controller) {
    const textPartId = uuidv4(); // Consistent ID for text part
    
    // 1. Start text part
    controller.enqueue({ type: 'text-start', id: textPartId });
    
    // 2. Stream text content as deltas
    const words = result.response.split(' ');
    for (let i = 0; i < words.length; i++) {
      controller.enqueue({
        type: 'text-delta',
        delta: word + (isLast ? '' : ' '),
        id: textPartId,
      });
    }
    
    // 3. End text part
    controller.enqueue({ type: 'text-end', id: textPartId });
    
    controller.close();
  }
});

dataStream.merge(directStream);
```

### 3. UI Message Stream Layer

**Location**: Vercel AI SDK v5 (`createUIMessageStream`)

**Purpose**: Assembles streaming chunks into complete UI messages.

**Process**:
1. Receives `text-start`, `text-delta`, `text-end` chunks
2. Accumulates delta content into text parts
3. Creates final message with assembled text

**Output**: `UIMessage` with complete text parts

### 4. Frontend Layer

**Location**: `/components/chat.tsx`, `/components/messages.tsx`, `/components/message.tsx`

**Purpose**: Receives and renders streaming messages in real-time.

**Key Hooks**:
- `onData`: Processes individual streaming chunks
- `onFinish`: Handles completed messages
- `onError`: Manages streaming errors

## Chunk Types & Structure

Based on AI SDK v5 `UIMessageChunk` interface:

### Text Part Chunks

```typescript
// Begins a text part
{
  type: 'text-start',
  id: string,              // Consistent across entire text part
  providerMetadata?: ProviderMetadata
}

// Contains text content
{
  type: 'text-delta',
  delta: string,           // Word or text fragment
  id: string,              // Must match text-start ID
  providerMetadata?: ProviderMetadata
}

// Ends a text part
{
  type: 'text-end',
  id: string,              // Must match text-start ID
  providerMetadata?: ProviderMetadata
}
```

### Message Structure Chunks

```typescript
// Message-level chunks (not currently used)
{ type: 'start', messageId?: string, messageMetadata?: unknown }
{ type: 'finish', messageMetadata?: unknown }

// Step-level chunks (used by AI models, not our orchestrator)
{ type: 'start-step' }
{ type: 'finish-step' }
```

## Key Design Decisions

### 1. Why Direct Streaming Instead of `streamText()`?

**Problem**: Using `streamText()` caused the AI model to generate its own response instead of echoing our orchestrator's response.

**Evidence**:
```
// Orchestrator Output: "Hello! I'm your AI Readiness Consultant..."
// streamText() Output: "Unknown test prompt!" ❌
```

**Solution**: Direct streaming bypasses AI model inference and streams our orchestrator response directly.

### 2. Why Consistent IDs Across Text Parts?

**Problem**: Using different UUIDs for each chunk prevented proper text part assembly.

**Result**:
```
// Different IDs: textLength: 0, empty text part ❌
// Same ID: textLength: 603, complete text part ✅
```

**Solution**: Generate one UUID per text part and use it across all related chunks.

### 3. Why Text-Specific Chunks Instead of Message Chunks?

**Problem**: Using `start`/`finish` chunks didn't create text parts.

**Result**:
```
// Message chunks: partsCount: 0, partsTypes: [] ❌
// Text chunks: partsCount: 1, partsTypes: ['text'] ✅
```

**Solution**: Use `text-start`/`text-delta`/`text-end` sequence for proper text part creation.

## Data Flow Example

### Input
```
User Message: "Hello"
```

### Orchestrator Processing
```
🔄 Orchestrator.processMessage called
📥 Messages: 1
🆕 New assessment detected
✅ Returning initial greeting (603 characters)
```

### Direct Streaming
```
📝 Using text part ID: 541048c8-2b4c-48dd-b801-2104245bd746
📝 Emitting text-start chunk
📝 Streaming 87 word chunks
📝 Emitting text-end chunk
```

### Message Assembly
```
💾 onFinish called with messages: 1
📊 partsCount: 1, partsTypes: ['text']
📊 textLength: 603
📊 textPreview: "Hello! I'm your AI Readiness Consultant..."
```

### Result
```
✅ POST /api/chat 200
✅ Messages saved successfully
```

## Logging & Debugging

### Backend Logging

```typescript
// Orchestrator processing
console.log('🔄 Orchestrator.processMessage called');
console.log('🎭 Orchestrator result received:', { responseLength, phase, agent });

// Direct streaming
console.log('📝 Using text part ID:', textPartId);
console.log('📝 Streaming', words.length, 'word chunks');

// Message assembly
console.log('💾 onFinish called with messages:', messages.length);
console.log('📊 Message details:', { partsCount, partsTypes, textLength });
```

### Frontend Logging

```typescript
// Streaming chunks
onData: (dataPart) => {
  console.log('📱 UI onData received:', { type, hasText, hasDelta });
}

// Final message
onFinish: (message) => {
  console.log('📱 UI onFinish called:', { messageId, partsCount, partsTypes });
}

// Component processing
console.log('📱 PreviewMessage processing:', { messageId, role, partsCount });
```

## Performance Characteristics

### Streaming Performance
- **Chunk Size**: 1 word per chunk (87 chunks for 603 characters)
- **Latency**: ~3 seconds total processing time
- **Memory**: Minimal - chunks streamed immediately

### Database Performance
- **User Message Save**: Immediate (before streaming)
- **Assistant Message Save**: After streaming completion
- **State Persistence**: Per orchestrator state change

## Error Handling

### Common Issues

1. **Empty Text Parts** (`textLength: 0`)
   - **Cause**: Inconsistent IDs across text chunks
   - **Fix**: Use same UUID for text-start, text-delta, text-end

2. **Missing Text Property** (`Cannot read properties of undefined`)
   - **Cause**: Frontend expecting `.text` on non-text parts
   - **Fix**: Add proper part type handling in components

3. **AI Model Interference** (`streamText()` generating different content)
   - **Cause**: Using `streamText()` instead of direct streaming
   - **Fix**: Stream orchestrator response directly without AI model

### Error Recovery

```typescript
try {
  // Orchestrator processing
  const result = await orchestrator.processMessage(messages, userId);
  // Direct streaming implementation
} catch (error) {
  console.error('Orchestrator error:', error);
  // Fallback to simple streamText if needed
  const fallbackResult = streamText({
    model: myProvider.languageModel(selectedChatModel),
    system: systemPrompt({ selectedChatModel, requestHints }),
    messages: convertToModelMessages(uiMessages),
  });
  dataStream.merge(fallbackResult.toUIMessageStream());
}
```

## Future Enhancements

### Multi-Agent Streaming
Currently only QualifierAgent is implemented. Future agents (AssessmentAgent, AnalysisAgent, ReportingAgent) will follow the same streaming pattern.

### Chunk Optimization
Consider batching multiple words per chunk for better performance on slower connections.

### State Streaming
Potential to stream agent state changes as separate data chunks for real-time progress indicators.

### Error Chunk Types
Implement proper error chunk handling for agent-specific errors.

## Integration Points

### With Orchestrator
- Input: `CoreMessage[]` from AI SDK
- Output: Plain text response string
- State: Managed internally, persisted to database

### With AI SDK v5
- Input: Direct streaming chunks via `ReadableStream`
- Output: Assembled `UIMessage` objects
- Integration: `dataStream.merge(directStream)`

### With Frontend
- Input: Streaming chunks via `onData` callback
- Output: Rendered message components
- State: Managed by `useChat` hook

## Testing Strategy

### Backend Testing
```bash
# Test orchestrator response
curl -X POST /api/chat -d '{"message": {"role": "user", "parts": [{"type": "text", "text": "hello"}]}}'

# Check logs for:
# ✅ Orchestrator result received
# ✅ Direct stream completed  
# ✅ Messages saved successfully
```

### Frontend Testing
```javascript
// Check browser console for:
// ✅ UI onData received (87+ chunks)
// ✅ UI onFinish called (1 message)
// ✅ PreviewMessage processing (text part)
```

## Troubleshooting

### No Response from Orchestrator
- Check agent model configuration (`chat-model` vs `gpt-4o-mini`)
- Verify database connection for state persistence
- Ensure authentication is working

### Empty Text Parts
- Verify consistent IDs across text chunks
- Check chunk sequence: text-start → text-delta → text-end
- Ensure `delta` property contains actual text content

### Frontend Rendering Issues
- Check part type handling in message components
- Verify `.text` property access is protected
- Ensure proper error boundaries for malformed parts

---

*This architecture successfully streams AI agent responses in real-time while maintaining compatibility with the AI SDK v5 streaming protocols.*