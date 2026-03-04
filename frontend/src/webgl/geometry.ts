/**
 * Fullscreen quad using gl_VertexID (no buffer needed for WebGL2).
 * For WebGL1 fallback, we provide a buffer-based quad.
 */

export function createFullscreenQuadBuffer(gl: WebGL2RenderingContext): WebGLBuffer {
  const buffer = gl.createBuffer();
  if (!buffer) throw new Error('Failed to create vertex buffer');

  // Two triangles covering [-1, 1] in clip space
  const vertices = new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
     1, -1,
     1,  1,
    -1,  1,
  ]);

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  return buffer;
}
