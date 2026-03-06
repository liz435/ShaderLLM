import { useRef, useEffect } from 'react';

interface ThinkingIndicatorProps {
  text: string;
  streamingText: string;
  retryCount: number;
}

export default function ThinkingIndicator({ text, streamingText, retryCount }: ThinkingIndicatorProps) {
  const streamRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the streaming text container
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [streamingText]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Generating shader${retryCount > 0 ? `, retry ${retryCount}` : ''}`}
      className="py-5 bg-white/[0.02] animate-fade-in-up"
    >
      <div className="flex gap-3 px-4">
        {/* Avatar */}
        <div className="shrink-0 mt-0.5">
          <div className="w-7 h-7 rounded-full bg-[#1a1a24] border border-white/[0.08]
                         flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold mb-1.5 text-zinc-200">ShaderLLM</div>

          {/* Status line with dots */}
          <div className="flex items-center gap-2 mb-1">
            <div className="flex gap-1" aria-hidden="true">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:300ms]" />
            </div>
            <span className="text-[12px] text-zinc-500">{text}</span>
            {retryCount > 0 && (
              <span className="text-[12px] text-amber-400/80 font-medium">(retry {retryCount})</span>
            )}
          </div>

          {/* Streaming LLM output */}
          {streamingText && (
            <div
              ref={streamRef}
              className="mt-2 max-h-32 overflow-y-auto text-[13px] leading-relaxed text-zinc-400
                         whitespace-pre-wrap wrap-break-word font-mono
                         border-l-2 border-indigo-500/30 pl-3"
            >
              {streamingText}
              <span className="inline-block w-1.5 h-4 ml-0.5 bg-indigo-400/60 animate-pulse align-text-bottom" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
