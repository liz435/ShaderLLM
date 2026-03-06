import { useState, useRef, useEffect, useCallback } from 'react';
import ChatMessage from './ChatMessage';
import ThinkingIndicator from './ThinkingIndicator';
import { useSession } from '../contexts/SessionContext';

interface ChatPanelProps {
  onSubmit: (prompt: string) => void;
  isGenerating: boolean;
  onAbort: () => void;
}

const EXAMPLE_PROMPTS = [
  'A pulsing neon circle on a dark background',
  'Ocean waves with foam and sunlight',
  'Hypnotic spiral tunnel with RGB shift',
  'Perlin noise terrain with coloring',
];

export default function ChatPanel({ onSubmit, isGenerating, onAbort }: ChatPanelProps) {
  const { messages, events, streamingText } = useSession();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wasGenerating = useRef(false);

  const thinkingText = events.findLast((e) => e.type === 'thinking')?.data?.text as string || 'Thinking...';
  const retryCount = events.findLast((e) => e.type === 'repair_attempt')?.data?.attempt as number || 0;

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, events, streamingText]);

  useEffect(() => {
    if (wasGenerating.current && !isGenerating) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
    wasGenerating.current = isGenerating;
  }, [isGenerating]);

  const handleSubmit = useCallback((e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    const prompt = input.trim();
    if (!prompt || isGenerating) return;
    setInput('');
    onSubmit(prompt);
    requestAnimationFrame(() => {
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    });
  }, [input, isGenerating, onSubmit]);

  const hasInput = input.trim().length > 0;

  return (
    <section aria-label="Chat" className="flex flex-col h-full">
      {/* Messages */}
      <div
        ref={scrollRef}
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
        className="flex-1 overflow-y-auto"
      >
        {messages.length === 0 && !isGenerating ? (
          <div className="flex flex-col items-center justify-center h-full px-6">
            <div className="mb-8 text-center">
              <div className="w-10 h-10 rounded-full bg-[#1a1a24] border border-[#2a2a34]
                             flex items-center justify-center mx-auto mb-4">
                <svg className="w-5 h-5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-zinc-200 mb-1">ShaderLLM</h2>
              <p className="text-[13px] text-zinc-500 leading-relaxed">
                Describe a visual effect to generate a shader.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 w-full max-w-sm" role="list" aria-label="Example prompts">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  role="listitem"
                  onClick={() => { setInput(prompt); textareaRef.current?.focus(); }}
                  className="text-left text-[12px] leading-snug px-3 py-2.5 rounded-xl
                             bg-[#1e1e26] border border-[#2a2a34] text-zinc-400
                             hover:bg-[#252530] hover:text-zinc-300 hover:border-[#3a3a44]
                             transition-colors duration-150"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div role="list" aria-label="Messages">
            {messages.map((msg, i) => {
              const isLastAssistant = !isGenerating && msg.role === 'assistant' && i === messages.length - 1;
              return (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  isLast={isLastAssistant}
                  onRetry={isLastAssistant ? () => {
                    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
                    if (lastUserMsg) onSubmit(lastUserMsg.content);
                  } : undefined}
                />
              );
            })}
            {isGenerating && <ThinkingIndicator text={thinkingText} streamingText={streamingText} retryCount={retryCount} />}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="px-4 pb-4 pt-2">
        <form
          onSubmit={handleSubmit}
          aria-label="Send a message"
          className="rounded-2xl bg-[#1e1e26] border border-[#2e2e38]
                     focus-within:border-[#4a4a58]
                     transition-colors duration-200 shadow-lg shadow-black/20"
        >
          <label htmlFor="shader-prompt" className="sr-only">Describe a shader</label>
          <textarea
            id="shader-prompt"
            ref={textareaRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); adjustHeight(); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
            }}
            placeholder="Message ShaderLLM..."
            disabled={isGenerating}
            rows={1}
            className="w-full px-4 pt-3 pb-2 text-[14px] text-zinc-100
                       placeholder-zinc-500 bg-transparent
                       outline-none resize-none leading-relaxed
                       disabled:opacity-40"
            style={{ maxHeight: 160 }}
          />

          {/* Bottom bar — not overlapping textarea */}
          <div className="flex items-center justify-between px-3 pb-2">
            <p className="text-[11px] text-zinc-600 pl-1 select-none" aria-hidden="true">
              <kbd className="font-mono text-zinc-500">Enter</kbd>
              <span className="mx-1 text-zinc-700">send</span>
              <kbd className="font-mono text-zinc-500">Shift+Enter</kbd>
              <span className="ml-1 text-zinc-700">newline</span>
            </p>

            {isGenerating ? (
              <button
                type="button"
                onClick={onAbort}
                aria-label="Stop generation"
                className="w-8 h-8 rounded-full flex items-center justify-center
                           bg-zinc-100 text-zinc-900
                           hover:bg-white transition-colors duration-150"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!hasInput}
                aria-label="Send message"
                className={`w-8 h-8 rounded-full flex items-center justify-center
                           transition-all duration-150
                           ${hasInput
                             ? 'bg-zinc-100 text-zinc-900 hover:bg-white shadow-sm'
                             : 'bg-[#2a2a34] text-zinc-600 cursor-not-allowed'
                           }`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              </button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
