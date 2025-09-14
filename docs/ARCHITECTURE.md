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

#### 4. Client-Side AI Orchestrator with useChat Integration

The `AssessmentOrchestrator` runs entirely on the client-side with direct Redux integration, while leveraging AI SDK's `useChat` for proven UI patterns:

- **Client-Side Execution**: Orchestrator instantiated in React components with Redux dependencies
- **Direct State Updates**: Real-time Redux dispatch calls for immediate UI feedback
- **Cost Optimization**: Reduces Vercel server compute costs by moving AI processing to client
- **OpenAI Assistants Ready**: Architecture aligns with OpenAI Assistants API (client-side calls)
- **useChat Integration**: Custom hook wrapper provides all useChat benefits while maintaining client-side orchestrator

**Why We Use Custom Hook Wrapper**:
We initially considered replacing `useChat` entirely with manual state management, but realized we could get the best of both worlds by creating a custom `useOrchestratedChat` hook that:

- Wraps the proven `useChat` hook for UI management (status, streaming, error handling)
- Intercepts message processing to route through our client-side orchestrator
- Avoids server-side state synchronization complexity
- Maintains all existing component compatibility

```typescript
// Custom hook that combines useChat + client orchestrator
export function useOrchestratedChat({ id, initialMessages, userId }) {
  const dispatch = useAppDispatch();
  const orchestrator = new AssessmentOrchestrator(dispatch, () =>
    store.getState()
  );

  // Use regular useChat for UI management
  const chat = useChat({ id, messages: initialMessages });

  // Override sendMessage to process through orchestrator
  const sendMessage = async (message) => {
    const result = await orchestrator.processMessage(coreMessages, userId);
    chat.setMessages([...messages, userMessage, assistantResponse]);
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

### Async Database Operations

While the orchestrator runs client-side, database operations are handled through dedicated API endpoints:

```typescript
// Client-side orchestrator calls server APIs for data persistence
const saveAssessmentResults = async (results) => {
  await fetch("/api/assessment/save", {
    method: "POST",
    body: JSON.stringify(results),
  });
};
```
