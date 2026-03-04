interface ThinkingIndicatorProps {
  text: string;
  retryCount: number;
}

export default function ThinkingIndicator({ text, retryCount }: ThinkingIndicatorProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Generating shader${retryCount > 0 ? `, retry ${retryCount}` : ''}`}
      className="flex items-start gap-3 px-4 py-3 rounded-xl bg-zinc-800/60 border border-zinc-700/50
                 text-zinc-300 text-sm animate-fade-in-up"
    >
      <div className="flex gap-1 mt-1.5 shrink-0" aria-hidden="true">
        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0ms]" />
        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:150ms]" />
        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:300ms]" />
      </div>
      <div className="min-w-0">
        <span className="break-words">{text}</span>
        {retryCount > 0 && (
          <span className="text-amber-400 font-medium ml-2">(retry {retryCount})</span>
        )}
      </div>
    </div>
  );
}
