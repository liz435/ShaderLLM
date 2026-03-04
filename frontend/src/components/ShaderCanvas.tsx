import { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { ShaderRenderer } from '../webgl/renderer';
import CanvasControls from './CanvasControls';
import type { CompileResult } from '../types';

interface ShaderCanvasProps {
  fragmentShader: string | null;
  vertexShader?: string | null;
  onCompileResult?: (result: CompileResult) => void;
}

export interface ShaderCanvasHandle {
  compile: (code: string) => CompileResult | null;
  renderer: ShaderRenderer | null;
}

const ShaderCanvas = forwardRef<ShaderCanvasHandle, ShaderCanvasProps>(
  function ShaderCanvas({ fragmentShader, vertexShader, onCompileResult }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<ShaderRenderer | null>(null);

    // Initialize renderer once
    useEffect(() => {
      if (!canvasRef.current) return;
      const renderer = new ShaderRenderer(canvasRef.current);
      rendererRef.current = renderer;
      renderer.compileShader(renderer.getDefaultFragmentShader());
      renderer.startRenderLoop();
      return () => {
        renderer.destroy();
        rendererRef.current = null;
      };
    }, []);

    // Recompile when shader source changes
    const compileSource = useCallback((code: string) => {
      if (!rendererRef.current) return null;
      const result = rendererRef.current.compileShader(code, vertexShader || undefined);
      onCompileResult?.(result);
      return result;
    }, [vertexShader, onCompileResult]);

    useEffect(() => {
      if (fragmentShader) compileSource(fragmentShader);
    }, [fragmentShader, compileSource]);

    // Expose imperative handle for parent to trigger manual compiles
    useImperativeHandle(ref, () => ({
      compile: compileSource,
      renderer: rendererRef.current,
    }), [compileSource]);

    return (
      <div className="relative w-full h-full">
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          style={{ imageRendering: 'auto' }}
          tabIndex={-1}
        />
        <CanvasControls renderer={rendererRef.current} />
      </div>
    );
  }
);

export default ShaderCanvas;
