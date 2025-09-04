# Implementation Steps & Action Items

## Purpose

This document tracks the specific implementation steps, action items, and development tasks for building the AI Readiness Calculator.

## Current Phase: Planning & Design

### Completed Tasks
- ✅ Research La Plata County SMB demographics and characteristics
- ✅ Document primary problem theme in Problem Analysis
- ✅ Document secondary theme about mixed demographic tech readiness
- ✅ Define primary assessment objectives and outcomes
- ✅ Document data insights capture opportunity
- ✅ Define talent showcase and platform objectives
- ✅ Update problem analysis with current solution status
- ✅ Review and integrate existing system prompt framework
- ✅ Design calculator solution - primary deliverable
- ✅ Design data gathering solution - secondary system

### In Progress
*Currently no active development tasks*

### Pending Tasks

**Technical Implementation:**
- ✅ Remove unauthenticated access to chat UI (require authentication before accessing any chat functionality)
- ✅ Implement controlled access rollout strategy (URL distribution to selected 5 SMBs initially)

**Multi-Agent Architecture Implementation:**
- ⏳ Define Zod/JSON schemas for agent responses and data validation
- ⏳ Design and implement QualifierAgent for SMB context collection
- ⏳ Build AssessmentAgent for 6-category question management (one-by-one flow)
- ⏳ Create AnalysisAgent for post-processing scoring and strategy determination
- ⏳ Develop ReportingAgent with Beautiful.ai MCP integration
- ⏳ Implement Agent Orchestrator for seamless handoffs and state management
- ⏳ Set up OpenAI Structured Outputs for consistent data capture across agents
- ⏳ Implement Function Calling for real-time data insertion and analysis
- ⏳ Design Stream Management system for smooth conversational UX

**Infrastructure & Architecture:**
- ⏳ Upgrade to Vercel AI SDK v5
- ⏳ Remove Groq and Grok inference providers
- ⏳ Update inference provider to OpenAI
- ⏳ **Refactor artifacts system architecture** - Separate concerns currently mixed in artifacts handlers:
  - ✅ Remove image generation functionality (not needed for readiness calculator)
  - ✅ Remove code generation functionality (not needed for readiness calculator)  
  - ✅ Remove sheet generation functionality (not needed for readiness calculator)
  - ✅ Remove document suggestions functionality (not needed for readiness calculator)
  - ⏳ **Extract AI generation services into pure functions** - Current text artifact handler in `artifacts/text/server.ts` mixes 4 concerns:
    - AI text generation using `streamText` from Vercel AI SDK
    - Real-time streaming via `dataStream.write` 
    - State accumulation (`draftContent += text`)
    - Database persistence via `saveDocument` call
    - **Goal**: Create reusable `generateText()`, `streamToClient()`, `persistDocument()` functions for readiness calculator use
  - ⏳ **Create dedicated streaming/real-time communication layer** - Extract streaming logic from artifact handlers
  - ⏳ **Separate document persistence from generation logic** - Move `saveDocument` calls out of generation handlers
  - **Current state**: Artifacts system streamlined to only text generation (`artifactKinds = ['text']`), ready for pure function extraction
- ⏳ Implement proper staging/production environment separation (environment-based configuration)
- ⏳ Set up cost tracking and metrics separation between environments
- ⏳ Implement usage tracking at service level for AI API costs per user/assessment
- ⏳ Ensure telemetry is working properly for production environment
- ⏳ Refactor current lib structure to follow best practices for application design
- ⏳ Implement clean service boundaries (authentication, assessment, data analytics, AI inference)
- ⏳ Create solid foundation for small-scale app without over-engineering

**Database & ORM:**
- ⏳ Implement proper usage of Drizzle ORM throughout application
- ⏳ Eliminate raw MySQL queries (avoid golden hammer scenario)
- ⏳ Set up proper staging and production database environments
- ⏳ Ensure proper database migration strategy between environments
- ⏳ Implement type-safe database operations using Drizzle schemas

**Assessment Design:**
- ⏳ Define assessment methodology and scoring system
- ⏳ Design user experience flow for diverse tech readiness levels (non-existent to advanced)
- ⏳ Specify reporting and recommendations output format
- ⏳ Create assessment framework for La Plata County SMB context

**Data & Analytics (Event-Driven System):**
- ⏳ **BRAINSTORMING SESSION REQUIRED**: Data capture strategy decisions
  - Response storage format (raw vs structured vs hybrid)
  - Response normalization approach for aggregation
  - Data processing timing (post-response vs post-survey)
  - Keyword extraction and text analysis level
  - Aggregation strategy for meaningful insights
- ⏳ Design event-driven data collection architecture with configurable hooks
- ⏳ Implement AssessmentEvent interface and data anonymization layer
- ⏳ Build privacy-first data capture system (no PII, no business identity)
- ⏳ Create event stream processing for real-time pattern detection
- ⏳ Implement batch analytics pipeline for trend analysis and reporting
- ⏳ Implement pre-anonymization removal window (session-based deletion before data anonymization)
- ⏳ Create internal business intelligence dashboard for insights

**Beautiful.ai Integration:**
- ⏳ Set up Beautiful.ai MCP server integration
- ⏳ Design report templates and formatting for assessment outputs
- ⏳ Implement error handling for Beautiful.ai API failures
- ⏳ Create fallback reporting mechanisms for when Beautiful.ai is unavailable

**Database Schema & Migration:**
- ⏳ Design anonymized data storage schema for event-driven collection
- ⏳ Create database tables for assessment events and analytics
- ⏳ Set up proper indexing for analytics queries and reporting
- ⏳ Implement database migration scripts for schema updates
- ⏳ Design data retention and anonymization processing tables

**Evaluation & Fine-Tuning (Post-Implementation):**
- ⏳ Design synthetic SMB assessment scenarios for comprehensive test coverage
- ⏳ Create evaluation framework for assessment accuracy (manual review initially)
- ⏳ Implement evaluation pipeline for scoring consistency and strategy recommendation alignment
- ⏳ Generate synthetic training data for La Plata County SMB profiles
- ⏳ Set up OpenAI fine-tuning pipeline for Assessment Agent (question asking, scoring consistency)
- ⏳ Set up OpenAI fine-tuning pipeline for Analysis Agent (strategy recommendations, roadmap generation)
- ⏳ Transition from manual evaluation to automated metrics as system matures
- ⏳ Integrate real anonymized assessment data for fine-tuning refinement

**Planning:**
- ⏳ Create development roadmap and milestone timeline

## Implementation Phases

### Phase 1: Foundation Setup
*[Tasks will be defined as planning progresses]*

### Phase 2: Calculator Development
*[Tasks will be defined as planning progresses]*

### Phase 3: Data Gathering Integration
*[Tasks will be defined as planning progresses]*

### Phase 4: Testing & Deployment
*[Tasks will be defined as planning progresses]*

## Technical Decisions Log

*[Key technical decisions and rationale will be tracked here]*

## Development Notes

### Artifacts System Refactoring Progress (2024-09-04)

**Completed Cleanup:**
- Removed unused artifact types: `image`, `code`, `sheet` generations
- Removed document suggestions functionality (`getSuggestions`, `getSuggestionsByDocumentId`)
- Streamlined to single `text` artifact type for AI chat responses
- Current files: `artifacts/text/server.ts`, `artifacts/text/client.tsx`, `lib/artifacts/server.ts`

**Current Architecture Issues:**
- `artifacts/text/server.ts` (`textDocumentHandler`) mixes concerns:
  - AI generation: `streamText()` with `myProvider.languageModel('artifact-model')`
  - Streaming: `dataStream.write({ type: 'data-textDelta', data: text })`
  - Persistence: `saveDocument()` calls in `lib/artifacts/server.ts` wrapper
- `lib/artifacts/server.ts` (`createDocumentHandler`) adds persistence layer around generation logic

**Next Steps:**
1. Extract pure AI generation functions from artifact handlers
2. Create dedicated streaming service layer  
3. Separate document persistence from generation logic
4. Make AI generation reusable for readiness calculator assessment flow

**Key Files for Next Context:**
- `artifacts/text/server.ts` - Current mixed-concern implementation
- `lib/artifacts/server.ts` - Handler wrapper with persistence
- `lib/ai/providers.ts` - AI model configuration  
- `lib/ai/prompts.ts` - System prompts (streamlined after cleanup)

---

*This document serves as the active implementation tracking for the AI Readiness Calculator project.*