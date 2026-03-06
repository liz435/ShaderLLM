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
  'Volumetric fire',
  'Ocean waves at sunset',
  'Abstract spiral tunnel',
  'Neon orbital particles',
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
    el.style.height = Math.min(el.scrollHeight, 144) + 'px';
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
              <h2 className="text-[15px] font-medium text-zinc-300 mb-1.5">
                What should we build?
              </h2>
              <p className="text-[13px] text-zinc-600 leading-relaxed">
                Describe a visual effect or pick one below.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 max-w-sm" role="list" aria-label="Example prompts">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  role="listitem"
                  onClick={() => { setInput(prompt); textareaRef.current?.focus(); }}
                  className="text-[13px] px-3.5 py-1.5 rounded-full
                             bg-white/[0.04] border border-white/[0.06] text-zinc-500
                             hover:bg-white/[0.08] hover:text-zinc-300 hover:border-white/[0.1]
                             transition-all duration-150"
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

      {/* Input */}
      <div className="px-3 pb-3 pt-1">
        <form
          onSubmit={handleSubmit}
          aria-label="Send a message"
          className="rounded-xl bg-white/[0.04] border border-white/[0.06]
                     focus-within:border-white/[0.12]
                     transition-colors duration-200"
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
            placeholder="Describe a shader..."
            disabled={isGenerating}
            rows={1}
            className="w-full px-3.5 pt-2.5 pb-1 text-[14px] text-zinc-200
                       placeholder-zinc-600 bg-transparent
                       outline-none resize-none leading-relaxed
                       disabled:opacity-30"
            style={{ maxHeight: 144 }}
          />

          <div className="flex items-center justify-between px-2.5 pb-2">
            <span className="text-[10px] text-zinc-700 select-none" aria-hidden="true">
              Enter to send
            </span>

            {isGenerating ? (
              <button
                type="button"
                onClick={onAbort}
                aria-label="Stop generation"
                className="w-7 h-7 rounded-full flex items-center justify-center
                           bg-zinc-200 text-zinc-900
                           hover:bg-white transition-colors duration-150"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!hasInput}
                aria-label="Send message"
                className={`w-7 h-7 rounded-full flex items-center justify-center
                           transition-all duration-150
                           ${hasInput
                             ? 'bg-zinc-200 text-zinc-900 hover:bg-white'
                             : 'bg-white/[0.04] text-zinc-700/40 cursor-not-allowed'
                           }`}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
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
