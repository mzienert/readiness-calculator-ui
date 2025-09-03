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
- **Deployment**: Vercel
- **AI**: OpenAI API

## Authentication

### Architecture Overview

The application uses **NextAuth.js** with **JWT-based session management** for authentication. This provides a stateless, scalable authentication system without requiring server-side session storage.

### Key Components

#### 1. NextAuth.js Configuration (`app/(auth)/auth.ts`)
- **JWT Strategy**: Uses JSON Web Tokens stored in HTTP-only cookies
- **Dual Authentication Modes**:
  - **Regular Users**: Email/password authentication with bcrypt hashing
  - **Guest Users**: Automatic guest user creation for anonymous access
- **Session Extensions**: Custom session and JWT interfaces for user type tracking

#### 2. Authentication Providers
- **Credentials Provider**: Handles email/password login for registered users
- **Guest Provider**: Automatically creates temporary guest users in database

#### 3. Middleware Protection (`middleware.ts`)
- **JWT Verification**: Uses `getToken()` to verify JWT tokens on protected routes
- **Guest Redirection**: Automatically redirects unauthenticated users to guest authentication
- **Route Protection**: Protects API routes and authenticated pages
- **Security**: Secure cookies in production environments

#### 4. Session Management
- **Stateless Design**: No server-side session storage required
- **Cookie Security**: HTTP-only cookies with secure flag in production
- **User Types**: Supports both `'guest'` and `'regular'` user classifications
- **Token Claims**: JWT includes user ID and user type for authorization

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
- **Guest Limitations**: Guest users have restricted access to certain features
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