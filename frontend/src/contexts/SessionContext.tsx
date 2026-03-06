import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { fetchSession, fetchSessions } from '../api/sessions';
import { useShaderGeneration } from '../hooks/useShaderGeneration';
import type { ChatMessage, SSEEvent, SessionSummary, ValidationResult } from '../types';

interface SessionContextValue {
  // Current conversation
  conversationId: string | null;
  messages: ChatMessage[];
  shader: string | null;

  // Session list for sidebar
  sessions: SessionSummary[];

  // Actions
  sendMessage: (prompt: string) => void;
  startNewSession: () => void;
  loadSession: (conversationId: string) => Promise<void>;
  refreshSessionList: () => Promise<void>;

  // Generation state
  isGenerating: boolean;
  events: SSEEvent[];
  streamingText: string;
  validationResult: ValidationResult | null;
  retryCount: number;
  error: string | null;
  abort: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const gen = useShaderGeneration();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const wasGenerating = useRef(false);

  // Load session list on mount
  useEffect(() => {
    fetchSessions().then(setSessions);
  }, []);

  const refreshSessionList = useCallback(async () => {
    const list = await fetchSessions();
    setSessions(list);
  }, []);

  // When generation completes, add assistant message and refresh sidebar
  useEffect(() => {
    if (wasGenerating.current && !gen.isGenerating) {
      const doneEvent = gen.events.find((e) => e.type === 'done');
      if (doneEvent) {
        const valid = doneEvent.data.valid;
        const retries = (doneEvent.data.retries as number) || 0;
        const text = valid
          ? `Shader generated successfully${retries > 0 ? ` (${retries} repair${retries > 1 ? 's' : ''})` : ''}.`
          : 'Shader generation failed. Check the error overlay.';
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: 'assistant', content: text, timestamp: Date.now() },
        ]);
      }
      refreshSessionList();
    }
    wasGenerating.current = gen.isGenerating;
  }, [gen.isGenerating, gen.events, refreshSessionList]);

  const sendMessage = useCallback(
    (prompt: string) => {
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: prompt,
        timestamp: Date.now(),
      };

      setMessages((prev) => {
        const updated = [...prev, userMsg];

        // Decide generate vs refine — use `updated` so the current
        // user message is included in the history sent to the backend.
        if (gen.shader) {
          gen.refine(prompt, gen.shader, updated, gen.conversationId);
        } else {
          gen.generate(prompt, gen.conversationId);
        }

        return updated;
      });
    },
    [gen]
  );

  const startNewSession = useCallback(() => {
    gen.abort();
    gen.setShader(null);
    gen.setConversationId(null);
    setMessages([]);
  }, [gen]);

  const loadSession = useCallback(
    async (convId: string) => {
      gen.abort();
      const data = await fetchSession(convId);
      if (!data) return;

      gen.setConversationId(data.conversation_id);
      gen.setShader(data.current_shader);
      setMessages(
        data.messages.map((m) => ({
          id: crypto.randomUUID(),
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: m.timestamp * 1000, // backend stores seconds, frontend uses ms
        }))
      );
    },
    [gen]
  );

  return (
    <SessionContext.Provider
      value={{
        conversationId: gen.conversationId,
        messages,
        shader: gen.shader,
        sessions,
        sendMessage,
        startNewSession,
        loadSession,
        refreshSessionList,
        isGenerating: gen.isGenerating,
        events: gen.events,
        streamingText: gen.streamingText,
        validationResult: gen.validationResult,
        retryCount: gen.retryCount,
        error: gen.error,
        abort: gen.abort,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
