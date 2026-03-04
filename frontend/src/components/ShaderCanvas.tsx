import { useRef, useEffect, useCallback } from 'react';
import { ShaderRenderer } from '../webgl/renderer';
import type { CompileResult } from '../types';

interface ShaderCanvasProps {
  fragmentShader: string | null;
  vertexShader?: string | null;
  onCompileResult?: (result: CompileResult) => void;
}

export default function ShaderCanvas({
  fragmentShader,
  vertexShader,
  onCompileResult,
}: ShaderCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ShaderRenderer | null>(null);

  // Initialize renderer once
  useEffect(() => {
    if (!canvasRef.current) return;
    const renderer = new ShaderRenderer(canvasRef.current);
    rendererRef.current = renderer;

    // Compile default shader to show something immediately
    renderer.compileShader(renderer.getDefaultFragmentShader());
    renderer.startRenderLoop();

    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
  }, []);

  // Recompile when shader source changes
  const compile = useCallback(() => {
    if (!rendererRef.current || !fragmentShader) return;
    const result = rendererRef.current.compileShader(
      fragmentShader,
      vertexShader || undefined
    );
    onCompileResult?.(result);
  }, [fragmentShader, vertexShader, onCompileResult]);

  useEffect(() => {
    compile();
  }, [compile]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      style={{ imageRendering: 'auto' }}
    />
  );
}
