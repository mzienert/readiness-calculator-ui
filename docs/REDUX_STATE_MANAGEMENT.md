# Redux State Management Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [State Schema](#state-schema)
4. [Store Configuration](#store-configuration)
5. [Slices & Reducers](#slices--reducers)
6. [Actions](#actions)
7. [Selectors](#selectors)
8. [Data Flow](#data-flow)
9. [Component Integration](#component-integration)
10. [Best Practices](#best-practices)

---

## Overview

This application uses **Redux Toolkit** for client-side state management, specifically to orchestrate a multi-agent AI assessment flow. The Redux store maintains the entire session state for an AI readiness assessment, tracking progress through four distinct agents: **Qualifier**, **Assessor**, **Analyzer**, and **Reporter**.

### Why Redux?

- **Centralized State**: Single source of truth for the entire assessment session
- **Predictable Updates**: Clear action-based state transitions between agents
- **DevTools Integration**: Time-travel debugging and state inspection
- **Component Decoupling**: Components read from selectors without prop drilling
- **Complex Orchestration**: Manages multi-phase assessment workflow with agent handoffs

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      React Components                        │
│  (Chat, AssessmentProgress, AssessmentReport, etc.)         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ useAppSelector (read)
                         │ useAppDispatch (write)
                         │
┌────────────────────────▼────────────────────────────────────┐
│                      Redux Store                             │
│  ┌────────────────────────────────────────────────────┐     │
│  │          Orchestrator Slice (Root State)           │     │
│  │  - currentSession: AgentState | null               │     │
│  │  - isProcessing: boolean                           │     │
│  │  - error: string | null                            │     │
│  │  - showProgress: boolean                           │     │
│  │  - sidebarOpen: boolean                            │     │
│  │  - recentSessions: string[]                        │     │
│  └────────────────────────────────────────────────────┘     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ dispatch(actions)
                         │
┌────────────────────────▼────────────────────────────────────┐
│               AssessmentOrchestrator                         │
│  - Coordinates agent API calls                               │
│  - Updates Redux state based on agent responses              │
│  - Manages phase transitions                                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTP calls
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   Agent API Endpoints                        │
│  /api/agents/qualifier                                       │
│  /api/agents/assessor                                        │
│  /api/agents/analyzer                                        │
│  /api/agents/reporter                                        │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Patterns

1. **Client-Side Orchestration**: The `AssessmentOrchestrator` class coordinates agent API calls and dispatches Redux actions
2. **Immutable State Updates**: Redux Toolkit's Immer-powered reducers handle immutable updates automatically
3. **Selector Pattern**: Memoized selectors compute derived state and transform data for components
4. **Typed Everything**: Full TypeScript support with `RootState` and `AppDispatch` types

---

## State Schema

### Root State Structure

```typescript
interface OrchestratorState {
  // Current session state
  currentSession: AgentState | null;
  
  // Processing state
  isProcessing: boolean;
  error: string | null;
  
  // UI state
  showProgress: boolean;
  sidebarOpen: boolean;
  
  // History
  recentSessions: string[];
}
```

### AgentState Schema (The Core)

The `AgentState` schema represents a complete assessment session and is defined using Zod for runtime validation:

```typescript
interface AgentState {
  // === Core Metadata ===
  sessionId: string;              // Unique session identifier (UUID)
  userId: string;                 // User performing assessment
  threadId?: string;              // OpenAI thread ID for conversation
  startedAt: string;              // ISO timestamp
  completedAt?: string;           // ISO timestamp (when complete)
  
  // === Current State ===
  currentAgent: 'qualifier' | 'assessor' | 'analyzer' | 'reporter';
  phase: 'qualifying' | 'assessing' | 'analyzing' | 'reporting' | 'complete';
  
  // === Qualifier Data (Phase 1) ===
  qualifier?: {
    collected_responses: Record<string, string>;  // Flexible key-value pairs
    needs_more_info?: boolean;
  };
  dynamicWeighting?: {
    solopreneurBonus: number;     // +1 bonus for solopreneurs
    budgetSensitive: boolean;     // true for revenue < 100k
    ruralFocus: boolean;          // true for rural/local businesses
    scoreAdjustment: number;      // overall score adjustment
  };
  
  // === Assessor Data (Phase 2) ===
  assessor?: {
    collected_responses: Record<string, string>;  // Raw Q&A responses
    currentQuestionId?: string;                   // Current question ID
    assessment_complete?: boolean;
  };
  responses: AssessmentResponse[];  // Structured scored responses
  currentCategory?: 'market_strategy' | 'business_understanding' | 
                    'workforce_acumen' | 'company_culture' | 
                    'role_of_technology' | 'data';
  
  // === Analyzer Data (Phase 3) ===
  analyzer?: {
    scoring: Record<string, any>;              // Category + overall scores
    strategy_recommendation: Record<string, any>;  // AI strategy tier
    roadmap: Record<string, any>;             // Phased implementation plan
    concerns_analysis: Record<string, any>;   // Risk/concern analysis
    analysis_complete?: boolean;
  };
  
  // Computed Analysis Results (Legacy - being migrated to analyzer)
  categoryScores?: Record<string, number>;
  overallScore?: number;
  recommendedStrategy?: 'efficiency' | 'productivity' | 'effectiveness' | 'growth' | 'expert';
  roadmap?: Array<{
    phase: string;
    timeline: string;
    description: string;
    actions: string[];
  }>;
  
  // === Token Usage Tracking ===
  tokenUsage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
```

### Assessment Response Structure

Individual assessment responses are structured with scoring:

```typescript
interface AssessmentResponse {
  questionId: string;     // e.g., "1a", "1b", "2a"
  category: string;       // One of 6 assessment categories
  score: number;          // 1-5 scale
  response: string;       // User's actual response
  reasoning?: string;     // AI's reasoning for the score
}
```

---

## Store Configuration

### Store Setup (`lib/store/index.ts`)

```typescript
import { configureStore } from '@reduxjs/toolkit';
import orchestratorReducer from './slices/orchestrator';

export const store = configureStore({
  reducer: {
    orchestrator: orchestratorReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

**Key Points:**
- Single slice currently: `orchestrator`
- Uses Redux Toolkit's `configureStore` with built-in middleware
- Exports TypeScript types for typed hooks

### Provider Integration (`components/redux-provider.tsx`)

```typescript
'use client';

import { Provider } from 'react-redux';
import { store } from '@/lib/store';

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}
```

**Usage:**
The `ReduxProvider` wraps the app layout to make the store available to all components.

### Typed Hooks (`lib/store/hooks.ts`)

```typescript
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './index';

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
```

**Benefits:**
- Full TypeScript autocomplete for state and actions
- Type-safe dispatch and selector usage
- Prevents runtime type errors

---

## Slices & Reducers

### Orchestrator Slice (`lib/store/slices/orchestrator.ts`)

This is the main (and currently only) slice that manages the entire assessment session.

#### Initial State

```typescript
const initialState: OrchestratorState = {
  currentSession: null,      // No active session on load
  isProcessing: false,       // Not processing
  error: null,               // No errors
  showProgress: true,        // Show progress sidebar by default
  sidebarOpen: false,        // Sidebar closed by default
  recentSessions: [],        // No history
};
```

#### Synchronous Reducers

**1. UI Actions**

```typescript
toggleSidebar: (state) => {
  state.sidebarOpen = !state.sidebarOpen;
}

setShowProgress: (state, action: PayloadAction<boolean>) => {
  state.showProgress = action.payload;
}
```

**2. Session Management**

```typescript
initializeSession: (
  state,
  action: PayloadAction<{ userId: string; threadId?: string }>
) => {
  state.currentSession = {
    currentAgent: 'qualifier',
    phase: 'qualifying',
    responses: [],
    tokenUsage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    sessionId: crypto.randomUUID(),
    userId: action.payload.userId,
    threadId: action.payload.threadId,
    startedAt: new Date().toISOString(),
  };
  state.error = null;
}
```

- Creates a new session with default values
- Starts at 'qualifier' agent in 'qualifying' phase
- Generates unique session ID
- Clears any previous errors

```typescript
updateSessionState: (state, action: PayloadAction<Partial<AgentState>>) => {
  if (state.currentSession) {
    Object.assign(state.currentSession, action.payload);
  }
}
```

- **Most frequently used action**
- Merges partial updates into current session
- Used by orchestrator to update state after each agent response
- Immer handles immutability automatically

```typescript
clearSession: (state) => {
  state.currentSession = null;
  state.error = null;
}

clearError: (state) => {
  state.error = null;
}
```

**3. Token Usage Tracking**

```typescript
addTokenUsage: (state, action: PayloadAction<TokenUsage>) => {
  if (state.currentSession) {
    state.currentSession.tokenUsage.prompt_tokens += action.payload.prompt_tokens;
    state.currentSession.tokenUsage.completion_tokens += action.payload.completion_tokens;
    state.currentSession.tokenUsage.total_tokens += action.payload.total_tokens;
  }
}
```

- Accumulates OpenAI token usage across all agent calls
- Used for cost tracking and monitoring

#### Asynchronous Thunks

Redux Toolkit provides `createAsyncThunk` for async operations:

```typescript
export const loadSessionFromDB = createAsyncThunk(
  'orchestrator/loadSessionFromDB',
  async (sessionId: string) => {
    // TODO: Implement database loading
    console.log('Loading session from DB:', sessionId);
    return null; // Return AgentState | null
  }
);

export const saveSessionToDB = createAsyncThunk(
  'orchestrator/saveSessionToDB',
  async (state: AgentState) => {
    // TODO: Implement database persistence
    console.log('Saving session to DB:', state.sessionId);
    return state;
  }
);

export const resetSessionInDB = createAsyncThunk(
  'orchestrator/resetSessionInDB',
  async (sessionId: string) => {
    // TODO: Implement database reset
    console.log('Resetting session in DB:', sessionId);
  }
);
```

**Status:** These are currently placeholders. Session persistence is planned for future implementation.

**Extra Reducers** handle the async lifecycle:

```typescript
extraReducers: (builder) => {
  builder
    .addCase(loadSessionFromDB.fulfilled, (state, action) => {
      if (action.payload) {
        state.currentSession = action.payload;
      }
    })
    .addCase(loadSessionFromDB.rejected, (state, action) => {
      state.error = action.error.message || 'Failed to load session';
    })
    // ... similar patterns for save and reset
}
```

---

## Actions

### Exported Actions

```typescript
export const {
  toggleSidebar,
  setShowProgress,
  initializeSession,
  updateSessionState,
  clearSession,
  clearError,
  addTokenUsage,
} = orchestratorSlice.actions;
```

### Usage Patterns

**In Components:**

```typescript
import { useAppDispatch } from '@/lib/store/hooks';
import { toggleSidebar } from '@/lib/store/slices/orchestrator';

function MyComponent() {
  const dispatch = useAppDispatch();
  
  const handleClick = () => {
    dispatch(toggleSidebar());
  };
  
  return <button onClick={handleClick}>Toggle</button>;
}
```

**In Orchestrator:**

```typescript
class AssessmentOrchestrator {
  private dispatch: AppDispatch;
  
  async initializeNewSession(userId: string): Promise<void> {
    const { threadId } = await threadsApi.create();
    
    this.dispatch(
      initializeSession({
        userId,
        threadId,
      })
    );
  }
  
  async processMessage(messages: CoreMessage[], userId: string) {
    // ... process with agent
    
    // Update state with agent response
    const updates: Partial<AgentState> = {
      qualifier: {
        collected_responses: { ...existingData, ...newData },
        needs_more_info: !result.isComplete,
      }
    };
    
    this.dispatch(updateSessionState(updates));
  }
}
```

---

## Selectors

Selectors are functions that extract and compute derived state from the Redux store. Located in `lib/store/selectors.ts`.

### Basic Selectors

These directly access state properties:

```typescript
// Session selectors
export const selectCurrentSession = (state: RootState) =>
  state.orchestrator.currentSession;

export const selectCurrentAgent = (state: RootState) =>
  state.orchestrator.currentSession?.currentAgent;

export const selectCurrentPhase = (state: RootState) =>
  state.orchestrator.currentSession?.phase;

export const selectSessionId = (state: RootState) =>
  state.orchestrator.currentSession?.sessionId;

// Processing selectors
export const selectIsProcessing = (state: RootState) =>
  state.orchestrator.isProcessing;

export const selectError = (state: RootState) => 
  state.orchestrator.error;

export const selectHasError = (state: RootState) =>
  Boolean(state.orchestrator.error);

// UI selectors
export const selectShowProgress = (state: RootState) =>
  state.orchestrator.showProgress;

export const selectSidebarOpen = (state: RootState) =>
  state.orchestrator.sidebarOpen;
```

### Agent Data Selectors

Extract data from specific agents:

```typescript
export const selectQualifierData = (state: RootState) =>
  state.orchestrator.currentSession?.qualifier;

export const selectAssessorData = (state: RootState) =>
  state.orchestrator.currentSession?.assessor;

export const selectAnalyzerData = (state: RootState) =>
  state.orchestrator.currentSession?.analyzer;

export const selectDynamicWeighting = (state: RootState) =>
  state.orchestrator.currentSession?.dynamicWeighting;

export const selectResponses = createSelector(
  [(state: RootState) => state.orchestrator.currentSession?.responses],
  (responses) => responses || []
);

export const selectResponsesCount = (state: RootState) =>
  state.orchestrator.currentSession?.responses?.length || 0;
```

### Computed Selectors

These perform transformations and computations:

**1. Assessment Score Selector**

```typescript
export const selectAssessmentScore = (state: RootState) => {
  const scoring = state.orchestrator.currentSession?.analyzer?.scoring;
  if (!scoring) return null;
  
  const categoryScores: Record<string, number> = {};
  let overallScore = 0;
  
  // Transform analyzer scoring data to format expected by components
  Object.entries(scoring).forEach(([key, data]: [string, any]) => {
    if (key !== 'overall_score' && key !== 'dynamic_weighting_applied' && data?.total) {
      categoryScores[key] = data.total;
    }
  });
  
  overallScore = scoring.overall_score || 0;
  
  return {
    overallScore,
    categoryScores,
  };
};
```

**2. Progress Selector**

```typescript
export const selectProgress = (state: RootState) => {
  if (!state.orchestrator.currentSession) return null;
  
  const session = state.orchestrator.currentSession;
  const phaseMap = {
    qualifying: { step: 1, name: 'Business Context' },
    assessing: { step: 2, name: 'Assessment Questions' },
    analyzing: { step: 3, name: 'Analysis & Scoring' },
    reporting: { step: 4, name: 'Report Generation' },
    complete: { step: 4, name: 'Complete' },
  };
  
  const totalSteps = 4;
  const currentPhase = phaseMap[session.phase];
  
  return {
    phase: session.phase,
    currentAgent: session.currentAgent,
    completedSteps: currentPhase.step - 1,
    totalSteps,
    progress: Math.round(((currentPhase.step - 1) / totalSteps) * 100),
    phaseName: currentPhase.name,
  };
};
```

**3. Responses by Category (Memoized)**

```typescript
export const selectResponsesByCategory = createSelector(
  [selectResponses],
  (responses) =>
    responses.reduce(
      (acc, response) => {
        if (!acc[response.category]) {
          acc[response.category] = [];
        }
        acc[response.category].push(response);
        return acc;
      },
      {} as Record<string, typeof responses>
    )
);
```

**4. Category Scores (Memoized)**

```typescript
export const selectCategoryScores = createSelector(
  [selectResponsesByCategory],
  (responsesByCategory) =>
    Object.entries(responsesByCategory).reduce(
      (acc, [category, responses]) => {
        const avgScore =
          responses.reduce((sum, r) => sum + r.score, 0) / responses.length;
        acc[category] = Math.round(avgScore * 10) / 10;
        return acc;
      },
      {} as Record<string, number>
    )
);
```

### Combined Selectors

Combine multiple pieces of state for complex UI needs:

```typescript
export const selectSessionSummary = (state: RootState) => {
  const session = state.orchestrator.currentSession;
  if (!session) return null;
  
  return {
    sessionId: session.sessionId,
    userId: session.userId,
    currentAgent: session.currentAgent,
    phase: session.phase,
    startedAt: session.startedAt,
    responsesCount: session.responses?.length || 0,
    isComplete: session.phase === 'complete',
    hasQualifier: Boolean(session.qualifier),
    hasScore: Boolean(session.analyzer?.scoring),
  };
};

export const selectUIState = (state: RootState) => ({
  isProcessing: state.orchestrator.isProcessing,
  error: state.orchestrator.error,
  showProgress: state.orchestrator.showProgress,
  sidebarOpen: state.orchestrator.sidebarOpen,
  hasActiveSession: Boolean(state.orchestrator.currentSession),
});
```

### Why Memoization?

`createSelector` from Redux Toolkit memoizes computed values:

- Only recalculates when input selectors return different values
- Prevents unnecessary re-renders in components
- Improves performance for expensive computations

---

## Data Flow

### Complete Data Flow Lifecycle

```
1. User sends message
   │
   ├─> useOrchestratedChat hook receives message
   │
   ├─> orchestrator.processMessage() called
   │
   ├─> dispatch(clearError())
   │
2. Orchestrator determines current agent
   │
   ├─> Case: No session exists
   │   └─> dispatch(initializeSession({ userId, threadId }))
   │
   ├─> Call appropriate agent API (qualifier/assessor/analyzer)
   │   │
   │   ├─> POST /api/agents/{agent-name}
   │   │   └─> Agent processes with OpenAI
   │   │       └─> Returns: { response, data, isComplete, tokenUsage }
   │   │
   │   └─> Receive agent response
   │
3. Update Redux state with agent data
   │
   ├─> Construct update object:
   │   const updates: Partial<AgentState> = {
   │     [agent]: { collected_responses: {...}, ... },
   │     currentAgent: nextAgent (if transitioning),
   │     phase: nextPhase (if transitioning),
   │   };
   │
   ├─> dispatch(updateSessionState(updates))
   │   │
   │   └─> Redux updates state.orchestrator.currentSession
   │
   ├─> dispatch(addTokenUsage(tokenUsage))
   │   └─> Accumulates token counts
   │
4. Components react to state changes
   │
   ├─> useAppSelector hooks re-evaluate
   │   │
   │   ├─> Selectors compute derived state
   │   │   └─> Only recalculate if dependencies changed (memoization)
   │   │
   │   └─> Components re-render with new data
   │
   ├─> AssessmentProgress shows updated agent data
   ├─> AssessmentReport appears when complete
   └─> Chat displays agent response
```

### Agent Transition Flow

When an agent completes its phase, the orchestrator handles the transition:

```typescript
// Example: Qualifier -> Assessor transition
if (result.isComplete) {
  // 1. Save analytics snapshot
  await analyticsApi.saveSnapshot({
    sessionId: currentSession.sessionId,
    agentType: 'qualifier',
    snapshotData: updates.qualifier || {},
  });
  
  // 2. Create new thread for next agent
  const { threadId: newThreadId } = await threadsApi.create();
  
  // 3. Update state for transition
  updates.currentAgent = 'assessor';
  updates.phase = 'assessing';
  updates.threadId = newThreadId;
  
  // 4. Dispatch to Redux
  this.dispatch(updateSessionState(updates));
}
```

### Progressive Data Accumulation

The orchestrator merges new data with existing data to build up state progressively:

```typescript
// Merge existing qualifier responses with new ones
const existingResponses = currentSession.qualifier?.collected_responses || {};
const newResponses = result.qualifier || {};

updates.qualifier = {
  collected_responses: { ...existingResponses, ...newResponses },
  needs_more_info: !result.isComplete,
};
```

This pattern ensures:
- No data loss between agent calls
- Progressive UI updates as data accumulates
- Ability to resume sessions (future feature)

---

## Component Integration

### Reading State in Components

Components use `useAppSelector` to read from Redux:

```typescript
import { useAppSelector } from '@/lib/store/hooks';
import { selectCurrentAgent, selectQualifierData } from '@/lib/store/selectors';

function MyComponent() {
  // Read current agent
  const currentAgent = useAppSelector(selectCurrentAgent);
  
  // Read qualifier data
  const qualifier = useAppSelector(selectQualifierData);
  
  // Use in render
  return (
    <div>
      <p>Current Agent: {currentAgent}</p>
      {qualifier && (
        <pre>{JSON.stringify(qualifier.collected_responses, null, 2)}</pre>
      )}
    </div>
  );
}
```

### Dispatching Actions in Components

Components use `useAppDispatch` to dispatch actions:

```typescript
import { useAppDispatch } from '@/lib/store/hooks';
import { toggleSidebar } from '@/lib/store/slices/orchestrator';

function SidebarToggle() {
  const dispatch = useAppDispatch();
  
  return (
    <button onClick={() => dispatch(toggleSidebar())}>
      Toggle Sidebar
    </button>
  );
}
```

### Real-World Example: AssessmentProgress Component

This component demonstrates comprehensive Redux integration:

```typescript
export function AssessmentProgress() {
  // Read multiple pieces of state
  const currentAgent = useAppSelector(selectCurrentAgent);
  const currentPhase = useAppSelector(selectCurrentPhase);
  const progressData = useAppSelector(selectProgress);
  const qualifier = useAppSelector(selectQualifierData);
  const assessor = useAppSelector(selectAssessorData);
  const responses = useAppSelector(selectResponses);
  const assessmentScore = useAppSelector(selectAssessmentScore);
  const strategy = useAppSelector(selectStrategyRecommendation);
  
  // Render different content based on current agent
  const getAgentContent = (agentId: string) => {
    switch (agentId) {
      case 'qualifier':
        // Show collected qualifier responses
        if (!qualifier?.collected_responses) return <p>Gathering info...</p>;
        return (
          <div>
            {Object.entries(qualifier.collected_responses).map(([key, value]) => (
              <div key={key}>
                <dt>{formatKey(key)}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </div>
        );
      
      case 'assessor':
        // Show assessment progress
        const responseCount = assessor?.collected_responses 
          ? Object.keys(assessor.collected_responses).length 
          : 0;
        return <p>Progress: {responseCount} of ~15 questions</p>;
      
      case 'analyzer':
        // Show scores
        if (!assessmentScore) return <p>Analyzing...</p>;
        return (
          <div>
            <Badge>Overall: {assessmentScore.overallScore}/100</Badge>
            {Object.entries(assessmentScore.categoryScores).map(([cat, score]) => (
              <div key={cat}>{cat}: {score}/10</div>
            ))}
          </div>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <div>
      <h2>AI Readiness Assessment</h2>
      {progressData && (
        <div>
          <p>Overall Progress: {progressData.progress}%</p>
          <ProgressBar value={progressData.progress} />
        </div>
      )}
      
      {AGENTS.map((agent) => {
        const isActive = currentAgent === agent.id;
        const content = getAgentContent(agent.id);
        
        return (
          <AgentSection
            key={agent.id}
            agent={agent}
            isActive={isActive}
            content={content}
          />
        );
      })}
    </div>
  );
}
```

**Key Patterns:**
- Multiple selectors for different data needs
- Conditional rendering based on state
- Derived computations from selector data
- No direct state manipulation (read-only)

### Real-World Example: AssessmentReport Component

Shows final analysis results when assessment is complete:

```typescript
export function AssessmentReport() {
  // Read analyzer data
  const analyzerData = useAppSelector(selectAnalyzerData);
  const scoring = useAppSelector(selectAnalyzerScoring);
  const roadmap = useAppSelector(selectAnalyzerRoadmap);
  const concerns = useAppSelector(selectAnalyzerConcerns);
  const strategy = useAppSelector(selectStrategyRecommendation);
  const isComplete = useAppSelector(selectAnalysisComplete);
  
  // Only render when complete
  if (!isComplete || !analyzerData) {
    return null;
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your AI Readiness Assessment</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Render scoring, strategy, roadmap, concerns */}
        <ScoreSection scores={scoring} />
        <StrategySection strategy={strategy} />
        <RoadmapSection roadmap={roadmap} />
        <ConcernsSection concerns={concerns} />
      </CardContent>
    </Card>
  );
}
```

---

## Best Practices

### 1. Use Selectors for All State Access

**✅ Good:**
```typescript
const currentAgent = useAppSelector(selectCurrentAgent);
```

**❌ Bad:**
```typescript
const currentAgent = useAppSelector(state => 
  state.orchestrator.currentSession?.currentAgent
);
```

**Why:** Selectors provide:
- Centralized data access logic
- Reusability across components
- Memoization for performance
- Easier refactoring

### 2. Keep Selectors Pure and Simple

**✅ Good:**
```typescript
export const selectQualifierData = (state: RootState) =>
  state.orchestrator.currentSession?.qualifier;
```

**❌ Bad:**
```typescript
export const selectQualifierData = (state: RootState) => {
  console.log('Selecting qualifier data'); // Side effect!
  fetch('/api/log'); // Side effect!
  return state.orchestrator.currentSession?.qualifier;
};
```

**Why:** Selectors should be pure functions with no side effects.

### 3. Use Memoization for Computed State

**✅ Good:**
```typescript
export const selectResponsesByCategory = createSelector(
  [selectResponses],
  (responses) => {
    // Expensive computation only runs when responses change
    return responses.reduce((acc, r) => {
      if (!acc[r.category]) acc[r.category] = [];
      acc[r.category].push(r);
      return acc;
    }, {});
  }
);
```

**❌ Bad:**
```typescript
export const selectResponsesByCategory = (state: RootState) => {
  const responses = state.orchestrator.currentSession?.responses || [];
  // Runs on every selector call, even if responses unchanged
  return responses.reduce((acc, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {});
};
```

### 4. Partial Updates for Performance

**✅ Good:**
```typescript
// Only update changed fields
const updates: Partial<AgentState> = {
  qualifier: {
    collected_responses: { ...existing, ...newData },
  }
};
dispatch(updateSessionState(updates));
```

**❌ Bad:**
```typescript
// Don't replace entire session
dispatch(updateSessionState({
  ...entireSession,  // Unnecessary copying
  qualifier: newData,
}));
```

### 5. Type Safety Everywhere

**✅ Good:**
```typescript
import { useAppSelector, useAppDispatch } from '@/lib/store/hooks';

function MyComponent() {
  const dispatch = useAppDispatch(); // Typed dispatch
  const agent = useAppSelector(selectCurrentAgent); // Typed selector
  
  // TypeScript knows agent is AgentState['currentAgent'] | undefined
  if (agent === 'qualifier') {
    // Type-safe!
  }
}
```

**❌ Bad:**
```typescript
import { useSelector, useDispatch } from 'react-redux';

function MyComponent() {
  const dispatch = useDispatch(); // No type info
  const agent = useSelector((state: any) => state.orchestrator.currentSession?.currentAgent);
  // No autocomplete, no type safety
}
```

### 6. Handle Null/Undefined Gracefully

**✅ Good:**
```typescript
const qualifier = useAppSelector(selectQualifierData);

if (!qualifier?.collected_responses) {
  return <p>Loading qualifier data...</p>;
}

return <div>{Object.keys(qualifier.collected_responses).length} responses</div>;
```

**❌ Bad:**
```typescript
const qualifier = useAppSelector(selectQualifierData);

// Will crash if qualifier or collected_responses is undefined
return <div>{Object.keys(qualifier.collected_responses).length} responses</div>;
```

### 7. Co-locate Related Selectors

Group related selectors together in `selectors.ts`:

```typescript
// Agent data selectors (grouped)
export const selectQualifierData = (state: RootState) => ...;
export const selectAssessorData = (state: RootState) => ...;
export const selectAnalyzerData = (state: RootState) => ...;

// Scoring selectors (grouped)
export const selectAnalyzerScoring = (state: RootState) => ...;
export const selectAssessmentScore = (state: RootState) => ...;
export const selectCategoryScores = createSelector(...);

// Progress selectors (grouped)
export const selectProgress = (state: RootState) => ...;
export const selectResponsesCount = (state: RootState) => ...;
```

### 8. Document Complex Selectors

```typescript
/**
 * Transforms raw analyzer scoring data into a component-friendly format.
 * 
 * @returns Object with:
 *   - overallScore: number (0-100)
 *   - categoryScores: Record<string, number> (0-10 per category)
 * 
 * Returns null if analysis not complete or no scoring data.
 */
export const selectAssessmentScore = (state: RootState) => {
  const scoring = state.orchestrator.currentSession?.analyzer?.scoring;
  if (!scoring) return null;
  
  // ... implementation
};
```

### 9. Keep Orchestrator and Redux Separate

**✅ Good Architecture:**
```
Components
  ↓ (read via selectors)
Redux Store
  ↑ (write via actions)
Orchestrator
  ↓ (calls)
Agent APIs
```

**❌ Bad:**
- Agent APIs directly dispatching Redux actions
- Components directly calling agent APIs
- Redux reducers making API calls

### 10. Use DevTools for Debugging

Redux DevTools is invaluable for debugging:

1. **Time-Travel Debugging**: Step through action history
2. **State Inspection**: View entire state tree at any point
3. **Action Replay**: Reproduce bugs by replaying actions
4. **Performance Monitoring**: Track which actions cause re-renders

Install: [Redux DevTools Extension](https://github.com/reduxjs/redux-devtools)

---

## Summary

This Redux state management system provides:

✅ **Centralized State**: Single source of truth for assessment sessions  
✅ **Type Safety**: Full TypeScript support throughout  
✅ **Predictable Updates**: Clear action-driven state changes  
✅ **Performance**: Memoized selectors prevent unnecessary re-renders  
✅ **Scalability**: Clean separation between orchestration and state  
✅ **Developer Experience**: DevTools integration and typed hooks  
✅ **Maintainability**: Well-organized selectors and actions  

The system manages a complex multi-agent assessment flow with clean separation of concerns, making it easy to add new agents, modify workflows, and maintain the codebase over time.

---

## Quick Reference

### Common Imports

```typescript
// Hooks
import { useAppSelector, useAppDispatch } from '@/lib/store/hooks';

// Actions
import { 
  initializeSession,
  updateSessionState,
  clearSession,
  addTokenUsage,
  toggleSidebar,
} from '@/lib/store/slices/orchestrator';

// Selectors
import {
  selectCurrentAgent,
  selectCurrentPhase,
  selectQualifierData,
  selectAssessorData,
  selectAnalyzerData,
  selectProgress,
  selectAssessmentScore,
} from '@/lib/store/selectors';
```

### Common Patterns

**Initialize Session:**
```typescript
dispatch(initializeSession({ userId: 'user-123', threadId: 'thread-456' }));
```

**Update Session:**
```typescript
dispatch(updateSessionState({
  qualifier: { collected_responses: { ...data } },
  phase: 'assessing',
}));
```

**Read State:**
```typescript
const currentAgent = useAppSelector(selectCurrentAgent);
const qualifier = useAppSelector(selectQualifierData);
```

**Conditional Rendering:**
```typescript
const isComplete = useAppSelector(selectAnalysisComplete);
if (!isComplete) return <Loading />;
return <Report />;
```

---

*Last Updated: October 22, 2025*

