import { useRef, useEffect } from 'react';

interface ThinkingIndicatorProps {
  text: string;
  streamingText: string;
  retryCount: number;
}

export default function ThinkingIndicator({ text, streamingText, retryCount }: ThinkingIndicatorProps) {
  const streamRef = useRef<HTMLDivElement>(null);

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
      className="py-3.5 animate-fade-in"
    >
      <div className="px-4">
        <div className="text-[11px] font-medium mb-1 text-zinc-600">ShaderLLM</div>

        {/* Status */}
        <div className="flex items-center gap-2.5">
          <span className="flex gap-1" aria-hidden="true">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse [animation-delay:300ms]" />
          </span>
          <span className="text-[13px] text-zinc-400">{text}</span>
          {retryCount > 0 && (
            <span className="text-[12px] text-amber-500/80 font-medium">(retry {retryCount})</span>
          )}
        </div>

        {/* Streaming output */}
        {streamingText && (
          <div
            ref={streamRef}
            className="mt-2 max-h-28 overflow-y-auto text-[12px] leading-relaxed text-zinc-500
                       whitespace-pre-wrap break-words font-mono
                       border-l border-white/[0.06] pl-3"
          >
            {streamingText}
            <span className="inline-block w-px h-3.5 ml-0.5 bg-zinc-500 animate-pulse align-text-bottom" />
          </div>
        )}
      </div>
    </div>
  );
}
