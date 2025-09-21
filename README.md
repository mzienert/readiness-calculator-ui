# AI Readiness Calculator

A specialized AI-powered assessment platform designed for La Plata County small and medium-sized businesses (SMBs) to evaluate their organizational AI readiness through an empathetic, multi-agent conversation system tailored for rural/small business contexts.

## What It Does

**For SMBs**: Provides a comprehensive AI readiness evaluation across 6 key business dimensions, delivering personalized strategy recommendations and professional reports to guide AI adoption decisions.

**For Regional Development**: Captures anonymous insights on technology adoption patterns to support economic development initiatives and partnership opportunities in Southwest Colorado.

## How It Works

1. **Conversational Assessment**: Multi-agent system guides users through questions one-at-a-time to prevent overwhelm
2. **Smart Analysis**: Dynamic weighting based on business size and type ensures relevant scoring
3. **Strategy Mapping**: 5-tier AI readiness framework (Efficiency → Productivity → Effectiveness → Growth → Expert)
4. **Professional Reporting**: Beautiful.ai integration generates presentation-quality reports
5. **Market Intelligence**: Anonymous data collection builds regional technology adoption insights

## Key Features

- **6-Category Assessment Framework**: Market Strategy, Business Understanding, Workforce Acumen, Company Culture, Role of Technology, Data
- **Multi-Agent Architecture**: Clean separation between orchestration, AI processing, and data persistence
- **SMB-Focused Design**: Rural/small business terminology and constraints consideration
- **Professional Reports**: Multiple format outputs with actionable roadmaps
- **Privacy-First**: Anonymous data collection with no PII or business identity storage

## Target Market

La Plata County, Colorado SMBs with diverse technology readiness levels (non-existent to emerging), supported by active Economic Development Alliance and Small Business Development Center resources.

## Documentation

- 📋 **[Technical Specification](./docs/TECHNICAL_SPECIFICATION.md)** - Complete technical overview including architecture, problems solved, outputs produced, and implementation roadmap
- 🔍 **[Problem Analysis](./docs/PROBLEM_ANALYSIS.md)** - Detailed problem breakdown, solution design, and multi-agent architecture with La Plata County context
- 🤖 **[System Prompt Framework](./docs/SYSTEM_PROMPT.md)** - AI behavior specification for SMB-focused readiness evaluation with 6-category scoring system
- 🚀 **[Implementation Steps](./docs/IMPLEMENTATION_STEPS.md)** - Comprehensive development task tracking including multi-agent implementation and evaluation/fine-tuning phases

## Technical Architecture

### Clean Architecture Pattern
- **Client-Side Orchestrator**: Coordinates agent API calls and manages Redux state
- **Agent API Endpoints**: Dedicated routes for each agent (`/api/agents/*`)
- **Data Persistence Layer**: Pure chat/message operations (`/api/chat-history`)
- **Real-Time UI**: Redux integration with immediate feedback during processing

### Core Technologies
- **[Next.js 15](https://nextjs.org)** - React framework with App Router
- **[React 19](https://reactjs.org)** - UI library with TypeScript
- **[Redux Toolkit](https://redux-toolkit.js.org/)** - State management for orchestrator
- **[AI SDK v5](https://sdk.vercel.ai/docs)** - Chat UI patterns with custom orchestration
- **[OpenAI](https://openai.com)** - Primary inference provider for agent endpoints
- **[Tailwind CSS](https://tailwindcss.com)** + **[shadcn/ui](https://ui.shadcn.com)** - Styling and UI components
- **[NextAuth.js](https://authjs.dev)** - Authentication system

### Data & Infrastructure
- **[Neon PostgreSQL](https://neon.tech)** - Primary database with automatic environment separation
  - **Production**: Main branch for production deployments (`VERCEL_ENV=production`)
  - **Staging**: Dedicated branch for development, preview builds, and ephemeral environments
  - **Environment Detection**: `VERCEL_ENV`-based routing with `getEnvOrThrow` pattern
- **[Drizzle ORM](https://orm.drizzle.team)** - Type-safe database operations with environment-aware connections
- **[Redis](https://redis.io)** - Resumable chat streams (optional), planned for caching and session management
- **[Vercel](https://vercel.com)** - Hosting, deployment, and serverless functions

### AI & Integration
- **[Beautiful.ai](https://beautiful.ai)** - Professional report generation via MCP integration
- **OpenAI Fine-tuning** - Domain-specific model optimization for individual agents
- **Structured Outputs** - Zod schema validation for consistent data capture across agents
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

**Database Configuration** (required):
The application uses environment-aware database routing with two connection strings:

- **POSTGRES_URL_PRODUCTION**: Production database (Neon main branch)
- **POSTGRES_URL_STAGING**: Staging database (Neon staging branch)

**Environment Routing**:
- **Production deployments** (`VERCEL_ENV=production`) → Production database
- **Preview deployments & local development** → Staging database
- **Ephemeral builds** → Staging database

**Setup**:
1. Create a [Neon](https://neon.tech) project with two branches: `main` and `staging`
2. Add both connection strings to your `.env.local` file
3. Configure Vercel environment variables for proper environment separation

**REDIS_URL** (optional for resumable chat streams):
- If configured, enables chat streams to resume after interruption
- App works fine without Redis - streams just won't be resumable
- Use any Redis connection string: `redis://user:password@host:port`

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
**Phase 2: Agent Development** - Individual agent implementation and refinement with clean architecture foundation

### Key Milestones
- ✅ **Foundation Complete**: Technical specification, problem analysis, system prompt framework
- ✅ **Architecture Implemented**: Clean separation of concerns with dedicated endpoints
- ✅ **Chat History Fixed**: Data persistence layer working correctly
- ✅ **Infrastructure Simplified**: Removed complex artifact system, streamlined for assessment focus
- ✅ **OpenAI Integration**: Replaced Groq/Grok with OpenAI for consistency
- 🔄 **Agent Refinement**: Enhancing individual agent logic and responses
- ⏳ **Beautiful.ai Integration**: Professional report generation implementation
- ⏳ **Evaluation Pipeline**: Assessment accuracy measurement and fine-tuning setup

### Architecture Benefits Achieved
- **Clean Separation**: Agent logic isolated from data operations
- **Scalable Development**: Each agent can be developed and tested independently
- **Cost Visibility**: Clear compute costs per agent vs data operations
- **Maintenance Friendly**: Changes to AI logic don't affect persistence layer

### Controlled Rollout Strategy
- **Authentication Required**: No unauthenticated access to chat functionality
- **Initial deployment**: 5 selected La Plata County SMBs
- **URL-based distribution**: Controlled access through direct links
- **Performance monitoring**: Cost tracking and usage metrics before broader rollout

## Current Architecture Status

### Completed Infrastructure
- ✅ **Client-side orchestrator** with Redux state management
- ✅ **Agent API endpoints** ready for individual agent development
- ✅ **Data persistence layer** (`/api/chat-history`) handling chat creation and message storage
- ✅ **Authentication system** with user ownership and rate limiting
- ✅ **Database operations** using Drizzle ORM with proper type safety

### Ready for Agent Development
- **QualifierAgent** (`/api/agents/qualifier`) - SMB context collection
- **AssessmentAgent** (`/api/agents/assessor`) - 6-category question management
- **AnalysisAgent** (`/api/agents/analyzer`) - Scoring and strategy determination
- **ReportingAgent** (`/api/agents/reporter`) - Beautiful.ai report generation