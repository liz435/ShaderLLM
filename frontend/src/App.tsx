import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import ShaderCanvas from './components/ShaderCanvas';
import type { ShaderCanvasHandle } from './components/ShaderCanvas';
import ChatPanel from './components/ChatPanel';
import ShaderEditor from './components/ShaderEditor';
import ToolBar from './components/ToolBar';
import ErrorOverlay from './components/ErrorOverlay';
import SessionSidebar from './components/SessionSidebar';
import ShortcutsModal from './components/ShortcutsModal';
import { useSession } from './contexts/SessionContext';
import { useToast } from './contexts/ToastContext';
import { useShaderHistory } from './hooks/useShaderHistory';
import { useHotkeys, type HotkeyDef } from './hooks/useHotkeys';
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
  const { toast } = useToast();
  const history = useShaderHistory();

  const [compileErrors, setCompileErrors] = useState<ShaderError[]>([]);
  const [compileSuccess, setCompileSuccess] = useState(false);
  const [editorReadOnly, setEditorReadOnly] = useState(true);
  const [editorCode, setEditorCode] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Resizable panel
  const [panelWidth, setPanelWidth] = useState(420);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  // Canvas ref for imperative compile
  const canvasRef = useRef<ShaderCanvasHandle>(null);

  // Sync shader from generation into editor and history
  useEffect(() => {
    if (shader) {
      setEditorCode(shader);
      history.push(shader);
    }
  }, [shader]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCompileResult = useCallback((result: CompileResult) => {
    setCompileErrors(result.success ? [] : result.errors);
    setCompileSuccess(result.success);
  }, []);

  const handleSubmit = useCallback(
    (prompt: string) => { sendMessage(prompt); },
    [sendMessage]
  );

  const handleReset = useCallback(() => {
    abort();
    setCompileErrors([]);
    setEditorCode('');
    history.reset();
    startNewSession();
  }, [abort, startNewSession, history]);

  const handleExport = useCallback(() => {
    const code = editorCode || shader;
    if (!code) return;
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shader.frag';
    a.click();
    URL.revokeObjectURL(url);
    toast('Shader exported', 'success');
  }, [editorCode, shader, toast]);

  const handleCompile = useCallback(() => {
    if (!editorCode.trim()) return;
    const result = canvasRef.current?.compile(editorCode);
    if (result) {
      handleCompileResult(result);
      if (result.success) {
        history.push(editorCode);
        toast('Compiled successfully', 'success');
      } else {
        toast(`Compile failed: ${result.errors.length} error(s)`, 'error');
      }
    }
  }, [editorCode, handleCompileResult, history, toast]);

  const handleCopyShader = useCallback(async () => {
    const code = editorCode || shader;
    if (!code) return;
    await navigator.clipboard.writeText(code);
    toast('Shader copied', 'success');
  }, [editorCode, shader, toast]);

  const handleUndo = useCallback(() => {
    const prev = history.undo();
    if (prev !== null) {
      setEditorCode(prev);
      canvasRef.current?.compile(prev);
    }
  }, [history]);

  const handleRedo = useCallback(() => {
    const next = history.redo();
    if (next !== null) {
      setEditorCode(next);
      canvasRef.current?.compile(next);
    }
  }, [history]);

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

  // Global keyboard shortcuts
  const hotkeys: HotkeyDef[] = useMemo(() => [
    { key: 's', ctrl: true, handler: handleCompile, description: 'Compile shader' },
    { key: 'e', ctrl: true, handler: () => setEditorReadOnly((r) => !r), description: 'Toggle editor lock' },
    { key: 'e', ctrl: true, shift: true, handler: handleExport, description: 'Export shader' },
    { key: 'k', ctrl: true, handler: () => document.getElementById('shader-prompt')?.focus(), description: 'Focus chat' },
    { key: 'z', ctrl: true, handler: handleUndo, description: 'Undo' },
    { key: 'z', ctrl: true, shift: true, handler: handleRedo, description: 'Redo' },
    { key: '?', handler: () => setShortcutsOpen(true), description: 'Shortcuts' },
    { key: 'Escape', handler: () => {
      if (shortcutsOpen) setShortcutsOpen(false);
      else if (sidebarOpen) setSidebarOpen(false);
      else if (isGenerating) abort();
    }, description: 'Close / Cancel' },
  ], [handleCompile, handleExport, handleUndo, handleRedo, shortcutsOpen, sidebarOpen, isGenerating, abort]);

  useHotkeys(hotkeys);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] grain">
      <ToolBar
        onReset={handleReset}
        onExport={handleExport}
        hasShader={!!(shader || editorCode)}
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
      />

      <div className="flex flex-1 min-h-0">
        <SessionSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Left panel: chat + editor */}
        <aside
          style={{ width: panelWidth }}
          className="min-w-[320px] flex flex-col bg-[#0e0e12] relative"
          aria-label="Chat and shader editor"
        >
          {/* Subtle right edge glow */}
          <div className="absolute top-0 right-0 bottom-0 w-px bg-white/[0.04]" aria-hidden="true" />

          {/* Chat area */}
          <div className="flex-1 min-h-0">
            <ChatPanel
              onSubmit={handleSubmit}
              isGenerating={isGenerating}
              onAbort={abort}
            />
          </div>

          {/* Shader editor */}
          <div className="h-70 flex flex-col relative">
            {/* Top separator with gradient */}
            <div className="h-px bg-gradient-to-r from-indigo-500/20 via-white/[0.06] to-transparent" aria-hidden="true" />

            {/* Editor header */}
            <div className="flex items-center justify-between px-3 py-2 bg-[#0c0c10]">
              <div className="flex items-center gap-2.5">
                {(shader || editorCode) && (
                  <span
                    aria-label={
                      compileErrors.length > 0 ? 'Compilation failed'
                        : compileSuccess ? 'Compiled successfully'
                        : 'Not compiled'
                    }
                    className={`w-2 h-2 rounded-full shrink-0 transition-colors duration-300
                      ${compileErrors.length > 0
                        ? 'bg-red-500 shadow-sm shadow-red-500/40'
                        : compileSuccess
                          ? 'bg-emerald-400 animate-pulse-glow'
                          : 'bg-zinc-600'
                      }`}
                  />
                )}
                <span className="text-[11px] font-semibold text-zinc-500 tracking-wider uppercase">
                  Fragment Shader
                </span>
              </div>

              <div className="flex items-center gap-0.5">
                {/* Undo / Redo */}
                <button
                  onClick={handleUndo}
                  disabled={!history.canUndo}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06]
                             disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-150"
                  aria-label="Undo"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                </button>
                <button
                  onClick={handleRedo}
                  disabled={!history.canRedo}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06]
                             disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-150"
                  aria-label="Redo"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                </button>

                {/* Copy shader */}
                <button
                  onClick={handleCopyShader}
                  disabled={!(shader || editorCode)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06]
                             disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-150"
                  aria-label="Copy shader code"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>

                <span className="w-px h-4 bg-white/[0.06] mx-1" aria-hidden="true" />

                {/* Compile button — visible when editing */}
                {!editorReadOnly && (
                  <button
                    onClick={handleCompile}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold
                               text-emerald-400 bg-emerald-500/10 border border-emerald-500/20
                               hover:bg-emerald-500/15 hover:border-emerald-500/30
                               transition-all duration-150"
                    aria-label="Compile shader (Ctrl+S)"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21" />
                    </svg>
                    Compile
                  </button>
                )}

                {/* Lock/Unlock toggle */}
                <button
                  onClick={() => setEditorReadOnly(!editorReadOnly)}
                  aria-label={editorReadOnly ? 'Unlock editor for editing' : 'Lock editor to read-only'}
                  aria-pressed={!editorReadOnly}
                  className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg
                    transition-all duration-150
                    ${editorReadOnly
                      ? 'text-zinc-500 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:text-zinc-300'
                      : 'text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15'
                    }`}
                >
                  {editorReadOnly ? (
                    <svg className="w-3.5 h-3.5" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" />
                    </svg>
                  )}
                  {editorReadOnly ? 'Locked' : 'Editing'}
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 bg-[#0c0c10]">
              <ShaderEditor
                code={editorCode || '// Shader code will appear here after generation...'}
                readOnly={editorReadOnly}
                onChange={editorReadOnly ? undefined : setEditorCode}
              />
            </div>
          </div>
        </aside>

        {/* Drag handle */}
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
          className="group w-1 cursor-col-resize shrink-0 relative
                     bg-transparent hover:bg-indigo-500/20 active:bg-indigo-500/30
                     focus-visible:bg-indigo-500/20 transition-colors duration-150"
        >
          {/* Visible center line */}
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px
                         bg-white/[0.04] group-hover:bg-indigo-500/40 group-active:bg-indigo-400/60
                         transition-colors duration-150" aria-hidden="true" />
          {/* Grab dots indicator */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                         opacity-0 group-hover:opacity-100 transition-opacity duration-150" aria-hidden="true">
            <div className="flex flex-col gap-1">
              <div className="w-1 h-1 rounded-full bg-indigo-400/60" />
              <div className="w-1 h-1 rounded-full bg-indigo-400/60" />
              <div className="w-1 h-1 rounded-full bg-indigo-400/60" />
            </div>
          </div>
        </div>

        {/* Right panel: WebGL canvas */}
        <main className="flex-1 relative bg-black" aria-label="Shader preview">
          <ShaderCanvas
            ref={canvasRef}
            fragmentShader={shader}
            onCompileResult={handleCompileResult}
          />
          <ErrorOverlay errors={compileErrors} />

          {error && (
            <div role="alert"
              className="absolute top-4 left-4 right-4 px-4 py-3 rounded-xl
                         bg-[#1a0a0a]/90 backdrop-blur-md
                         border border-red-500/20
                         text-red-300 text-[13px]
                         shadow-xl shadow-red-900/20 animate-fade-in-up">
              {/* Gradient top line */}
              <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent" aria-hidden="true" />
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 shadow-sm shadow-red-500/40" aria-hidden="true" />
                {error}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Shortcuts modal */}
      <ShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}
