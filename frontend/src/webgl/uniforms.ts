/**
 * Standard Shadertoy-compatible uniforms.
 * The LLM's training data uses these conventions extensively.
 */

export interface ShaderUniforms {
  iTime: number;
  iResolution: [number, number];
  iMouse: [number, number, number, number];
  iFrame: number;
}

export function setStandardUniforms(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  uniforms: ShaderUniforms
): void {
  const timeLoc = gl.getUniformLocation(program, 'iTime');
  if (timeLoc) gl.uniform1f(timeLoc, uniforms.iTime);

  const resLoc = gl.getUniformLocation(program, 'iResolution');
  if (resLoc) gl.uniform2f(resLoc, uniforms.iResolution[0], uniforms.iResolution[1]);

  const mouseLoc = gl.getUniformLocation(program, 'iMouse');
  if (mouseLoc) gl.uniform4f(mouseLoc, uniforms.iMouse[0], uniforms.iMouse[1], uniforms.iMouse[2], uniforms.iMouse[3]);

  const frameLoc = gl.getUniformLocation(program, 'iFrame');
  if (frameLoc) gl.uniform1i(frameLoc, uniforms.iFrame);
}
