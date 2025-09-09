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
  return new ChatSDKError('unauthorized').toResponse();
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

#### 4. Integration with AI Orchestrator
The `AssessmentOrchestrator` class now accepts Redux store dependencies:
- **Constructor Injection**: Receives `dispatch` and `getState` functions
- **State Coordination**: Dispatches actions instead of managing internal state
- **Pure Functions**: Business logic separated from state management

```typescript
export class AssessmentOrchestrator {
  constructor(
    private dispatch: AppDispatch, 
    private getState: () => RootState
  ) {}
  
  async processMessage(messages: CoreMessage[], userId: string) {
    // Dispatches to Redux instead of internal state management
    this.dispatch(updateSessionState(updates));
  }
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

### Usage Pattern

```typescript
// In components
const dispatch = useAppDispatch();
const currentSession = useAppSelector(selectCurrentSession);
const progress = useAppSelector(selectProgress);

// Initialize assessment
dispatch(initializeSession({ userId }));

// Update session state
dispatch(updateSessionState({ phase: 'assessing' }));

// Create orchestrator with Redux integration
const orchestrator = new AssessmentOrchestrator(dispatch, store.getState);
```