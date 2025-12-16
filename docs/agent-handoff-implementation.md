# Agent Handoff Implementation Plan

## Overview
Implement seamless agent transitions using Option 1: Auto-trigger with synthetic message. When an agent completes (qualifier → assessor, assessor → analyzer), automatically invoke the next agent without requiring user input.

## Implementation Steps

### 1. Add Recursion Safety Guard

**File:** `lib/ai/orchestrator.ts`

Add a private field to track recursion depth and prevent infinite loops:

```typescript
export class AssessmentOrchestrator {
  private dispatch: AppDispatch;
  private getState: () => RootState;
  private readonly MAX_TRANSITION_DEPTH = 5; // Safety limit

  constructor(dispatch: AppDispatch, getState: () => RootState) {
    this.dispatch = dispatch;
    this.getState = getState;
  }
```

**Rationale:** Prevent infinite recursion if something goes wrong during transitions.

---

### 2. Add Transition Depth Parameter

**File:** `lib/ai/orchestrator.ts`

Modify `processMessage()` signature to track transition depth:

```typescript
async processMessage(
  messages: CoreMessage[],
  userId: string,
  transitionDepth: number = 0, // Track recursion depth
): Promise<{
  response: string;
  threadId?: string;
}> {
  try {
    // Guard against infinite recursion
    if (transitionDepth > this.MAX_TRANSITION_DEPTH) {
      throw new Error(
        `Maximum transition depth exceeded (${this.MAX_TRANSITION_DEPTH}). Possible infinite loop.`
      );
    }

    console.log(`🔄 [Orchestrator] Processing message - Depth: ${transitionDepth}`);
    // ... rest of method
  }
}
```

**Rationale:** Track how deep we are in recursive calls, prevent runaway recursion.

---

### 3. Create Agent Transition Handler

**File:** `lib/ai/orchestrator.ts`

Add a new private method to handle transitions:

```typescript
/**
 * Handle seamless transition to next agent
 * Creates synthetic message and recursively calls next agent
 */
private async transitionToNextAgent(
  messages: CoreMessage[],
  userId: string,
  currentDepth: number,
): Promise<{ response: string; threadId?: string }> {
  console.log(`🔄 [Orchestrator] Auto-transitioning to next agent (depth: ${currentDepth + 1})`);

  // Create synthetic message to trigger next agent
  const syntheticMessage: CoreMessage = {
    role: 'user',
    content: 'continue', // Placeholder to trigger next agent
  };

  // Add synthetic message to history
  const messagesWithTransition = [...messages, syntheticMessage];

  // Recursively process with next agent (depth increases)
  return await this.processMessage(
    messagesWithTransition,
    userId,
    currentDepth + 1
  );
}
```

**Rationale:** Centralized transition logic, easier to test and maintain.

---

### 4. Update Qualifier Agent Case

**File:** `lib/ai/orchestrator.ts` (lines 168-207)

Replace the current `if (result.isComplete)` block:

```typescript
// Handle agent transition
if (result.isComplete) {
  // Save anonymized qualifier snapshot
  await analyticsApi.saveSnapshot({
    sessionId: currentSession.sessionId,
    agentType: 'qualifier',
    snapshotData: updates.qualifier || {},
  });

  // Create new thread for assessor agent
  const { threadId: newThreadId } = await threadsApi.create();
  console.log(
    `🧵 [Orchestrator] Created new thread for assessor: ${newThreadId}`,
  );

  updates.currentAgent = 'assessor';
  updates.phase = 'assessing';
  updates.threadId = newThreadId;

  console.log(`🎯 [Orchestrator] TRANSITION: Qualifier → Assessor`);

  // Dispatch state updates BEFORE transitioning
  this.dispatch(updateSessionState(updates));

  // Track token usage before transition
  if (result.tokenUsage) {
    this.dispatch(addTokenUsage(result.tokenUsage));
  }

  // Auto-transition to assessor
  return await this.transitionToNextAgent(
    messages,
    userId,
    transitionDepth
  );
}

// If not complete, return qualifier's response normally
if (result.tokenUsage) {
  this.dispatch(addTokenUsage(result.tokenUsage));
}

this.dispatch(updateSessionState(updates));

return {
  response: result.response,
  threadId: currentSession.threadId,
};
```

**Key Changes:**
- Dispatch state updates BEFORE transition
- Call `transitionToNextAgent()` instead of returning
- Move token tracking before transition
- Only return normally if NOT complete

---

### 5. Update Assessor Agent Case

**File:** `lib/ai/orchestrator.ts` (lines 249-273)

Replace the current `if (result.isComplete)` block:

```typescript
// Handle agent transition when assessment is complete
if (result.isComplete) {
  // Save anonymized assessor snapshot
  await analyticsApi.saveSnapshot({
    sessionId: currentSession.sessionId,
    agentType: 'assessor',
    snapshotData: updates.assessor || {},
  });

  updates.currentAgent = 'analyzer';
  updates.phase = 'analyzing';

  console.log(`🎯 [Orchestrator] TRANSITION: Assessor → Analyzer`);

  // Dispatch state updates BEFORE transitioning
  this.dispatch(updateSessionState(updates));

  // Track token usage before transition
  if (result.tokenUsage) {
    this.dispatch(addTokenUsage(result.tokenUsage));
  }

  // Auto-transition to analyzer
  return await this.transitionToNextAgent(
    messages,
    userId,
    transitionDepth
  );
}

// If not complete, return assessor's response normally
if (result.tokenUsage) {
  this.dispatch(addTokenUsage(result.tokenUsage));
}

this.dispatch(updateSessionState(updates));

return {
  response: result.response,
  threadId: currentSession.threadId,
};
```

**Key Changes:**
- Same pattern as qualifier
- Assessor → Analyzer transition
- Note: Analyzer doesn't create new thread (uses assessor's thread)

---

### 6. Update Analyzer Agent Case (No Transition)

**File:** `lib/ai/orchestrator.ts` (lines 333-358)

Analyzer is the final agent, so no transition needed. Keep existing code:

```typescript
// Handle completion when analysis is complete (temporary solution)
if (result.isComplete) {
  // Save anonymized analyzer snapshot
  await analyticsApi.saveSnapshot({
    sessionId: currentSession.sessionId,
    agentType: 'analyzer',
    snapshotData: updates.analyzer || {},
  });

  updates.currentAgent = 'analyzer';
  updates.phase = 'complete';
  console.log(`🎯 [Orchestrator] ANALYSIS COMPLETE`);
}

// Track token usage if provided
if (result.tokenUsage) {
  this.dispatch(addTokenUsage(result.tokenUsage));
}

// Dispatch updates to Redux
this.dispatch(updateSessionState(updates));

return {
  response: result.response,
  threadId: currentSession.threadId,
};
```

**No Changes:** Analyzer is terminal state, just returns normally.

---

### 7. Add Error Handling for Transitions

**File:** `lib/ai/orchestrator.ts`

Wrap the entire `processMessage` in enhanced error handling:

```typescript
async processMessage(
  messages: CoreMessage[],
  userId: string,
  transitionDepth: number = 0,
): Promise<{ response: string; threadId?: string }> {
  try {
    // Guard against infinite recursion
    if (transitionDepth > this.MAX_TRANSITION_DEPTH) {
      throw new Error(
        `Maximum transition depth exceeded. Transition chain: ${transitionDepth}`
      );
    }

    // ... existing code ...

  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    console.error(`❌ [Orchestrator] Error at depth ${transitionDepth}:`, errorMessage);

    // If error during transition (depth > 0), try to recover
    if (transitionDepth > 0) {
      console.warn(`⚠️ [Orchestrator] Error during auto-transition, user may need to retry`);
    }

    throw error;
  }
}
```

**Rationale:** Better debugging for transition failures, context about where error occurred.

---

## Testing Strategy

### Manual Testing Checklist
- [ ] Start new assessment
- [ ] Complete qualifier questions
- [ ] Verify assessor starts immediately (no user action)
- [ ] Complete assessor questions
- [ ] Verify analyzer starts immediately (no user action)
- [ ] Check browser console for transition logs
- [ ] Verify no errors in console
- [ ] Check Redux DevTools for state transitions

---

## Migration Notes

### Breaking Changes
None - this is a UX improvement, not an API change.

### Backwards Compatibility
Fully backwards compatible. If an agent returns `isComplete: false`, behavior is unchanged (user continues conversation with that agent).

### Rollback Plan
If issues arise:
1. Comment out the `transitionToNextAgent()` calls
2. Restore original `return { response, threadId }` in transition blocks
3. System reverts to requiring user input for transitions

---

## Performance Considerations

### Additional API Calls
- **Before:** User sends message → Agent responds (1 call)
- **After:** User sends message → Agent1 responds + Agent2 responds (2 calls on transition)

**Impact:** 2x API calls during transitions, but better UX. This is acceptable.

### Message History Growth
Synthetic messages add to history. Not significant - only 2 synthetic messages per assessment.

### State Updates
Multiple Redux dispatches during transition (3-4 total). Negligible performance impact.

---

## Definition of Done

- [ ] Code implemented in orchestrator.ts
- [ ] Manual testing completed
- [ ] No console errors during transitions
- [ ] Redux state transitions correctly
- [ ] Transition logs appear correctly
