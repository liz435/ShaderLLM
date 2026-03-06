import { useState, useRef, useCallback } from 'react';
import { connectSSE } from '../api/sse';
import type { ChatMessage, SSEEvent, SSEEventType, ValidationResult } from '../types';

export interface ShaderGenerationState {
  generate: (prompt: string, conversationId?: string | null) => void;
  refine: (prompt: string, currentShader: string, history?: ChatMessage[], conversationId?: string | null) => void;
  abort: () => void;
  shader: string | null;
  setShader: (shader: string | null) => void;
  isGenerating: boolean;
  events: SSEEvent[];
  streamingText: string;
  validationResult: ValidationResult | null;
  retryCount: number;
  error: string | null;
  conversationId: string | null;
  setConversationId: (id: string | null) => void;
  promptVersion: number | null;
  setPromptVersion: (v: number | null) => void;
}

export function useShaderGeneration(): ShaderGenerationState {
  const [shader, setShader] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [promptVersion, setPromptVersion] = useState<number | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const handleEvent = useCallback((type: SSEEventType, data: Record<string, unknown>) => {
    // Don't add text_delta to the events array (too many, would cause excessive re-renders)
    if (type === 'text_delta') {
      const text = data.text as string || '';
      setStreamingText((prev) => prev + text);
      return;
    }

    const event: SSEEvent = { type, data, timestamp: Date.now() };
    setEvents((prev) => [...prev, event]);

    switch (type) {
      case 'shader_code':
        if (data.code && typeof data.code === 'string') {
          setShader(data.code);
        }
        break;
      case 'validation':
        setValidationResult(data as unknown as ValidationResult);
        break;
      case 'repair_attempt':
        setRetryCount(data.attempt as number || 0);
        // Clear streaming text for next LLM call (repair)
        setStreamingText('');
        break;
      case 'error':
        setError(data.message as string || 'Unknown error');
        break;
      case 'done':
        if (data.conversation_id && typeof data.conversation_id === 'string') {
          setConversationId(data.conversation_id);
        }
        break;
    }
  }, []);

  const startStream = useCallback(
    (url: string, body: object) => {
      controllerRef.current?.abort();

      setIsGenerating(true);
      setEvents([]);
      setStreamingText('');
      setError(null);
      setRetryCount(0);
      setValidationResult(null);

      controllerRef.current = connectSSE(url, body, {
        onEvent: handleEvent,
        onError: (err) => {
          setError(err.message);
          setIsGenerating(false);
        },
        onDone: () => {
          setIsGenerating(false);
        },
      });
    },
    [handleEvent]
  );

  const generate = useCallback(
    (prompt: string, convId?: string | null) => {
      startStream('/api/generate', {
        prompt,
        conversation_id: convId || undefined,
        prompt_version: promptVersion ?? undefined,
      });
    },
    [startStream, promptVersion]
  );

  const refine = useCallback(
    (prompt: string, currentShader: string, history?: ChatMessage[], convId?: string | null) => {
      // Send last 20 turns max to avoid token overflow
      const trimmedHistory = (history || []).slice(-20).map((m) => ({
        role: m.role,
        content: m.content,
      }));
      startStream('/api/refine', {
        prompt,
        current_fragment_shader: currentShader,
        history: trimmedHistory,
        conversation_id: convId || undefined,
        prompt_version: promptVersion ?? undefined,
      });
    },
    [startStream, promptVersion]
  );

  const abort = useCallback(() => {
    controllerRef.current?.abort();
    setIsGenerating(false);
  }, []);

  return {
    generate,
    refine,
    abort,
    shader,
    setShader,
    isGenerating,
    events,
    streamingText,
    validationResult,
    retryCount,
    error,
    conversationId,
    setConversationId,
    promptVersion,
    setPromptVersion,
  };
}
