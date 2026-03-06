import { useApiStatus } from '../hooks/useApiStatus';

interface ToolBarProps {
  onReset: () => void;
  onExport: () => void;
  hasShader: boolean;
  onToggleSidebar: () => void;
}

export default function ToolBar({ onReset, onExport, hasShader, onToggleSidebar }: ToolBarProps) {
  const api = useApiStatus();

  return (
    <header
      role="banner"
      className="flex items-center justify-between px-4 h-11
                 bg-[#09090b] border-b border-white/[0.06]"
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle session history"
          className="p-1 rounded-md text-zinc-600 hover:text-zinc-300
                     transition-colors duration-150"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="16" y2="12" />
            <line x1="4" y1="17" x2="18" y2="17" />
          </svg>
        </button>

        <span className="text-[13px] font-medium text-zinc-500 tracking-tight select-none">
          ShaderLLM
        </span>
      </div>

      {/* API status indicator */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5" title={api.online ? `${api.provider} / ${api.model}` : 'API offline'}>
          <span
            aria-label={api.online ? 'API online' : 'API offline'}
            className={`w-1.5 h-1.5 rounded-full transition-colors duration-300
              ${api.checking
                ? 'bg-zinc-600 animate-pulse'
                : api.online
                  ? 'bg-emerald-400'
                  : 'bg-red-500'
              }`}
          />
          {api.model && (
            <span className="text-[10px] text-zinc-600 font-mono select-none max-w-[160px] truncate">
              {api.model}
            </span>
          )}
          {!api.online && !api.checking && (
            <span className="text-[10px] text-red-400/70 font-medium select-none">
              offline
            </span>
          )}
        </div>

        <nav aria-label="Toolbar actions" className="flex items-center gap-0.5">
          <button
            onClick={onReset}
            aria-label="Reset"
            className="p-1.5 rounded-md text-zinc-600 hover:text-zinc-300
                       transition-colors duration-150"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>
          <button
            onClick={onExport}
            disabled={!hasShader}
            aria-label="Export shader"
            className="p-1.5 rounded-md text-zinc-600 hover:text-zinc-300
                       disabled:opacity-20 disabled:cursor-not-allowed
                       transition-colors duration-150"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
        </nav>
      </div>
    </header>
  );
}
