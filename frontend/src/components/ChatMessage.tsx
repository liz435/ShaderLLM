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
      className={`group py-5 transition-all duration-300 ease-out
                  ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
                  ${!isUser ? 'bg-white/[0.02]' : ''}`}
    >
      <div className="flex gap-3 px-4 max-w-full">
        {/* Avatar */}
        <div className="shrink-0 mt-0.5">
          {isUser ? (
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600
                           flex items-center justify-center ring-1 ring-white/10">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          ) : (
            <div className="w-7 h-7 rounded-full bg-[#1a1a24] border border-white/[0.08]
                           flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Name */}
          <div className="text-[13px] font-semibold mb-1.5 text-zinc-200">
            {isUser ? 'You' : 'ShaderLLM'}
          </div>

          {/* Message text */}
          <div className="text-[14px] leading-[1.7] text-zinc-300 whitespace-pre-wrap break-words">
            {message.content}
          </div>

          {/* Action bar — visible on hover */}
          <div className={`flex items-center gap-0.5 mt-2
                          opacity-0 group-hover:opacity-100 transition-opacity duration-150`}>
            <button
              onClick={copyContent}
              className="p-1.5 rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.06]
                         transition-all duration-150"
              aria-label={copied ? 'Copied' : 'Copy message'}
            >
              {copied ? (
                <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>

            {!isUser && isLast && onRetry && (
              <button
                onClick={onRetry}
                className="p-1.5 rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.06]
                           transition-all duration-150"
                aria-label="Regenerate response"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
