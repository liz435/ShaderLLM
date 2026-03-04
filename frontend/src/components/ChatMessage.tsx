import { useEffect, useState } from 'react';
import type { ChatMessage as ChatMessageType } from '../types';

interface ChatMessageProps {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  return (
    <div
      role="listitem"
      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} mb-4
                  transition-all duration-300 ease-out
                  ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
    >
      {/* Role label */}
      <span
        className={`text-xs font-semibold mb-1.5 px-0.5
          ${isUser ? 'text-indigo-400' : 'text-zinc-400'}`}
      >
        {isUser ? 'You' : 'ShaderLLM'}
      </span>

      {/* Message bubble */}
      <div
        className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap
          ${isUser
            ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm shadow-md shadow-indigo-500/10'
            : 'bg-zinc-800 text-zinc-200 rounded-2xl rounded-tl-sm border border-zinc-700'
          }`}
      >
        {message.content}
      </div>
    </div>
  );
}
