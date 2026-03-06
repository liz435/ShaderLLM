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
import { getChangedLines } from './utils/lineDiff';
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

  const [panelWidth, setPanelWidth] = useState(480);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const canvasRef = useRef<ShaderCanvasHandle>(null);

  useEffect(() => {
    if (shader) {
      setEditorCode(shader);
      history.push(shader);
    }
  }, [shader]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute diff between previous and current shader
  const changedLines = useMemo(() => {
    if (!history.previous || !editorCode) return undefined;
    const lines = getChangedLines(history.previous, editorCode);
    return lines.size > 0 ? lines : undefined;
  }, [history.previous, editorCode]);

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

  const handleRevert = useCallback(() => {
    const prev = history.undo();
    if (prev !== null) {
      setEditorCode(prev);
      const result = canvasRef.current?.compile(prev);
      if (result) handleCompileResult(result);
      toast('Reverted to previous version', 'success');
    }
  }, [history, handleCompileResult, toast]);

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

  const iconBtn = `p-1.5 rounded text-zinc-600 hover:text-zinc-300
                   disabled:opacity-20 disabled:cursor-not-allowed
                   transition-colors duration-150`;

  return (
    <div className="flex flex-col h-full bg-[#09090b]">
      <ToolBar
        onReset={handleReset}
        onExport={handleExport}
        hasShader={!!(shader || editorCode)}
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
      />

      <div className="flex flex-1 min-h-0">
        <SessionSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Left: chat + editor */}
        <aside
          style={{ width: panelWidth }}
          className="min-w-[320px] flex flex-col bg-[#0a0a0c] relative"
          aria-label="Chat and shader editor"
        >

          <div className="flex-1 min-h-0">
            <ChatPanel
              onSubmit={handleSubmit}
              isGenerating={isGenerating}
              onAbort={abort}
            />
          </div>

          {/* Editor */}
          <div className="h-64 flex flex-col">
            <div className="h-px bg-white/[0.06]" aria-hidden="true" />

            {/* Editor bar */}
            <div className="flex items-center justify-between px-3 py-2 bg-[#0c0c0e]">
              <div className="flex items-center gap-2">
                {(shader || editorCode) && (
                  <span
                    aria-label={
                      compileErrors.length > 0 ? 'Compilation failed'
                        : compileSuccess ? 'Compiled successfully'
                        : 'Not compiled'
                    }
                    className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors duration-300
                      ${compileErrors.length > 0
                        ? 'bg-red-500'
                        : compileSuccess
                          ? 'bg-emerald-400 animate-pulse-glow'
                          : 'bg-zinc-700'
                      }`}
                  />
                )}
                <span className="text-[11px] font-medium text-zinc-500 tracking-wider uppercase">
                  Fragment
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button onClick={handleUndo} disabled={!history.canUndo} className={iconBtn} aria-label="Undo">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                </button>
                <button onClick={handleRedo} disabled={!history.canRedo} className={iconBtn} aria-label="Redo">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                </button>

                {/* Revert to previous version */}
                {history.canUndo && changedLines && (
                  <button
                    onClick={handleRevert}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium
                               text-amber-400/80 hover:text-amber-300
                               transition-colors duration-150"
                    aria-label="Revert to previous version"
                    title="Revert to previous version"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                    </svg>
                    Revert
                  </button>
                )}

                <button onClick={handleCopyShader} disabled={!(shader || editorCode)} className={iconBtn} aria-label="Copy shader">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>

                {!editorReadOnly && (
                  <>
                    <span className="w-px h-3 bg-white/[0.06] mx-1" aria-hidden="true" />
                    <button
                      onClick={handleCompile}
                      className="px-2 py-0.5 rounded text-[11px] font-medium
                                 text-emerald-400 hover:text-emerald-300
                                 transition-colors duration-150"
                      aria-label="Compile shader"
                    >
                      Run
                    </button>
                  </>
                )}

                <span className="w-px h-3 bg-white/[0.06] mx-1" aria-hidden="true" />

                <button
                  onClick={() => setEditorReadOnly(!editorReadOnly)}
                  aria-label={editorReadOnly ? 'Unlock editor' : 'Lock editor'}
                  aria-pressed={!editorReadOnly}
                  className={`text-[11px] font-medium px-2 py-0.5 rounded
                    transition-colors duration-150
                    ${editorReadOnly
                      ? 'text-zinc-600 hover:text-zinc-400'
                      : 'text-emerald-400/80'
                    }`}
                >
                  {editorReadOnly ? 'Locked' : 'Editing'}
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 bg-[#09090b]">
              <ShaderEditor
                code={editorCode || '// Shader code appears here after generation...'}
                readOnly={editorReadOnly}
                onChange={editorReadOnly ? undefined : setEditorCode}
                changedLines={changedLines}
              />
            </div>
          </div>
        </aside>

        {/* Drag handle */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panels"
          aria-valuenow={panelWidth}
          aria-valuemin={320}
          aria-valuemax={typeof window !== 'undefined' ? window.innerWidth - 400 : 1000}
          tabIndex={0}
          onMouseDown={handleDragStart}
          onKeyDown={handleDragKeyDown}
          className="group w-3 cursor-col-resize shrink-0 relative
                     flex items-center justify-center"
        >
          <div className="w-px h-full bg-white/[0.06] group-hover:bg-white/[0.15]
                          group-active:bg-white/[0.25] transition-colors duration-150" />
        </div>

        {/* Canvas */}
        <main className="flex-1 relative bg-black" aria-label="Shader preview">
          <ShaderCanvas
            ref={canvasRef}
            fragmentShader={shader}
            onCompileResult={handleCompileResult}
          />
          <ErrorOverlay errors={compileErrors} />

          {error && (
            <div role="alert"
              className="absolute top-3 left-3 right-3 px-3 py-2.5 rounded-lg
                         bg-red-950/80 backdrop-blur-sm
                         border border-red-500/15
                         text-red-400 text-[12px]
                         animate-fade-in">
              {error}
            </div>
          )}
        </main>
      </div>

      <ShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}
