# Architecture Documentation

This document outlines the technical architecture of the Readiness Calculator UI application.

## Overview

The Readiness Calculator UI is a Next.js 15 application built for AI-powered readiness assessments and planning. It features a modern stack with TypeScript, React, and Tailwind CSS.

## Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (Neon)
- **ORM**: Drizzle ORM
- **Authentication**: NextAuth.js
- **State Management**: Redux Toolkit with React-Redux
- **Deployment**: Vercel
- **AI**: OpenAI Agents SDK (JavaScript/TypeScript)
- **Structured Outputs**: Zod for schema validation

## Authentication

### Architecture Overview

The application uses **NextAuth.js** with **JWT-based session management** for authentication. This provides a stateless, scalable authentication system without requiring server-side session storage.

### Key Components

#### 1. NextAuth.js Configuration (`app/(auth)/auth.ts`)

- **JWT Strategy**: Uses JSON Web Tokens stored in HTTP-only cookies
- **Authentication Mode**: Email/password authentication with bcrypt hashing for registered users
- **Session Extensions**: Custom session and JWT interfaces with user ID tracking

#### 2. Authentication Providers

- **Credentials Provider**: Handles email/password login for registered users

#### 3. Middleware Protection (`middleware.ts`)

- **JWT Verification**: Uses `getToken()` to verify JWT tokens on protected routes
- **Login Redirection**: Automatically redirects unauthenticated users to login page
- **Route Protection**: Protects API routes and authenticated pages
- **Security**: Secure cookies in production environments

#### 4. Session Management

- **Stateless Design**: No server-side session storage required
- **Cookie Security**: HTTP-only cookies with secure flag in production
- **User Classification**: Supports `'regular'` authenticated users only
- **Token Claims**: JWT includes user ID for authorization

#### 5. API Route Protection

All API routes implement consistent session verification:

```typescript
const session = await auth();
if (!session?.user) {
  return new ChatSDKError("unauthorized").toResponse();
}
```

#### 6. User Authorization

- **Ownership Checks**: Resources are protected by user ID matching
- **Authentication Required**: All chat functionality requires user login
- **Rate Limiting**: Message count tracking per user for usage limits

### Security Features

- **Password Hashing**: bcrypt for secure password storage
- **JWT Signing**: Uses `AUTH_SECRET` environment variable
- **Timing Attack Prevention**: Dummy password comparison for non-existent users
- **HTTPS Enforcement**: Secure cookies in production
- **Route Protection**: Middleware-based access control

### Database Integration

- **User Storage**: User accounts stored in PostgreSQL via Drizzle ORM
- **Guest Management**: Temporary guest users created with unique identifiers
- **Resource Association**: All user-generated content linked to user IDs

### Environment Configuration

Required environment variables:

- `AUTH_SECRET`: JWT signing secret
- Database connection for user storage
- Secure cookie configuration based on environment

## State Management

### Redux Architecture

The application uses **Redux Toolkit** with **React-Redux** for global state management, providing predictable state updates and excellent developer experience.

#### Key Components

#### 1. Store Configuration (`lib/store/index.ts`)

- **Redux Toolkit**: Modern Redux with simplified boilerplate
- **Typed Hooks**: Custom `useAppDispatch` and `useAppSelector` with full TypeScript support
- **DevTools Integration**: Redux DevTools for state debugging

#### 2. Orchestrator Slice (`lib/store/slices/orchestrator.ts`)

- **Session Management**: Global assessment session state
- **Agent Coordination**: Current agent and phase tracking
- **UI State**: Progress indicators, sidebar state, error handling
- **Database Thunks**: Placeholder async actions for future database operations

#### 3. State Structure

```typescript
interface OrchestratorState {
  // Assessment session state
  currentSession: AgentState | null;

  // Processing state
  isProcessing: boolean;
  error: string | null;

  // UI state
  showProgress: boolean;
  sidebarOpen: boolean;

  // Session history
  recentSessions: string[];
}
```

#### 4. OpenAI Agents SDK Architecture (Current Implementation)

**Migration Date:** October 2025  
**Status:** ✅ Complete

The system now uses the **OpenAI Agents SDK** for declarative multi-agent orchestration, eliminating ~1,480 lines of manual orchestration code while providing superior functionality.

##### SDK Benefits

- **Automatic Handoffs**: Agents automatically hand off to each other based on completion criteria
- **Built-in Session Management**: SDK manages conversation history and context via `RunState`
- **Type-Safe Structured Outputs**: Zod schemas ensure type safety and validation
- **Simplified Code**: Single unified API endpoint replaces 3 individual agent routes
- **No Manual JSON Parsing**: SDK handles all structured output parsing
- **Better Error Handling**: SDK provides robust error recovery

##### Agent Definitions

Agents are defined declaratively in `lib/agents/index.ts`:

```typescript
import { Agent } from '@openai/agents';
import { z } from 'zod';

// Define structured output schema with Zod
const QualifierOutputSchema = z.object({
  message: z.string(),
  employee_count: z.string(),
  revenue_band: z.string(),
  // ... other fields
});

// Create agent with schema
export const qualifierAgent = new Agent({
  name: 'Qualifier',
  instructions: '...', // From agent_config.json
  model: 'gpt-4o-mini',
  outputType: QualifierOutputSchema,
  handoffs: [assessorAgent], // Automatic handoff target
});
```

##### Unified API Endpoint

All agents are accessed through a single endpoint (`/api/assessment`) that:
1. Authenticates the user
2. Manages SDK session state
3. Runs the appropriate agent
4. Handles automatic handoffs
5. Returns structured, validated data

```typescript
// Single endpoint replaces 3 old routes
export async function POST(request: NextRequest) {
  const session = await auth();
  const { message, sessionId } = await request.json();
  
  // Get or create SDK session
  const state = getSession(sessionId);
  const agent = state ? state._currentAgent : agents.qualifier;
  
  // Run agent (handoffs happen automatically)
  const result = await run(agent, input);
  
  // Save state and return
  setSession(sessionId, result.state);
  return Response.json({
    message: result.finalOutput.message,
    data: result.finalOutput,
    currentAgent: result.lastAgent.name,
  });
}
```

##### State Management

**Redux Role (Simplified):**
- Redux now only mirrors essential SDK session data for UI components
- No complex orchestration logic - just UI state and data display
- SDK `RunState` is the source of truth for conversation history

**Before SDK:** 389 lines of manual orchestration  
**After SDK:** 62 lines of simplified UI state mirroring

##### Configuration Management

Agent instructions stored in `lib/agents/agent_config.json` for easy editing:

```json
{
  "agents": {
    "qualifier": {
      "name": "Qualifier",
      "model": "gpt-4o-mini",
      "instructions": "...",
      "handoffDescription": "..."
    }
  }
}
```

Future enhancement: Store in database for non-technical user editing via admin UI.

---

#### 5. Legacy Architecture (Pre-SDK, Deprecated)

<details>
<summary>Click to view legacy manual orchestration architecture (deprecated October 2025)</summary>

The system previously used a manual orchestration pattern with separated concerns:

- **Client-Side Orchestrator** (`lib/ai/orchestrator.ts` - DELETED): Coordinated agent API calls and managed Redux state transitions
- **Dedicated Agent APIs** (`app/(chat)/api/agents/**/route.ts` - DELETED): Each agent had its own endpoint
- **Pure Data Layer**: Dedicated endpoint for chat creation and message persistence (still used)
- **Real-Time UI Updates**: Redux integration provided feedback during orchestration

This approach required ~1,480 lines of code for manual thread management, JSON parsing, handoff logic, and state coordination - all now handled automatically by the SDK.

</details>
- **Cost Optimization**: Client-side coordination with targeted API calls for AI processing

**Architecture Components**:

- **Agent API Endpoints**:
  - `/api/agents/qualifier` - SMB context collection and business qualification
  - `/api/agents/assessor` - 6-category question management and response collection
  - `/api/agents/analyzer` - Post-processing scoring and strategy determination
  - `/api/agents/reporter` - Beautiful.ai report generation and delivery

- **Data Persistence Layer**:
  - `/api/chat-history` - Pure data operations for chat creation and message storage
  - `/api/threads` - OpenAI thread creation and lifecycle management
  - Handles user authentication, chat ownership, and conversation threading
  - ThreadId storage for OpenAI conversation persistence across agent transitions
  - Completely separated from AI processing logic

**Custom Hook Integration**:
The `useOrchestratedChat` hook provides seamless integration while maintaining clean separation:

```typescript
// Custom hook that coordinates agents + data persistence
export function useOrchestratedChat({ id, initialMessages, userId }) {
  const dispatch = useAppDispatch();
  const orchestrator = new AssessmentOrchestrator(dispatch, () =>
    store.getState()
  );

  // Use regular useChat for UI management
  const chat = useChat({ id, messages: initialMessages });

  // Override sendMessage to orchestrate agent calls + persistence
  const sendMessage = async (message) => {
    // 1. Determine which agent to call
    const agentEndpoint = orchestrator.determineAgent(context);

    // 2. Call agent API for AI processing
    const agentResponse = await fetch(`/api/agents/${agentEndpoint}`, {
      method: 'POST',
      body: JSON.stringify({ messages: context, userId })
    });

    // 3. Save conversation via data API
    await fetch('/api/chat-history', {
      method: 'POST',
      body: JSON.stringify({
        chatId: id,
        messages: [userMessage, agentResult.message]
      })
    });

    // 4. Update UI with results
    chat.setMessages([...messages, userMessage, agentResult.message]);
  };

  return { ...chat, sendMessage };
}
```

#### 5. Provider Integration

Redux is integrated at the root level in `app/layout.tsx`:

```tsx
<ReduxProvider>
  <ThemeProvider>
    <SessionProvider>{children}</SessionProvider>
  </ThemeProvider>
</ReduxProvider>
```

### Benefits

- **Global State Access**: Any component can access assessment state
- **Predictable Updates**: All state changes go through Redux reducers
- **Time Travel Debugging**: Redux DevTools for state inspection
- **React Integration**: Components automatically re-render on state changes
- **Type Safety**: Full TypeScript integration with typed selectors and actions
- **Future Database Ready**: Async thunks prepared for database operations
- **Proven UI Patterns**: Leverages battle-tested useChat for message management, status handling, and error states
- **No Server Synchronization**: Avoids complex state syncing between client and server
- **Component Compatibility**: Works seamlessly with existing MultimodalInput, Messages, and other chat components

## Thread Management Architecture

### New Thread Per Agent Strategy *(Updated 2024-09-15)*

The application implements a **new thread per agent architecture** for OpenAI Assistants that provides clean separation, explicit context passing, and showcases multi-agent handoffs:

#### Key Components

1. **Thread Creation (Server-Side)**:
   ```typescript
   // /api/threads endpoint - Creates fresh threads for each agent
   export async function POST(request: NextRequest) {
     const session = await auth();
     const thread = await openai.beta.threads.create();
     return Response.json({ threadId: thread.id });
   }
   ```

2. **Orchestrator Thread Management (Client-Side)**:
   ```typescript
   // lib/ai/orchestrator.ts
   async initializeNewSession(userId: string): Promise<void> {
     // Create initial thread for qualifier
     const response = await fetch('/api/threads', { method: 'POST' });
     const { threadId } = await response.json();

     this.dispatch(initializeSession({ userId, threadId }));
   }

   // Create new thread during agent transitions
   async transitionToAssessor(qualifierData): Promise<void> {
     const threadResponse = await fetch('/api/threads', { method: 'POST' });
     const { threadId: newThreadId } = await threadResponse.json();

     this.dispatch(updateSessionState({
       currentAgent: 'assessor',
       phase: 'assessing',
       threadId: newThreadId,
       qualifier: qualifierData
     }));
   }
   ```

3. **Agent Thread Usage (Server-Side)**:
   ```typescript
   // /api/agents/assessor - Each agent gets new thread + context
   const { messages, threadId, qualifier } = await request.json();

   // Always receive threadId from orchestrator (required)
   if (!threadId) {
     return new ChatSDKError('bad_request:api', 'Thread ID required').toResponse();
   }

   const thread = { id: threadId };

   // Add explicit context from previous agent
   if (qualifier) {
     const qualifierContext = `BUSINESS CONTEXT from qualification:
${Object.entries(qualifier).map(([k,v]) => `- ${k}: ${v}`).join('\n')}

Start by greeting them and explaining you're the assessment specialist.`;

     await openai.beta.threads.messages.create(threadId, {
       role: 'user',
       content: qualifierContext
     });
   }

   // Add latest user message to fresh thread
   const latestMessage = messages.filter(m => m.role === 'user').pop();
   await openai.beta.threads.messages.create(threadId, {
     role: 'user',
     content: latestMessage.content
   });
   ```

4. **Redux State Integration with Progressive Updates**:
   ```typescript
   // Agent state with progressive data collection
   interface AgentState {
     threadId?: string;  // Current agent's thread ID

     // Qualifier state (progressive updates)
     qualifier?: {
       collected_responses?: { [key: string]: string };
       needs_more_info?: boolean;
     };

     // Assessor state (progressive updates)
     assessor?: {
       collected_responses?: { [key: string]: string };
       currentQuestionId?: string;
       assessment_complete?: boolean;
     };
   }
   ```

#### Benefits

- **Clean Separation**: Each agent starts fresh with only necessary context
- **Cost Optimization**: No accumulated conversation history, minimal token usage per agent
- **Error Recovery**: Agent failures don't corrupt other agents' contexts
- **Explicit Context**: Clear what data each agent receives and processes
- **Independent Testing**: Can test individual agents in isolation
- **Multi-Agent Showcase**: Clear demonstration of agent handoffs to users
- **Performance**: ~6-7 second response times per agent with optimized context
- **Scalability**: Each agent can be optimized independently

### Multi-Agent Flow Example

```typescript
// Example conversation flow with new thread per agent
export function AssessmentFlow() {
  const dispatch = useAppDispatch();
  const currentSession = useAppSelector(selectCurrentSession);

  // Phase 1: Qualifier (thread_abc123)
  // User: "We're a 5-person marketing agency"
  // → QualifierAgent collects business context
  // → Returns: { qualifier: {employee_count: "5", ...}, isComplete: true }

  // Phase 2: Agent Transition (orchestrator)
  // → Creates new thread (thread_def456) for assessor
  // → Updates Redux state with new threadId + qualifier context

  // Phase 3: Assessor (thread_def456 + qualifier context)
  // → AssessorAgent: "Hello! I understand you run a Marketing Agency..."
  // → Begins 6-category assessment with personalized language

  // Each agent gets:
  // 1. Fresh thread for clean separation
  // 2. Explicit context from previous agent
  // 3. Clear handoff messaging to user

  return (
    <div>
      <Messages messages={messages} status={status} />
      <MultimodalInput sendMessage={sendMessage} status={status} />
      <AgentProgressIndicator /> {/* Shows current agent & phase */}
    </div>
  );
}
```

### Clean Architecture Benefits

The separated concerns architecture provides several key advantages:

**Agent Development**:
```typescript
// Each agent is independently developed and tested
export async function POST(request: Request) {
  const { messages, userId } = await request.json();

  // Focused AI processing logic for this specific agent
  const result = await processQualifierAgent(messages, userId);

  return Response.json({ message: result.response });
}
```

**Data Operations**:
```typescript
// Pure data persistence with no AI processing concerns
export async function POST(request: Request) {
  const { chatId, messages } = await request.json();

  // Focus solely on data validation and persistence
  await saveChat({ id: chatId, userId: session.user.id });
  await saveMessages({ messages: mappedMessages });

  return Response.json({ success: true });
}
```

**Key Benefits**:
- **Scalability**: Each agent can be optimized independently
- **Testing**: Clear boundaries enable focused unit testing
- **Maintenance**: Changes to AI logic don't affect data operations
- **Performance**: Targeted API calls only when needed
- **Cost Control**: Clear visibility into compute vs storage costs

## Flexible Schema Architecture

### Non-Technical Configuration
The system implements flexible schemas that allow non-technical users to modify agent behavior without code changes:

```typescript
// OpenAI Assistant System Prompt defines data structure
{
  "message": "your conversational response here",
  "collected_responses": {
    "employee_count": "if mentioned",
    "revenue_band": "if mentioned",
    "business_type": "if mentioned",
    "location": "if mentioned"
  },
  "needs_more_info": true/false
}
```

### Application Layer Adaptation
The application layer uses flexible types that adapt to any schema:

```typescript
// TypeScript interfaces use flexible schemas
interface QualifierResponse {
  message: string;
  collected_responses: { [key: string]: string };  // Adapts to any keys
  needs_more_info: boolean;
}

// Redux state stores flexible data with progressive updates
interface AgentState {
  qualifier?: {
    collected_responses?: { [key: string]: string }; // Any qualifier keys
    needs_more_info?: boolean;
  };
  assessor?: {
    collected_responses?: { [key: string]: string }; // Any assessment keys
    currentQuestionId?: string;
    assessment_complete?: boolean;
  };
}
```

### Benefits
- **Non-Technical Control**: Business users can modify data collection without developers
- **Rapid Iteration**: Change assessment questions/data without code deployment
- **Schema Evolution**: Add new data fields by updating assistant instructions
- **Future-Proof**: Application adapts to any schema changes automatically

## Testing & Development Infrastructure

### Mock Agent System

To enable rapid UI development and deterministic testing without LLM dependencies, the system implements an environment-based mock agent system:

#### Architecture Overview

```typescript
// Environment-based mocking toggle
MOCK_AGENTS=true // in .env.local

// HTTP interceptor pattern (transparent to application code)
if (process.env.MOCK_AGENTS === 'true') {
  apiClient.interceptors.request.use(mockAgentInterceptor);
}
```

#### Mock Response Scenarios

**Qualifier Scenarios:**
- **Quick Complete**: Returns `isComplete: true` on first response
- **Multi-Step**: Requires 2-3 interactions to complete
- **Error Case**: Returns parsing errors or network failures

**Assessor Scenarios:**
- **Fast Assessment**: Completes after 3-4 questions
- **Full Assessment**: Goes through all 12 questions systematically
- **Partial Complete**: Gets stuck mid-assessment for testing recovery

**Analyzer Scenarios:**
- **Various Strategies**: Different scoring leading to different AI strategies (Efficiency → Expert)
- **Edge Cases**: Missing data, parsing issues, incomplete assessments

#### Implementation Benefits

- **Fast Iteration**: Test UI/state changes without waiting for LLM responses
- **Deterministic Testing**: Predictable responses for automated testing
- **State Transition Verification**: Test Redux state management without LLM variability
- **Error Handling**: Test edge cases and failure scenarios systematically
- **Performance Testing**: Validate orchestrator logic at speed

#### Integration Points

- **Zero Code Changes**: Interceptor pattern requires no changes to orchestrator or service layer
- **Realistic Flow**: Still goes through full HTTP request cycle with different responses
- **Easy Configuration**: Simple environment variable toggle
- **Scenario Selection**: Can implement UI for selecting different mock scenarios during development
