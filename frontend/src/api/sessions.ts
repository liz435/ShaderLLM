import type { SessionData, SessionSummary } from '../types';

export async function fetchSessions(limit = 50): Promise<SessionSummary[]> {
  const res = await fetch(`/api/conversations?limit=${limit}`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchSession(conversationId: string): Promise<SessionData | null> {
  const res = await fetch(`/api/conversations/${conversationId}`);
  if (!res.ok) return null;
  return res.json();
}
