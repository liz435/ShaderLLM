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
        className="flex-1 overflow-y-auto p-5"
      >
        {messages.length === 0 && !isGenerating ? (
          <div className="flex flex-col items-center justify-center h-full px-4">
            {/* Hero */}
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-extrabold text-zinc-100 mb-2 tracking-tight">
                Shader<span className="text-indigo-400">LLM</span>
              </h2>
              <p className="text-zinc-400 text-sm max-w-[280px] mx-auto leading-relaxed">
                Describe a visual effect and watch it render live in the browser
              </p>
            </div>

            {/* Example prompts */}
            <div className="flex flex-col gap-2.5 w-full max-w-sm" role="list" aria-label="Example prompts">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  role="listitem"
                  onClick={() => {
                    setInput(prompt);
                    textareaRef.current?.focus();
                  }}
                  className="text-left text-sm px-4 py-3 rounded-xl
                             bg-zinc-800 border border-zinc-700 text-zinc-300
                             hover:bg-zinc-750 hover:border-zinc-600 hover:text-zinc-100
                             active:bg-zinc-700
                             transition-colors duration-100
                             shadow-sm"
                >
                  <span aria-hidden="true" className="text-indigo-400 mr-2">&rarr;</span>
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div role="list" aria-label="Messages">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {isGenerating && <ThinkingIndicator text={thinkingText} retryCount={retryCount} />}
          </div>
        )}
      </div>

      {/* Input area */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-zinc-700/60 bg-zinc-900/50"
        aria-label="Send a message"
      >
        <div className="flex gap-2 items-end">
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
            className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700
                       text-zinc-100 text-sm
                       placeholder-zinc-500 outline-none
                       focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50
                       disabled:opacity-50 resize-none leading-relaxed
                       transition-shadow duration-100"
            style={{ maxHeight: 160 }}
          />
          {isGenerating ? (
            <button
              type="button"
              onClick={onAbort}
              aria-label="Stop generation"
              className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold
                         hover:bg-red-500 active:bg-red-700
                         shadow-sm shadow-red-500/20
                         transition-colors duration-100"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Send message"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold
                         hover:bg-indigo-500 active:bg-indigo-700
                         disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-indigo-600
                         shadow-sm shadow-indigo-500/20
                         transition-colors duration-100"
            >
              Send
            </button>
          )}
        </div>
        {/* Keyboard hints */}
        <p className="text-xs text-zinc-500 mt-2 px-1" aria-hidden="true">
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 font-mono text-[11px]">Enter</kbd>
          {' '}to send
          {' '}&middot;{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 font-mono text-[11px]">Shift+Enter</kbd>
          {' '}new line
        </p>
      </form>
    </section>
  );
}
