import type { SSEEventType } from '../types';

export interface SSECallbacks {
  onEvent: (type: SSEEventType, data: Record<string, unknown>) => void;
  onError: (error: Error) => void;
  onDone: () => void;
}

/**
 * POST-based SSE client using fetch + ReadableStream.
 * Returns an AbortController to cancel the stream.
 */
export function connectSSE(
  url: string,
  body: object,
  callbacks: SSECallbacks
): AbortController {
  const controller = new AbortController();

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ') && currentEvent) {
            try {
              const data = JSON.parse(line.slice(6));
              if (currentEvent === 'done') {
                callbacks.onEvent('done', data);
                callbacks.onDone();
              } else {
                callbacks.onEvent(currentEvent as SSEEventType, data);
              }
            } catch {
              // Skip malformed JSON
            }
            currentEvent = '';
          }
        }
      }

      // Stream ended naturally
      callbacks.onDone();
    })
    .catch((err: Error) => {
      if (err.name !== 'AbortError') {
        callbacks.onError(err);
      }
    });

  return controller;
}
