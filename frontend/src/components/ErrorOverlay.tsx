import { useState, useEffect } from 'react';
import type { ShaderError } from '../types';

interface ErrorOverlayProps {
  errors: ShaderError[];
}

export default function ErrorOverlay({ errors }: ErrorOverlayProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (errors.length > 0) {
      setIsCollapsed(false);
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [errors]);

  if (errors.length === 0 && !isVisible) return null;

  return (
    <div
      role="alert"
      aria-label={`${errors.length} compilation error${errors.length > 1 ? 's' : ''}`}
      className={`absolute bottom-0 left-0 right-0
                  bg-[#0c0a0a]/90 backdrop-blur-md
                  border-t border-white/[0.06]
                  transition-all duration-300 ease-out
                  ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
    >
      {/* Header — collapse toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-expanded={!isCollapsed}
        aria-controls="error-list"
        className="w-full flex items-center justify-between px-4 py-2.5
                   hover:bg-white/[0.03] transition-colors duration-150"
      >
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" aria-hidden="true" />
          <span className="text-red-400 text-[13px] font-medium">
            {errors.length} Error{errors.length > 1 ? 's' : ''}
          </span>
        </div>
        <svg
          aria-hidden="true"
          className={`w-3.5 h-3.5 text-zinc-600 transition-transform duration-200
                     ${isCollapsed ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Error list — collapsible */}
      <div
        id="error-list"
        className={`overflow-hidden transition-all duration-200 ease-out
                    ${isCollapsed ? 'max-h-0' : 'max-h-48'}`}
      >
        <div className="px-4 pb-3 space-y-1 overflow-y-auto max-h-48" role="list">
          {errors.map((err, i) => (
            <div key={i} role="listitem" className="text-zinc-400 text-[13px] font-mono py-1 leading-relaxed">
              {err.line > 0 && (
                <span className="text-red-400/80 font-semibold mr-1.5">L{err.line}</span>
              )}
              {err.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
