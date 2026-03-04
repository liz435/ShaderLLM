import { useState, useCallback, useRef, useEffect } from 'react';
import ShaderCanvas from './components/ShaderCanvas';
import ChatPanel from './components/ChatPanel';
import ShaderEditor from './components/ShaderEditor';
import ToolBar from './components/ToolBar';
import ErrorOverlay from './components/ErrorOverlay';
import SessionSidebar from './components/SessionSidebar';
import { useSession } from './contexts/SessionContext';
import type { CompileResult, ShaderError } from './types';
import './index.css';

export default function App() {
  const {
    sendMessage,
    startNewSession,
    abort,
    shader,
    isGenerating,
    error,
  } = useSession();

  const [compileErrors, setCompileErrors] = useState<ShaderError[]>([]);
  const [compileSuccess, setCompileSuccess] = useState(false);
  const [editorReadOnly, setEditorReadOnly] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Resizable panel
  const [panelWidth, setPanelWidth] = useState(420);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleCompileResult = useCallback((result: CompileResult) => {
    setCompileErrors(result.success ? [] : result.errors);
    setCompileSuccess(result.success);
  }, []);

  const handleSubmit = useCallback(
    (prompt: string) => {
      sendMessage(prompt);
    },
    [sendMessage]
  );

  const handleReset = useCallback(() => {
    abort();
    setCompileErrors([]);
    startNewSession();
  }, [abort, startNewSession]);

  const handleExport = useCallback(() => {
    if (!shader) return;
    const blob = new Blob([shader], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shader.frag';
    a.click();
    URL.revokeObjectURL(url);
  }, [shader]);

  // Drag-to-resize
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = panelWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [panelWidth]);

  useEffect(() => {
    const handleDragMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = e.clientX - startX.current;
      const newWidth = Math.max(320, Math.min(startWidth.current + delta, window.innerWidth - 400));
      setPanelWidth(newWidth);
    };
    const handleDragEnd = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, []);

  // Keyboard resize (a11y)
  const handleDragKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 50 : 10;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setPanelWidth((w) => Math.max(320, w - step));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setPanelWidth((w) => Math.min(w + step, window.innerWidth - 400));
    }
  }, []);

  return (
    <div className="flex flex-col h-full">
      <ToolBar
        onReset={handleReset}
        onExport={handleExport}
        hasShader={!!shader}
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
      />

      <div className="flex flex-1 min-h-0">
        <SessionSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        {/* Left panel: chat + editor */}
        <aside
          style={{ width: panelWidth }}
          className="min-w-[320px] flex flex-col bg-zinc-900 relative"
          aria-label="Chat and shader editor"
        >
          {/* Chat area */}
          <div className="flex-1 min-h-0">
            <ChatPanel
              onSubmit={handleSubmit}
              isGenerating={isGenerating}
              onAbort={abort}
            />
          </div>

          {/* Shader editor */}
          <div className="h-70 border-t border-zinc-700/60 flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-700/60 bg-zinc-900/80">
              <div className="flex items-center gap-2.5">
                {/* Compile status dot */}
                {shader && (
                  <span
                    aria-label={
                      compileErrors.length > 0
                        ? 'Compilation failed'
                        : compileSuccess
                          ? 'Compiled successfully'
                          : 'Not compiled'
                    }
                    className={`w-2.5 h-2.5 rounded-full shrink-0
                      ${compileErrors.length > 0
                        ? 'bg-red-500 shadow-sm shadow-red-500/40'
                        : compileSuccess
                          ? 'bg-emerald-500 animate-pulse-glow'
                          : 'bg-zinc-500'
                      }`}
                  />
                )}
                <span className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">
                  Fragment Shader
                </span>
              </div>
              <button
                onClick={() => setEditorReadOnly(!editorReadOnly)}
                aria-label={editorReadOnly ? 'Unlock editor for editing' : 'Lock editor to read-only'}
                aria-pressed={!editorReadOnly}
                className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md transition-colors duration-100
                  ${editorReadOnly
                    ? 'text-zinc-400 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 hover:text-zinc-200'
                    : 'text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 hover:bg-indigo-500/25'
                  }`}
              >
                {editorReadOnly ? (
                  <svg className="w-3.5 h-3.5" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                  </svg>
                )}
                {editorReadOnly ? 'Locked' : 'Editing'}
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <ShaderEditor
                code={shader || '// Shader code will appear here after generation...'}
                readOnly={editorReadOnly}
              />
            </div>
          </div>
        </aside>

        {/* Drag handle — visible, keyboard accessible */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panels. Use arrow keys to adjust."
          aria-valuenow={panelWidth}
          aria-valuemin={320}
          aria-valuemax={typeof window !== 'undefined' ? window.innerWidth - 400 : 1000}
          tabIndex={0}
          onMouseDown={handleDragStart}
          onKeyDown={handleDragKeyDown}
          className="w-1.5 cursor-col-resize shrink-0
                     bg-zinc-700/60 hover:bg-indigo-500 active:bg-indigo-400
                     focus-visible:bg-indigo-500
                     transition-colors duration-100"
        />

        {/* Right panel: WebGL canvas */}
        <main className="flex-1 relative bg-black" aria-label="Shader preview">
          <ShaderCanvas
            fragmentShader={shader}
            onCompileResult={handleCompileResult}
          />
          <ErrorOverlay errors={compileErrors} />

          {/* Error banner from agent */}
          {error && (
            <div
              role="alert"
              className="absolute top-4 left-4 right-4 px-4 py-3 rounded-xl
                         bg-red-950/90 backdrop-blur-sm border border-red-500/30
                         text-red-200 text-sm shadow-lg shadow-red-900/20
                         animate-fade-in-up"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 shadow-sm shadow-red-500/40" aria-hidden="true" />
                {error}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
