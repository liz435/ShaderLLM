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
                  bg-red-950/95 backdrop-blur-sm border-t-2 border-red-500/40
                  transition-all duration-300 ease-out
                  ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
    >
      {/* Header — collapse toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-expanded={!isCollapsed}
        aria-controls="error-list"
        className="w-full flex items-center justify-between px-4 py-2.5
                   hover:bg-red-900/40 transition-colors duration-100"
      >
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50" aria-hidden="true" />
          <span className="text-red-300 text-sm font-semibold">
            {errors.length} Compilation Error{errors.length > 1 ? 's' : ''}
          </span>
        </div>
        <svg
          aria-hidden="true"
          className={`w-4 h-4 text-red-400 transition-transform duration-200
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
            <div key={i} role="listitem" className="text-red-200 text-sm font-mono py-1 leading-relaxed">
              {err.line > 0 && (
                <span className="text-red-400 font-bold mr-1">L{err.line}:</span>
              )}
              {err.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
