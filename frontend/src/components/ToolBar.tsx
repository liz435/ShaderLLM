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
      className="relative flex items-center justify-between px-4 py-2.5
                 bg-[#0e0e14]/80 backdrop-blur-xl border-b border-white/[0.06]
                 z-20"
    >
      {/* Gradient line at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px
                   bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent"
        aria-hidden="true"
      />

      {/* Left: hamburger + logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle session history"
          className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100
                     hover:bg-white/[0.06] transition-all duration-150"
        >
          <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="15" y2="12" />
            <line x1="3" y1="18" x2="18" y2="18" />
          </svg>
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600
                       flex items-center justify-center
                       shadow-lg shadow-indigo-500/25 ring-1 ring-white/10"
            aria-hidden="true"
          >
            <svg className="w-4.5 h-4.5 text-white drop-shadow-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <div>
            <h1 className="text-[15px] font-bold tracking-tight">
              <span className="text-zinc-100">Shader</span><span className="text-indigo-400">LLM</span>
            </h1>
          </div>
        </div>
      </div>

      {/* Right: actions */}
      <nav aria-label="Toolbar actions" className="flex items-center gap-1.5">
        <button
          onClick={onReset}
          aria-label="Reset shader and clear chat"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium
                     text-zinc-400 hover:text-zinc-100
                     bg-white/[0.04] hover:bg-white/[0.08]
                     border border-white/[0.06] hover:border-white/[0.1]
                     transition-all duration-150"
        >
          <svg className="w-3.5 h-3.5" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium
                     text-zinc-400 hover:text-zinc-100
                     bg-white/[0.04] hover:bg-white/[0.08]
                     border border-white/[0.06] hover:border-white/[0.1]
                     disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/[0.04]
                     disabled:hover:text-zinc-400 disabled:hover:border-white/[0.06]
                     transition-all duration-150"
        >
          <svg className="w-3.5 h-3.5" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
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
