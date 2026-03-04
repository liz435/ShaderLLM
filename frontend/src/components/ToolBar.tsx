interface ToolBarProps {
  onReset: () => void;
  onExport: () => void;
  hasShader: boolean;
  onToggleSidebar: () => void;
}

export default function ToolBar({ onReset, onExport, hasShader, onToggleSidebar }: ToolBarProps) {
  return (
    <header
      role="banner"
      className="flex items-center justify-between px-4 py-2.5
                 border-b border-zinc-700/60 bg-zinc-900"
    >
      {/* Logo / Title */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle session history"
          className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800
                     transition-colors duration-100"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div
          className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600
                     flex items-center justify-center shadow-md shadow-indigo-500/20"
          aria-hidden="true"
        >
          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>
        <h1 className="text-base font-bold text-zinc-100 tracking-tight">ShaderLLM</h1>
      </div>

      {/* Actions */}
      <nav aria-label="Toolbar actions" className="flex items-center gap-2">
        <button
          onClick={onReset}
          aria-label="Reset shader and clear chat"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium
                     text-zinc-300 bg-zinc-800 border border-zinc-700
                     hover:bg-zinc-700 hover:text-zinc-100
                     active:bg-zinc-600 transition-colors duration-100"
        >
          <svg className="w-4 h-4" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          Reset
        </button>
        <button
          onClick={onExport}
          disabled={!hasShader}
          aria-label="Export shader as .frag file"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium
                     text-zinc-300 bg-zinc-800 border border-zinc-700
                     hover:bg-zinc-700 hover:text-zinc-100
                     active:bg-zinc-600
                     disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-zinc-800
                     transition-colors duration-100"
        >
          <svg className="w-4 h-4" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export
        </button>
      </nav>
    </header>
  );
}
