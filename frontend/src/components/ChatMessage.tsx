import { useEffect, useState, useCallback } from 'react';
import type { ChatMessage as ChatMessageType } from '../types';

interface ChatMessageProps {
  message: ChatMessageType;
  isLast?: boolean;
  onRetry?: () => void;
}

export default function ChatMessage({ message, isLast, onRetry }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const copyContent = useCallback(async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [message.content]);

  return (
    <div
      role="listitem"
      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} mb-5 group
                  transition-all duration-300 ease-out
                  ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
    >
      {/* Role label */}
      <span
        className={`text-[11px] font-semibold uppercase tracking-wider mb-1.5 px-0.5
          ${isUser ? 'text-indigo-400/70' : 'text-zinc-500'}`}
      >
        {isUser ? 'You' : 'ShaderLLM'}
      </span>

      {/* Message bubble */}
      <div className="relative max-w-[88%]">
        <div
          className={`px-4 py-3 text-[13px] leading-relaxed whitespace-pre-wrap
            ${isUser
              ? `bg-gradient-to-br from-indigo-600 to-indigo-700
                 text-white rounded-2xl rounded-tr-sm
                 shadow-lg shadow-indigo-500/15
                 ring-1 ring-white/10`
              : `bg-white/[0.04] text-zinc-300 rounded-2xl rounded-tl-sm
                 border border-white/[0.06]
                 shadow-lg shadow-black/10`
            }`}
        >
          {message.content}
        </div>

        {/* Copy button — appears on hover */}
        <button
          onClick={copyContent}
          className={`absolute top-1.5 ${isUser ? '-left-8' : '-right-8'}
                     p-1 rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.06]
                     opacity-0 group-hover:opacity-100 transition-all duration-150`}
          aria-label={copied ? 'Copied' : 'Copy message'}
        >
          {copied ? (
            <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
        </button>
      </div>

      {/* Retry button — only on last assistant message */}
      {!isUser && isLast && onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1 mt-1.5 px-2 py-1 rounded-md text-xs text-zinc-500
                     hover:text-zinc-300 hover:bg-white/[0.04] transition-all duration-150"
          aria-label="Regenerate response"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          Retry
        </button>
      )}
    </div>
  );
}
