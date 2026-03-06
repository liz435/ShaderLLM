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
      className={`group py-4 transition-all duration-200 ease-out
                  ${!isUser ? 'bg-white/[0.02]' : ''}
                  ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}
    >
      <div className="px-4">
        {/* Role label */}
        <div className={`text-[11px] font-medium mb-1 ${isUser ? 'text-zinc-500' : 'text-zinc-600'}`}>
          {isUser ? 'You' : 'ShaderLLM'}
        </div>

        {/* Message text */}
        <div className={`text-[14px] leading-[1.7] whitespace-pre-wrap break-words
                        ${isUser ? 'text-zinc-200' : 'text-zinc-300'}`}>
          {message.content}
        </div>

        {/* Hover actions */}
        <div className="flex items-center gap-0.5 mt-1.5
                        opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button
            onClick={copyContent}
            className="p-1 rounded text-zinc-700 hover:text-zinc-400 transition-colors duration-150"
            aria-label={copied ? 'Copied' : 'Copy message'}
          >
            {copied ? (
              <svg className="w-3 h-3 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>

          {!isUser && isLast && onRetry && (
            <button
              onClick={onRetry}
              className="p-1 rounded text-zinc-700 hover:text-zinc-400 transition-colors duration-150"
              aria-label="Regenerate response"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
