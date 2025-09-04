# AI Readiness Calculator

An AI-powered assessment platform designed for La Plata County small and medium-sized businesses (SMBs) to evaluate their organizational AI readiness using a multi-agent conversation system and specialized evaluation framework.

## Project Overview

### Purpose
Empower La Plata County SMBs with AI readiness assessment while capturing strategic market intelligence and showcasing local technical talent through a sophisticated multi-agent platform.

### Key Features
- **6-Category Assessment Framework**: Market Strategy, Business Understanding, Workforce Acumen, Company Culture, Role of Technology, Data
- **Multi-Agent Conversation System**: Qualifier → Assessor → Analyzer → Reporter agents for optimal user experience
- **Professional Report Generation**: Beautiful.ai integration for high-quality presentation outputs
- **Anonymous Data Collection**: Event-driven insights capture for regional market intelligence
- **SMB-Focused Design**: Dynamic weighting and empathetic conversation tailored for rural/small business context

### Target Market
La Plata County SMBs (population ~56,116) with diverse technology readiness levels from non-existent to emerging capabilities, supported by active Economic Development Alliance and SBDC resources.

## Documentation

- 📋 **[Technical Specification](./docs/TECHNICAL_SPECIFICATION.md)** - Complete technical overview including architecture, problems solved, outputs produced, and implementation roadmap
- 🔍 **[Problem Analysis](./docs/PROBLEM_ANALYSIS.md)** - Detailed problem breakdown, solution design, and multi-agent architecture with La Plata County context
- 🤖 **[System Prompt Framework](./docs/system%20prompts/Assessment_Agent_System_Prompt.md)** - AI behavior specification for SMB-focused readiness evaluation with 6-category scoring system
- 🚀 **[Implementation Steps](./docs/IMPLEMENTATION_STEPS.md)** - Comprehensive development task tracking including multi-agent implementation and evaluation/fine-tuning phases

## Technical Architecture

### Core Technologies
- **[Next.js 15](https://nextjs.org)** - React framework with App Router
- **[React 19](https://reactjs.org)** - UI library with TypeScript
- **[AI SDK v5](https://sdk.vercel.ai/docs)** - Multi-agent LLM integration
- **[OpenAI](https://openai.com)** - Primary inference provider for multi-agent system
- **[Tailwind CSS](https://tailwindcss.com)** + **[shadcn/ui](https://ui.shadcn.com)** - Styling and UI components
- **[NextAuth.js](https://authjs.dev)** - Authentication system

### Data & Infrastructure  
- **[Neon PostgreSQL](https://neon.tech)** - Primary database with staging/production separation
- **[Drizzle ORM](https://orm.drizzle.team)** - Type-safe database operations
- **[Redis](https://redis.io)** - Caching and session management
- **[Vercel](https://vercel.com)** - Hosting, deployment, and serverless functions

### AI & Integration
- **[Beautiful.ai](https://beautiful.ai)** - Professional report generation via MCP integration
- **OpenAI Fine-tuning** - Domain-specific model optimization
- **Structured Outputs** - Zod schema validation for consistent data capture
- **Event-driven Analytics** - Anonymous data collection for market intelligence

## Running Locally

**If you've already cloned this repo previously (when it used pnpm):**
```bash
# Clean up old pnpm files first
rm -rf node_modules pnpm-lock.yaml
```

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
```

Then edit `.env.local` and configure:

**AUTH_SECRET** (required for NextAuth.js):
```bash
# Generate a random 32-character secret
openssl rand -base64 32
# Or visit: https://generate-secret.vercel.app/32
```

**POSTGRES_URL** (required for database):
- Follow [Vercel Postgres setup guide](https://vercel.com/docs/storage/vercel-postgres/quickstart)
- Or use any PostgreSQL connection string format:
  ```
  postgresql://user:password@host:port/database
  ```

3. Run database migrations:
```bash
npm run db:migrate
```

4. Start the development server:
```bash
npm run dev
```

The app will be available at [localhost:3000](http://localhost:3000).

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production (includes database migrations)
- `npm run start` - Start production server
- `npm run lint` - Run linting and formatting (Biome)
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open database studio
- `npm run test` - Run end-to-end tests (Playwright)

## Development Status

### Current Implementation Phase
**Phase 1: Core Platform Development** - Multi-agent architecture, assessment framework, and foundational systems

### Key Milestones
- ✅ Technical specification and problem analysis completed
- ✅ Multi-agent architecture design finalized
- ✅ System prompt framework for SMB assessments defined
- 🔄 Multi-agent implementation (Qualifier → Assessor → Analyzer → Reporter)
- ⏳ Beautiful.ai MCP integration for professional reports
- ⏳ Event-driven data collection system
- ⏳ Evaluation and fine-tuning pipeline setup

### Controlled Rollout Strategy
- **Initial deployment**: 5 selected La Plata County SMBs
- **Access control**: Authentication required, URL-based distribution
- **Performance monitoring**: Cost tracking and usage metrics before scaling

## Technical Debt & Upgrade Notes

### Infrastructure Improvements Planned
- **AI SDK v5 Migration**: Upgrade from current version for multi-agent support
- **OpenAI Integration**: Replace Groq/Grok with OpenAI for better consistency  
- **Drizzle ORM**: Eliminate raw MySQL queries, implement proper type-safe operations
- **Environment Separation**: Proper staging/production setup with cost tracking

### Current Package Versions
- **Next.js**: `15.3.0-canary.31` (canary - monitoring stability)
- **React**: `19.0.0-rc-45804af1-20241021` (RC - awaiting stable release)
- **Tailwind CSS**: `^3.4.1` (stable - avoiding v4 migration issues)
- **NextAuth.js**: `5.0.0-beta.25` (v5 beta)