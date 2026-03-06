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
      className="flex items-center justify-between px-4 h-12
                 bg-[#1a1a1f] border-b border-[#2a2a32]"
    >
      {/* Left: hamburger + logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle session history"
          className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100
                     hover:bg-[#2a2a32] transition-colors duration-150"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="15" y2="12" />
            <line x1="3" y1="18" x2="18" y2="18" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center"
            aria-hidden="true"
          >
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <h1 className="text-[15px] font-semibold text-zinc-100 tracking-tight">ShaderLLM</h1>
        </div>
      </div>

      {/* Right: actions */}
      <nav aria-label="Toolbar actions" className="flex items-center gap-2">
        <button
          onClick={onReset}
          aria-label="Reset shader and clear chat"
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium
                     text-zinc-300 bg-[#2a2a32] border border-[#3a3a44]
                     hover:bg-[#333340] hover:text-zinc-100
                     active:bg-[#3a3a44]
                     transition-colors duration-150"
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
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium
                     text-zinc-300 bg-[#2a2a32] border border-[#3a3a44]
                     hover:bg-[#333340] hover:text-zinc-100
                     active:bg-[#3a3a44]
                     disabled:opacity-30 disabled:cursor-not-allowed
                     disabled:hover:bg-[#2a2a32] disabled:hover:text-zinc-300
                     transition-colors duration-150"
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
