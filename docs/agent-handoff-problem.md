# Agent Handoff Problem & Solutions

## Problem Statement

### Current Behavior
The orchestrator manages three sequential agents (qualifier → assessor → analyzer), but agent transitions require user intervention to proceed. When one agent completes its work, the user must send another message to trigger the next agent to begin.

**Example Flow:**
1. User answers qualifier's final question
2. Qualifier returns final response with `needs_more_info: false` (or `isComplete: true`)
3. Orchestrator detects completion and transitions state: `currentAgent: 'assessor'`
4. **User receives qualifier's goodbye message**
5. **User must type something (anything) to trigger assessor**
6. Only then does assessor send its first question
7. Same issue repeats for assessor → analyzer transition

### Technical Root Cause

**Detection Field:** `needs_more_info: boolean` (or inverse `isComplete: boolean`)
- When `isComplete: true`, the agent has finished its phase
- Orchestrator correctly detects this and updates Redux state
- BUT orchestrator returns the completing agent's final response and waits

**Code Location:** [orchestrator.ts:168-194](../lib/ai/orchestrator.ts#L168-L194)

```typescript
// Handle agent transition
if (result.isComplete) {
  // Update state
  updates.currentAgent = 'assessor';
  updates.phase = 'assessing';
  updates.threadId = newThreadId;

  this.dispatch(updateSessionState(updates));

  // Returns here - next agent won't run until user sends another message
  return {
    response: result.response, // ← Qualifier's goodbye
    threadId: currentSession.threadId,
  };
}
```

### User Experience Impact

**Current (Broken):**
```
Qualifier: "Great! I have enough info. Ready for the assessment?"
[User must type something]
User: "ok" / "yes" / [any message]
Assessor: "Let's begin. Question 1: ..."
```

**Desired (Seamless):**
```
Qualifier: "Great! I have enough info."
Assessor: "Let's begin. Question 1: ..."
[No user action required]
```

---

## Proposed Solutions

### Option 1: Auto-trigger with Synthetic Message (RECOMMENDED)

**Concept:** When an agent completes, immediately invoke the next agent with a synthetic "continue" message behind the scenes.

**Implementation:**
```typescript
// In orchestrator.ts, inside each agent case
if (result.isComplete) {
  // Save snapshot
  await analyticsApi.saveSnapshot(...);

  // Update state for transition
  updates.currentAgent = 'assessor';
  updates.phase = 'assessing';
  updates.threadId = newThreadId;

  // Dispatch state update
  this.dispatch(updateSessionState(updates));

  // Auto-trigger next agent with synthetic message
  const syntheticMessage: CoreMessage = {
    role: 'user',
    content: '', // Empty or 'continue'
  };

  // Recursive call to process next agent
  return await this.processMessage(
    [...messages, syntheticMessage],
    userId
  );
}
```

**Pros:**
- ✅ Completely seamless user experience
- ✅ No frontend changes required
- ✅ Clean separation - orchestrator handles orchestration
- ✅ Works with existing message history structure

**Cons:**
- ⚠️ Recursive call (need to ensure no infinite loops)
- ⚠️ Synthetic message appears in conversation history
- ⚠️ Need to handle edge cases (errors during transition, etc.)

**Edge Cases to Handle:**
- Error in next agent → roll back state or show error gracefully
- Ensure synthetic message doesn't confuse agent prompts
- Message history includes synthetic messages (may need filtering for display)

---

### Option 2: Frontend Auto-Submit

**Concept:** Orchestrator signals a transition occurred, frontend automatically submits an empty message.

**Implementation:**
```typescript
// In orchestrator.ts
if (result.isComplete) {
  updates.currentAgent = 'assessor';
  this.dispatch(updateSessionState(updates));

  return {
    response: result.response,
    agentTransitioned: true, // ← New flag
    nextAgent: 'assessor',
  };
}

// In hooks/use-orchestrated-chat.ts
const result = await orchestrator.processMessage(...);

if (result.agentTransitioned) {
  // Auto-submit empty message after short delay
  setTimeout(() => {
    sendMessage({ content: '' });
  }, 500);
}
```

**Pros:**
- ✅ Orchestrator stays simple and stateless
- ✅ Frontend controls user experience flow
- ✅ Easy to add transition animations/loading states

**Cons:**
- ❌ User sees intermediate state briefly (flicker)
- ❌ Feels hacky with setTimeout
- ❌ Requires frontend/backend coordination
- ❌ Empty message still goes to backend

---

### Option 3: Return Multiple Responses

**Concept:** When transition occurs, call next agent immediately and return both responses together.

**Implementation:**
```typescript
if (result.isComplete) {
  // Transition state
  updates.currentAgent = 'assessor';
  this.dispatch(updateSessionState(updates));

  // Immediately get next agent's response
  const nextAgentResult = await agentsApi.assessor({
    messages: [...messages, { role: 'assistant', content: result.response }],
    threadId: newThreadId,
    qualifier: updates.qualifier,
  });

  return {
    responses: [
      { content: result.response, agent: 'qualifier' },
      { content: nextAgentResult.response, agent: 'assessor' }
    ],
    transition: true,
  };
}
```

**Pros:**
- ✅ Both messages shown clearly to user
- ✅ No synthetic messages in history
- ✅ Clear transition point

**Cons:**
- ❌ More complex response handling in frontend
- ❌ Two messages appear simultaneously (may be confusing)
- ❌ Chat UI needs to handle multi-response format
- ❌ Message ordering in history becomes complex

---

### Option 4: Prompt Engineering

**Concept:** Instruct agents to end their phase with a question that naturally prompts user response.

**Implementation:**
```
// In agent prompts
"When you have collected enough information, end with a question that
transitions to the next phase. For example: 'Perfect! I have what I need.
Now let's dive into the detailed assessment. To start, how would you rate
your current market position?'"
```

**Pros:**
- ✅ No code changes needed
- ✅ Feels more conversational

**Cons:**
- ❌ Unreliable - LLM may not follow instructions
- ❌ Still requires user to respond
- ❌ Breaks clean separation of agent responsibilities
- ❌ Doesn't solve the core problem

---

## Recommendation

**Use Option 1: Auto-trigger with Synthetic Message**

### Rationale
1. **Best UX:** Completely seamless, user never knows agents switched
2. **Architecturally Sound:** Orchestrator's job is to orchestrate - handling transitions fits its responsibility
3. **Minimal Changes:** No frontend changes, no new message formats
4. **Scalable:** Works for any number of agent transitions

### Implementation Plan

1. **Add recursive handler for transitions**
   - Create `handleAgentTransition()` method
   - Returns result from next agent instead of current agent's goodbye

2. **Filter synthetic messages for display**
   - Add `metadata.synthetic: true` flag
   - Frontend filters these from chat UI
   - Preserved in history for debugging

3. **Error handling**
   - Wrap transition in try/catch
   - Roll back state if next agent fails
   - Show clear error message to user

4. **Add transition messaging**
   - Optional: Insert system message like "✓ Qualification complete - Starting assessment..."
   - Can be subtle UI indicator instead of chat message

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Infinite recursion | Max depth check, only trigger on explicit `isComplete` flag |
| State desync | Transaction-like state updates with rollback |
| Confusing message history | Filter synthetic messages from UI, add metadata |
| Performance (double API calls) | Expected - necessary for seamless UX, can optimize later |

---

## Alternative Considerations

### Hybrid Approach
Could combine Option 1 + 3:
- Use synthetic message to trigger next agent
- Return both final + initial messages together
- Gives flexibility in how frontend displays transition

### Future: WebSocket/Streaming
Long-term, could use server-sent events to push next agent's message without client request. Would eliminate the need for synthetic messages entirely.

---

## Next Steps

1. ✅ Document problem and solutions (this doc)
2. ⬜ Review and approve approach with team
3. ⬜ Implement Option 1 in orchestrator
4. ⬜ Add transition handling for all 3 agent boundaries
5. ⬜ Test edge cases (errors, network issues)
6. ⬜ Update frontend to handle transition indicators (optional)
7. ⬜ Add telemetry to track transition success rate
