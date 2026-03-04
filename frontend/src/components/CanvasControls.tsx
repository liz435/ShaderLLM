import { useState, useEffect, useCallback } from 'react';
import type { ShaderRenderer } from '../webgl/renderer';

interface CanvasControlsProps {
  renderer: ShaderRenderer | null;
  onScreenshot?: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms}`;
}

export default function CanvasControls({ renderer }: CanvasControlsProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [time, setTime] = useState(0);
  const [fps, setFps] = useState(0);
  const [showFps, setShowFps] = useState(true);
  const [resScale, setResScale] = useState(1);

  useEffect(() => {
    if (!renderer) return;
    const id = setInterval(() => {
      setTime(renderer.getElapsedTime());
      setFps(renderer.getFps());
    }, 100);
    return () => clearInterval(id);
  }, [renderer]);

  const togglePause = useCallback(() => {
    if (!renderer) return;
    const paused = renderer.togglePause();
    setIsPaused(paused);
  }, [renderer]);

  const resetTime = useCallback(() => {
    if (!renderer) return;
    renderer.resetTime();
    setTime(0);
  }, [renderer]);

  const screenshot = useCallback(() => {
    renderer?.screenshot();
  }, [renderer]);

  const toggleFullscreen = useCallback(() => {
    renderer?.toggleFullscreen();
  }, [renderer]);

  const cycleResolution = useCallback(() => {
    if (!renderer) return;
    const scales = [0.5, 1, 2];
    const idx = scales.indexOf(resScale);
    const next = scales[(idx + 1) % scales.length];
    renderer.setResolutionScale(next);
    setResScale(next);
  }, [renderer, resScale]);

  if (!renderer) return null;

  const btnClass = `p-1.5 rounded-lg text-zinc-400 hover:text-white
                    hover:bg-white/10 active:bg-white/15
                    transition-all duration-150`;

  return (
    <>
      {/* FPS counter — top left */}
      {showFps && (
        <button
          onClick={() => setShowFps(false)}
          className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-lg
                     bg-black/60 backdrop-blur-md border border-white/[0.06]
                     text-[11px] font-mono text-zinc-400
                     hover:text-zinc-200 hover:border-white/[0.1]
                     transition-all duration-150"
          aria-label={`${fps} frames per second. Click to hide.`}
        >
          {fps} <span className="text-zinc-600">fps</span>
        </button>
      )}

      {/* Controls bar — bottom right */}
      <div
        className="absolute bottom-3 right-3 z-10 flex items-center gap-0.5
                   bg-black/60 backdrop-blur-md border border-white/[0.06]
                   rounded-xl px-2 py-1.5"
        role="toolbar"
        aria-label="Canvas controls"
      >
        {/* Time display */}
        <span className="text-[11px] font-mono text-zinc-500 px-1.5 min-w-[56px]" aria-label={`Elapsed time: ${formatTime(time)}`}>
          {formatTime(time)}
        </span>

        <span className="w-px h-4 bg-white/[0.08] mx-0.5" aria-hidden="true" />

        {/* Play/Pause */}
        <button onClick={togglePause} className={btnClass} aria-label={isPaused ? 'Resume' : 'Pause'}>
          {isPaused ? (
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21" /></svg>
          ) : (
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
          )}
        </button>

        {/* Reset time */}
        <button onClick={resetTime} className={btnClass} aria-label="Reset time to zero">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        </button>

        <span className="w-px h-4 bg-white/[0.08] mx-0.5" aria-hidden="true" />

        {/* Resolution scale */}
        <button onClick={cycleResolution} className={`${btnClass} text-[11px] font-mono min-w-[28px]`} aria-label={`Resolution scale: ${resScale}x. Click to cycle.`}>
          {resScale}x
        </button>

        {/* Screenshot */}
        <button onClick={screenshot} className={btnClass} aria-label="Take screenshot">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </button>

        {/* Fullscreen */}
        <button onClick={toggleFullscreen} className={btnClass} aria-label="Toggle fullscreen">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        </button>

        {/* Toggle FPS */}
        {!showFps && (
          <button onClick={() => setShowFps(true)} className={`${btnClass} text-[11px] font-mono`} aria-label="Show FPS counter">
            fps
          </button>
        )}
      </div>
    </>
  );
}
