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
  'Ocean waves with foam and sunlight reflections',
  'Hypnotic spiral tunnel with RGB color shift',
  'Perlin noise terrain with altitude-based coloring',
];

export default function ChatPanel({ onSubmit, isGenerating, onAbort }: ChatPanelProps) {
  const { messages, events } = useSession();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wasGenerating = useRef(false);

  const thinkingText = events.findLast((e) => e.type === 'thinking')?.data?.text as string || 'Generating...';
  const retryCount = events.findLast((e) => e.type === 'repair_attempt')?.data?.attempt as number || 0;

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, []);

  // Auto-scroll on new messages/events
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, events]);

  // Auto-focus textarea when generation completes
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
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    });
  }, [input, isGenerating, onSubmit]);

  return (
    <section aria-label="Chat" className="flex flex-col h-full">
      {/* Messages area */}
      <div
        ref={scrollRef}
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
        className="flex-1 overflow-y-auto px-4 py-5"
      >
        {messages.length === 0 && !isGenerating ? (
          <div className="flex flex-col items-center justify-center h-full px-4">
            {/* Hero */}
            <div className="mb-10 text-center">
              {/* Glowing orb */}
              <div className="relative mx-auto mb-6 w-16 h-16">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600
                               opacity-20 blur-xl animate-float" />
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600
                               flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/10">
                  <svg className="w-8 h-8 text-white/90" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </div>
              </div>

              <h2 className="text-2xl font-bold tracking-tight mb-2">
                <span className="bg-gradient-to-r from-zinc-100 via-zinc-100 to-indigo-300 bg-clip-text text-transparent">
                  ShaderLLM
                </span>
              </h2>
              <p className="text-zinc-500 text-sm max-w-[260px] mx-auto leading-relaxed">
                Describe a visual effect and watch it come alive in real-time
              </p>
            </div>

            {/* Example prompts */}
            <div className="flex flex-col gap-2 w-full max-w-sm" role="list" aria-label="Example prompts">
              {EXAMPLE_PROMPTS.map((prompt, i) => (
                <button
                  key={prompt}
                  role="listitem"
                  onClick={() => {
                    setInput(prompt);
                    textareaRef.current?.focus();
                  }}
                  className="group text-left text-[13px] px-4 py-3 rounded-xl
                             bg-white/[0.03] border border-white/[0.06]
                             text-zinc-400 hover:text-zinc-200
                             hover:bg-white/[0.06] hover:border-indigo-500/20
                             active:bg-white/[0.08]
                             transition-all duration-200
                             hover:shadow-md hover:shadow-indigo-500/5"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <span className="text-indigo-400/60 group-hover:text-indigo-400 mr-2 transition-colors" aria-hidden="true">&rarr;</span>
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
            {isGenerating && <ThinkingIndicator text={thinkingText} retryCount={retryCount} />}
          </div>
        )}
      </div>

      {/* Input area */}
      <form
        onSubmit={handleSubmit}
        className="p-3 bg-[#0c0c10]/80 backdrop-blur-sm border-t border-white/[0.06]"
        aria-label="Send a message"
      >
        <div className="relative">
          <label htmlFor="shader-prompt" className="sr-only">Describe a shader</label>
          <textarea
            id="shader-prompt"
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              adjustHeight();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Describe a shader..."
            disabled={isGenerating}
            rows={1}
            className="w-full px-4 py-3 pr-20 rounded-xl
                       bg-white/[0.04] border border-white/[0.08]
                       text-zinc-100 text-sm placeholder-zinc-600
                       outline-none resize-none leading-relaxed
                       focus:border-indigo-500/30 focus:bg-white/[0.06]
                       focus:shadow-[0_0_0_3px_rgba(99,102,241,0.08)]
                       disabled:opacity-40
                       transition-all duration-200"
            style={{ maxHeight: 160 }}
          />

          {/* Send/Stop button inside textarea */}
          <div className="absolute right-2 bottom-2">
            {isGenerating ? (
              <button
                type="button"
                onClick={onAbort}
                aria-label="Stop generation"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold
                           bg-red-500/20 text-red-400 border border-red-500/20
                           hover:bg-red-500/30 hover:text-red-300
                           transition-all duration-150"
              >
                Stop
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                aria-label="Send message"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold
                           bg-gradient-to-r from-indigo-500 to-violet-500
                           text-white shadow-md shadow-indigo-500/20
                           hover:shadow-lg hover:shadow-indigo-500/30
                           disabled:opacity-25 disabled:cursor-not-allowed disabled:shadow-none
                           disabled:from-zinc-600 disabled:to-zinc-600
                           transition-all duration-150"
              >
                Send
              </button>
            )}
          </div>
        </div>

        {/* Keyboard hints */}
        <p className="text-[11px] text-zinc-600 mt-1.5 px-1" aria-hidden="true">
          <kbd className="px-1 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-zinc-500 font-mono text-[10px]">Enter</kbd>
          {' '}send
          {' '}&middot;{' '}
          <kbd className="px-1 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-zinc-500 font-mono text-[10px]">Shift+Enter</kbd>
          {' '}new line
        </p>
      </form>
    </section>
  );
}
