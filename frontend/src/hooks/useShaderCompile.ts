import { useCallback, useRef } from 'react';
import { ShaderRenderer } from '../webgl/renderer';
import type { CompileResult } from '../types';

/**
 * Hook that manages shader compilation on the GPU.
 * Only compiles when the shader looks complete (has void main).
 */
export function useShaderCompile(rendererRef: React.RefObject<ShaderRenderer | null>) {
  const lastCompiledRef = useRef<string>('');

  const compile = useCallback(
    (shaderCode: string | null): CompileResult | null => {
      if (!rendererRef.current || !shaderCode) return null;

      // Don't compile partial shaders
      if (!shaderCode.includes('void main')) return null;

      // Don't recompile the same code
      if (shaderCode === lastCompiledRef.current) return null;

      lastCompiledRef.current = shaderCode;
      return rendererRef.current.compileShader(shaderCode);
    },
    [rendererRef]
  );

  return { compile };
}
