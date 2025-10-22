import type { RunState } from '@openai/agents';

// Session store for managing SDK RunStates
const sessions = new Map<string, RunState<any, any>>();

export function getSession(sessionId: string): RunState<any, any> | undefined {
  return sessions.get(sessionId);
}

export function setSession(sessionId: string, state: RunState<any, any>): void {
  sessions.set(sessionId, state);
}

export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}

export function getAllSessionIds(): string[] {
  return Array.from(sessions.keys());
}

