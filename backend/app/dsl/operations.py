"""GLSL code generation templates for each DSL operation.

Each operation function takes a PipelineNode and a context dict mapping
node IDs to their GLSL variable names. It returns:
  - lines: list of GLSL code lines
  - var_name: the GLSL variable name produced by this node
  - var_type: the GLSL type (float, vec2, vec3, vec4)
  - requires: set of helper function names this node needs
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.dsl.schema import PipelineNode

# Type alias for operation results
OpResult = tuple[list[str], str, str, set[str]]


def _ref(ctx: dict, node_id: str | None) -> str:
    """Look up the GLSL variable name for a node reference."""
    if node_id is None:
        return "uv"
    return ctx.get(node_id, {}).get("var", node_id)


def _ref_type(ctx: dict, node_id: str | None) -> str:
    """Look up the GLSL type for a node reference."""
    if node_id is None:
        return "vec2"
    return ctx.get(node_id, {}).get("type", "float")


def _fmt(v: float) -> str:
    """Format a float for GLSL (always with decimal point)."""
    s = f"{v}"
    if "." not in s and "e" not in s.lower():
        s += ".0"
    return s


def _vec3(rgb: list[float]) -> str:
    return f"vec3({_fmt(rgb[0])}, {_fmt(rgb[1])}, {_fmt(rgb[2])})"


def _vec2(xy: list[float]) -> str:
    return f"vec2({_fmt(xy[0])}, {_fmt(xy[1])})"


# ---------------------------------------------------------------------------
# Coordinate operations
# ---------------------------------------------------------------------------

def op_uv_normalize(node: PipelineNode, ctx: dict) -> OpResult:
    var = f"v_{node.id}"
    lines = [f"vec2 {var} = gl_FragCoord.xy / iResolution.xy;"]
    return lines, var, "vec2", set()


def op_rotate(node: PipelineNode, ctx: dict) -> OpResult:
    var = f"v_{node.id}"
    inp = _ref(ctx, node.input)
    angle = _fmt(node.angle or 0.0)
    lines = [
        f"float _ca_{node.id} = cos({angle});",
        f"float _sa_{node.id} = sin({angle});",
        f"vec2 {var} = mat2(_ca_{node.id}, -_sa_{node.id}, _sa_{node.id}, _ca_{node.id}) * ({inp} - 0.5) + 0.5;",
    ]
    return lines, var, "vec2", set()


def op_scale(node: PipelineNode, ctx: dict) -> OpResult:
    var = f"v_{node.id}"
    inp = _ref(ctx, node.input)
    factor = _fmt(node.factor or 1.0)
    lines = [f"vec2 {var} = ({inp} - 0.5) * {factor} + 0.5;"]
    return lines, var, "vec2", set()


def op_translate(node: PipelineNode, ctx: dict) -> OpResult:
    var = f"v_{node.id}"
    inp = _ref(ctx, node.input)
    cx = _fmt(node.center[0]) if node.center else "0.0"
    cy = _fmt(node.center[1]) if node.center else "0.0"
    lines = [f"vec2 {var} = {inp} + vec2({cx}, {cy});"]
    return lines, var, "vec2", set()


# ---------------------------------------------------------------------------
# Noise / procedural
# ---------------------------------------------------------------------------

def op_noise(node: PipelineNode, ctx: dict) -> OpResult:
    var = f"v_{node.id}"
    inp = _ref(ctx, node.input)
    freq = _fmt(node.frequency or 1.0)
    lines = [f"float {var} = _dsl_noise({inp} * {freq});"]
    return lines, var, "float", {"hash", "noise"}


def op_fbm(node: PipelineNode, ctx: dict) -> OpResult:
    var = f"v_{node.id}"
    inp = _ref(ctx, node.input)
    octaves = node.octaves or 4
    freq = _fmt(node.frequency or 1.0)
    lines = [f"float {var} = _dsl_fbm({inp} * {freq}, {octaves});"]
    return lines, var, "float", {"hash", "noise", "fbm"}


def op_voronoi(node: PipelineNode, ctx: dict) -> OpResult:
    var = f"v_{node.id}"
    inp = _ref(ctx, node.input)
    freq = _fmt(node.frequency or 1.0)
    lines = [f"float {var} = _dsl_voronoi({inp} * {freq});"]
    return lines, var, "float", {"hash21", "voronoi"}


# ---------------------------------------------------------------------------
# SDF primitives
# ---------------------------------------------------------------------------

def op_sdf_circle(node: PipelineNode, ctx: dict) -> OpResult:
    var = f"v_{node.id}"
    inp = _ref(ctx, node.input)
    r = _fmt(node.radius or 0.25)
    cx = _fmt(node.center[0]) if node.center else "0.5"
    cy = _fmt(node.center[1]) if node.center else "0.5"
    lines = [f"float {var} = length({inp} - vec2({cx}, {cy})) - {r};"]
    return lines, var, "float", set()


def op_sdf_box(node: PipelineNode, ctx: dict) -> OpResult:
    var = f"v_{node.id}"
    inp = _ref(ctx, node.input)
    sx = _fmt(node.size[0]) if node.size else "0.25"
    sy = _fmt(node.size[1]) if node.size else "0.25"
    cx = _fmt(node.center[0]) if node.center else "0.5"
    cy = _fmt(node.center[1]) if node.center else "0.5"
    lines = [
        f"vec2 _d_{node.id} = abs({inp} - vec2({cx}, {cy})) - vec2({sx}, {sy});",
        f"float {var} = length(max(_d_{node.id}, 0.0)) + min(max(_d_{node.id}.x, _d_{node.id}.y), 0.0);",
    ]
    return lines, var, "float", set()


def op_sdf_line(node: PipelineNode, ctx: dict) -> OpResult:
    var = f"v_{node.id}"
    inp = _ref(ctx, node.input)
    lines = [f"float {var} = abs({inp}.y - 0.5);"]
    return lines, var, "float", set()


def op_sdf_smooth_union(node: PipelineNode, ctx: dict) -> OpResult:
    var = f"v_{node.id}"
    a = _ref(ctx, node.input)
    b = _ref(ctx, node.input_b)
    k = _fmt(node.smoothness or 0.1)
    lines = [
        f"float _h_{node.id} = clamp(0.5 + 0.5 * ({b} - {a}) / {k}, 0.0, 1.0);",
        f"float {var} = mix({b}, {a}, _h_{node.id}) - {k} * _h_{node.id} * (1.0 - _h_{node.id});",
    ]
    return lines, var, "float", set()


# ---------------------------------------------------------------------------
# Domain manipulation
# ---------------------------------------------------------------------------

def op_domain_warp(node: PipelineNode, ctx: dict) -> OpResult:
    var = f"v_{node.id}"
    inp = _ref(ctx, node.input)
    off = _ref(ctx, node.offset)
    strength = _fmt(node.strength or 0.1)
    lines = [f"vec2 {var} = {inp} + {off} * {strength};"]
    return lines, var, "vec2", set()


def op_domain_repeat(node: PipelineNode, ctx: dict) -> OpResult:
    var = f"v_{node.id}"
    inp = _ref(ctx, node.input)
    cell = _fmt(node.cell_size or 1.0)
    lines = [f"vec2 {var} = fract({inp} * {cell});"]
    return lines, var, "vec2", set()


# ---------------------------------------------------------------------------
# Math / blending
# ---------------------------------------------------------------------------

def op_mix(node: PipelineNode, ctx: dict) -> OpResult:
    var = f"v_{node.id}"
    a = _ref(ctx, node.input)
    b = _ref(ctx, node.input_b)
    factor = _fmt(node.factor or 0.5)
    a_type = _ref_type(ctx, node.input)
    b_type = _ref_type(ctx, node.input_b)
    out_type = a_type if a_type in ("vec3", "vec4") else b_type if b_type in ("vec3", "vec4") else a_type
    lines = [f"{out_type} {var} = mix({a}, {b}, {factor});"]
    return lines, var, out_type, set()


def op_smoothstep(node: PipelineNode, ctx: dict) -> OpResult:
    var = f"v_{node.id}"
    inp = _ref(ctx, node.input)
    e0 = _fmt(node.edge0 or 0.0)
    e1 = _fmt(node.edge1 or 1.0)
    lines = [f"float {var} = smoothstep({e0}, {e1}, {inp});"]
    return lines, var, "float", set()


def op_step(node: PipelineNode, ctx: dict) -> OpResult:
    var = f"v_{node.id}"
    inp = _ref(ctx, node.input)
    e0 = _fmt(node.edge0 or 0.5)
    lines = [f"float {var} = step({e0}, {inp});"]
    return lines, var, "float", set()


def op_abs(node: PipelineNode, ctx: dict) -> OpResult:
    var = f"v_{node.id}"
    inp = _ref(ctx, node.input)
    in_type = _ref_type(ctx, node.input)
    lines = [f"{in_type} {var} = abs({inp});"]
    return lines, var, in_type, set()


def op_sin(node: PipelineNode, ctx: dict) -> OpResult:
    var = f"v_{node.id}"
    inp = _ref(ctx, node.input)
    freq = _fmt(node.frequency or 1.0)
    lines = [f"float {var} = sin({inp} * {freq});"]
    return lines, var, "float", set()


def op_pow(node: PipelineNode, ctx: dict) -> OpResult:
    var = f"v_{node.id}"
    inp = _ref(ctx, node.input)
    factor = _fmt(node.factor or 2.0)
    lines = [f"float {var} = pow({inp}, {factor});"]
    return lines, var, "float", set()


def op_add(node: PipelineNode, ctx: dict) -> OpResult:
    var = f"v_{node.id}"
    a = _ref(ctx, node.input)
    b = _ref(ctx, node.input_b)
    a_type = _ref_type(ctx, node.input)
    lines = [f"{a_type} {var} = {a} + {b};"]
    return lines, var, a_type, set()


def op_multiply(node: PipelineNode, ctx: dict) -> OpResult:
    var = f"v_{node.id}"
    a = _ref(ctx, node.input)
    b = _ref(ctx, node.input_b)
    a_type = _ref_type(ctx, node.input)
    lines = [f"{a_type} {var} = {a} * {b};"]
    return lines, var, a_type, set()


def op_subtract(node: PipelineNode, ctx: dict) -> OpResult:
    var = f"v_{node.id}"
    a = _ref(ctx, node.input)
    b = _ref(ctx, node.input_b)
    a_type = _ref_type(ctx, node.input)
    lines = [f"{a_type} {var} = {a} - {b};"]
    return lines, var, a_type, set()


# ---------------------------------------------------------------------------
# Color operations
# ---------------------------------------------------------------------------

def op_palette_map(node: PipelineNode, ctx: dict) -> OpResult:
    var = f"v_{node.id}"
    inp = _ref(ctx, node.input)
    lines = [f"vec3 {var} = _dsl_palette({inp});"]
    return lines, var, "vec3", {"palette"}


def op_color_constant(node: PipelineNode, ctx: dict) -> OpResult:
    var = f"v_{node.id}"
    c = node.color or [1.0, 1.0, 1.0]
    lines = [f"vec3 {var} = {_vec3(c)};"]
    return lines, var, "vec3", set()


def op_gradient(node: PipelineNode, ctx: dict) -> OpResult:
    var = f"v_{node.id}"
    inp = _ref(ctx, node.input)
    ca = _vec3(node.color_a or [0.0, 0.0, 0.0])
    cb = _vec3(node.color_b or [1.0, 1.0, 1.0])
    lines = [f"vec3 {var} = mix({ca}, {cb}, clamp({inp}, 0.0, 1.0));"]
    return lines, var, "vec3", set()


def op_hsv_to_rgb(node: PipelineNode, ctx: dict) -> OpResult:
    var = f"v_{node.id}"
    inp = _ref(ctx, node.input)
    lines = [f"vec3 {var} = _dsl_hsv2rgb({inp});"]
    return lines, var, "vec3", {"hsv2rgb"}


# ---------------------------------------------------------------------------
# Animation
# ---------------------------------------------------------------------------

def op_time_animate(node: PipelineNode, ctx: dict) -> OpResult:
    var = f"v_{node.id}"
    inp = _ref(ctx, node.input)
    spd = _fmt(node.speed or 1.0)
    in_type = _ref_type(ctx, node.input)
    if in_type == "vec2":
        lines = [f"vec2 {var} = {inp} + vec2(iTime * {spd});"]
    else:
        lines = [f"float {var} = {inp} + iTime * {spd};"]
    return lines, var, in_type, set()


def op_mouse_interact(node: PipelineNode, ctx: dict) -> OpResult:
    var = f"v_{node.id}"
    inp = _ref(ctx, node.input)
    strength = _fmt(node.strength or 0.1)
    lines = [
        f"vec2 _mouse_{node.id} = iMouse.xy / iResolution.xy;",
        f"vec2 {var} = {inp} + (_mouse_{node.id} - 0.5) * {strength};",
    ]
    return lines, var, "vec2", set()


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------

def op_output(node: PipelineNode, ctx: dict) -> OpResult:
    inp = _ref(ctx, node.input)
    in_type = _ref_type(ctx, node.input)
    if in_type == "float":
        lines = [f"fragColor = vec4(vec3({inp}), 1.0);"]
    elif in_type == "vec2":
        lines = [f"fragColor = vec4({inp}, 0.0, 1.0);"]
    elif in_type == "vec3":
        lines = [f"fragColor = vec4({inp}, 1.0);"]
    else:
        lines = [f"fragColor = {inp};"]
    return lines, "fragColor", "vec4", set()


# ---------------------------------------------------------------------------
# Operation dispatch table
# ---------------------------------------------------------------------------

OP_DISPATCH: dict[str, callable] = {
    "uv_normalize": op_uv_normalize,
    "rotate": op_rotate,
    "scale": op_scale,
    "translate": op_translate,
    "noise": op_noise,
    "fbm": op_fbm,
    "voronoi": op_voronoi,
    "sdf_circle": op_sdf_circle,
    "sdf_box": op_sdf_box,
    "sdf_line": op_sdf_line,
    "sdf_smooth_union": op_sdf_smooth_union,
    "domain_warp": op_domain_warp,
    "domain_repeat": op_domain_repeat,
    "mix_op": op_mix,
    "smoothstep_op": op_smoothstep,
    "step_op": op_step,
    "abs_op": op_abs,
    "sin_op": op_sin,
    "pow_op": op_pow,
    "add": op_add,
    "multiply": op_multiply,
    "subtract": op_subtract,
    "palette_map": op_palette_map,
    "color_constant": op_color_constant,
    "gradient": op_gradient,
    "hsv_to_rgb": op_hsv_to_rgb,
    "time_animate": op_time_animate,
    "mouse_interact": op_mouse_interact,
    "output": op_output,
}
