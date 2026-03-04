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

export async function renameSession(conversationId: string, title: string): Promise<boolean> {
  const res = await fetch(`/api/conversations/${conversationId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  return res.ok;
}

export async function deleteSession(conversationId: string): Promise<boolean> {
  const res = await fetch(`/api/conversations/${conversationId}`, {
    method: 'DELETE',
  });
  return res.ok;
}
