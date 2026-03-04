import type { ShaderError, CompileResult } from '../types';
import { setStandardUniforms } from './uniforms';
import { createFullscreenQuadBuffer } from './geometry';

const DEFAULT_VERTEX_SHADER = `#version 300 es
precision highp float;

layout(location = 0) in vec2 aPosition;

void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const DEFAULT_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform float iTime;
uniform vec2 iResolution;

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution;
    fragColor = vec4(uv, 0.5 + 0.5 * sin(iTime), 1.0);
}
`;

function parseShaderLog(log: string, stage: 'vertex' | 'fragment' | 'link'): ShaderError[] {
  if (!log) return [];
  const errors: ShaderError[] = [];
  const lineRegex = /(?:ERROR|WARNING):\s*\d+:(\d+):\s*(.+)/g;
  let match;
  while ((match = lineRegex.exec(log)) !== null) {
    errors.push({
      line: parseInt(match[1], 10),
      message: match[2].trim(),
      severity: log.includes('WARNING') ? 'warning' : 'error',
      stage,
    });
  }
  if (errors.length === 0 && log.trim()) {
    errors.push({ line: 0, message: log.trim(), severity: 'error', stage });
  }
  return errors;
}

export class ShaderRenderer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram | null = null;
  private quadBuffer: WebGLBuffer;
  private startTime: number;
  private frameCount = 0;
  private animFrameId = 0;
  private mouse: [number, number, number, number] = [0, 0, 0, 0];
  private running = false;
  private paused = false;
  private pausedTime = 0;
  private pauseOffset = 0;
  private resolutionScale = 1;

  // FPS tracking
  private lastFrameTime = 0;
  private fpsAccumulator = 0;
  private fpsFrameCount = 0;
  private currentFps = 0;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: true });
    if (!gl) throw new Error('WebGL2 is not supported');
    this.gl = gl;
    this.startTime = performance.now() / 1000;
    this.quadBuffer = createFullscreenQuadBuffer(gl);

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse[0] = e.clientX - rect.left;
      this.mouse[1] = rect.height - (e.clientY - rect.top);
    });
    canvas.addEventListener('mousedown', () => { this.mouse[2] = 1; });
    canvas.addEventListener('mouseup', () => { this.mouse[2] = 0; });
  }

  compileShader(fragmentSrc: string, vertexSrc?: string): CompileResult {
    const gl = this.gl;
    const allErrors: ShaderError[] = [];

    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, vertexSrc || DEFAULT_VERTEX_SHADER);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(vs) || '';
      allErrors.push(...parseShaderLog(log, 'vertex'));
      gl.deleteShader(vs);
      return { success: false, errors: allErrors };
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, fragmentSrc);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(fs) || '';
      allErrors.push(...parseShaderLog(log, 'fragment'));
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return { success: false, errors: allErrors };
    }

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    gl.deleteShader(vs);
    gl.deleteShader(fs);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program) || '';
      allErrors.push(...parseShaderLog(log, 'link'));
      gl.deleteProgram(program);
      return { success: false, errors: allErrors };
    }

    if (this.program) gl.deleteProgram(this.program);
    this.program = program;

    const posLoc = gl.getAttribLocation(program, 'aPosition');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    return { success: true, errors: [] };
  }

  startRenderLoop(): void {
    if (this.running) return;
    this.running = true;
    this.startTime = performance.now() / 1000;
    this.pauseOffset = 0;
    this.frameCount = 0;
    this.lastFrameTime = performance.now();

    const render = () => {
      if (!this.running) return;
      this.animFrameId = requestAnimationFrame(render);

      // FPS calculation
      const now = performance.now();
      const delta = now - this.lastFrameTime;
      this.lastFrameTime = now;
      this.fpsAccumulator += delta;
      this.fpsFrameCount++;
      if (this.fpsAccumulator >= 500) {
        this.currentFps = Math.round((this.fpsFrameCount / this.fpsAccumulator) * 1000);
        this.fpsAccumulator = 0;
        this.fpsFrameCount = 0;
      }

      if (this.paused) return;

      const gl = this.gl;
      const canvas = gl.canvas as HTMLCanvasElement;

      const dpr = (window.devicePixelRatio || 1) * this.resolutionScale;
      const displayW = Math.floor(canvas.clientWidth * dpr);
      const displayH = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== displayW || canvas.height !== displayH) {
        canvas.width = displayW;
        canvas.height = displayH;
        gl.viewport(0, 0, displayW, displayH);
      }

      if (!this.program) return;

      gl.useProgram(this.program);

      setStandardUniforms(gl, this.program, {
        iTime: performance.now() / 1000 - this.startTime - this.pauseOffset,
        iResolution: [canvas.width, canvas.height],
        iMouse: this.mouse,
        iFrame: this.frameCount,
      });

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      this.frameCount++;
    };

    render();
  }

  // --- Playback controls ---

  togglePause(): boolean {
    if (this.paused) {
      this.pauseOffset += performance.now() / 1000 - this.pausedTime;
      this.paused = false;
    } else {
      this.pausedTime = performance.now() / 1000;
      this.paused = true;
    }
    return this.paused;
  }

  isPaused(): boolean {
    return this.paused;
  }

  resetTime(): void {
    this.startTime = performance.now() / 1000;
    this.pauseOffset = 0;
    this.frameCount = 0;
    if (this.paused) {
      this.pausedTime = performance.now() / 1000;
    }
  }

  getElapsedTime(): number {
    if (this.paused) {
      return this.pausedTime - this.startTime - this.pauseOffset;
    }
    return performance.now() / 1000 - this.startTime - this.pauseOffset;
  }

  getFps(): number {
    return this.currentFps;
  }

  // --- Resolution ---

  setResolutionScale(scale: number): void {
    this.resolutionScale = scale;
  }

  getResolutionScale(): number {
    return this.resolutionScale;
  }

  // --- Screenshot ---

  screenshot(): void {
    const canvas = this.gl.canvas as HTMLCanvasElement;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `shader-${date}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  // --- Fullscreen ---

  toggleFullscreen(): void {
    const canvas = this.gl.canvas as HTMLCanvasElement;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      canvas.requestFullscreen();
    }
  }

  // --- Lifecycle ---

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.animFrameId);
  }

  destroy(): void {
    this.stop();
    const gl = this.gl;
    if (this.program) gl.deleteProgram(this.program);
    gl.deleteBuffer(this.quadBuffer);
  }

  getDefaultFragmentShader(): string {
    return DEFAULT_FRAGMENT_SHADER;
  }
}
