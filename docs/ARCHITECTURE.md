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
- **AI**: OpenAI API

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

#### 4. Clean Multi-Agent Architecture with Separated Concerns

The system uses a clean architecture pattern that separates orchestration, AI processing, and data persistence:

- **Client-Side Orchestrator**: Coordinates agent API calls and manages Redux state transitions
- **Dedicated Agent APIs**: Each agent has its own endpoint for specific AI processing logic
- **Pure Data Layer**: Dedicated endpoint for chat creation and message persistence
- **Real-Time UI Updates**: Redux integration provides immediate feedback during orchestration
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

### Shared Thread Strategy

The application implements a **shared thread architecture** for OpenAI Assistants that optimizes performance and maintains conversation context across multiple agent interactions:

#### Key Components

1. **Thread Creation (Server-Side)**:
   ```typescript
   // /api/threads endpoint
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
     // Create thread via API call
     const response = await fetch('/api/threads', { method: 'POST' });
     const { threadId } = await response.json();

     // Store in Redux state
     this.dispatch(initializeSession({ userId, threadId }));
   }
   ```

3. **Agent Thread Usage (Server-Side)**:
   ```typescript
   // /api/agents/qualifier
   const { messages, threadId } = await request.json();

   if (threadId) {
     // Use existing thread - only add latest message
     const latestMessage = messages.filter(m => m.role === 'user').pop();
     await openai.beta.threads.messages.create(threadId, {
       role: 'user',
       content: latestMessage.content
     });
   }
   ```

4. **Database Integration**:
   ```sql
   -- Chat schema includes threadId for persistence
   ALTER TABLE "Chat" ADD COLUMN "threadId" varchar(128);
   ```

#### Benefits

- **Performance**: ~6-7 second response times (improved from 8-9s)
- **Cost Optimization**: Eliminates conversation replay, significant token savings
- **Seamless Handoffs**: Agent transitions preserve full conversation context
- **State Persistence**: Thread stored in database and Redux for session recovery
- **Scalability**: Thread lifecycle managed centrally by orchestrator

### Usage Pattern

```typescript
// Using the custom orchestrated chat hook
export function Chat({ id, initialMessages, session }) {
  // Get all useChat functionality + orchestrator integration
  const { messages, sendMessage, status, stop, regenerate } =
    useOrchestratedChat({
      id,
      initialMessages,
      userId: session.user.id,
    });

  // Access real-time Redux state updates
  const currentPhase = useAppSelector(selectCurrentPhase);
  const progress = useAppSelector(selectProgress);

  return (
    <div>
      <Messages messages={messages} status={status} />
      <MultimodalInput sendMessage={sendMessage} status={status} />
      <AssessmentProgress /> {/* Real-time Redux updates */}
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
