"""Compile a ShaderDSL specification into a GLSL ES 3.00 fragment shader."""

from __future__ import annotations

from pydantic import BaseModel

from app.dsl.operations import OP_DISPATCH
from app.dsl.schema import ShaderDSL


class CompileResult(BaseModel):
    glsl: str
    warnings: list[str] = []


# ---------------------------------------------------------------------------
# GLSL helper function library (included only when referenced)
# ---------------------------------------------------------------------------

_GLSL_HELPERS: dict[str, str] = {
    "hash": """
float _dsl_hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
""",
    "hash21": """
vec2 _dsl_hash21(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
}
""",
    "noise": """
float _dsl_noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = _dsl_hash(i);
    float b = _dsl_hash(i + vec2(1.0, 0.0));
    float c = _dsl_hash(i + vec2(0.0, 1.0));
    float d = _dsl_hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
""",
    "fbm": """
float _dsl_fbm(vec2 p, int octaves) {
    float value = 0.0;
    float amp = 0.5;
    for (int i = 0; i < octaves; i++) {
        value += amp * _dsl_noise(p);
        p *= 2.0;
        amp *= 0.5;
    }
    return value;
}
""",
    "voronoi": """
float _dsl_voronoi(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float minDist = 1.0;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 point = _dsl_hash21(i + neighbor);
            vec2 diff = neighbor + point - f;
            minDist = min(minDist, length(diff));
        }
    }
    return minDist;
}
""",
    "palette": """
vec3 _dsl_palette(float t) {
    // Default cosine palette — overridden when user provides palette colors
    vec3 a = vec3(0.5);
    vec3 b = vec3(0.5);
    vec3 c = vec3(1.0);
    vec3 d = vec3(0.0, 0.33, 0.67);
    return a + b * cos(6.28318 * (c * t + d));
}
""",
    "hsv2rgb": """
vec3 _dsl_hsv2rgb(vec3 c) {
    vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0);
    return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
}
""",
}

# Dependency ordering for helpers
_HELPER_DEPS: dict[str, list[str]] = {
    "noise": ["hash"],
    "fbm": ["hash", "noise"],
    "voronoi": ["hash21"],
    "palette": [],
    "hash": [],
    "hash21": [],
    "hsv2rgb": [],
}


def _hex_to_vec3(hex_color: str) -> str:
    """Convert '#rrggbb' to 'vec3(r, g, b)' with normalized floats."""
    h = hex_color.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    r = int(h[0:2], 16) / 255.0
    g = int(h[2:4], 16) / 255.0
    b = int(h[4:6], 16) / 255.0
    return f"vec3({r:.4f}, {g:.4f}, {b:.4f})"


def _build_custom_palette(colors: list[str]) -> str:
    """Generate a GLSL palette function from a list of hex colors."""
    n = len(colors)
    if n == 0:
        return _GLSL_HELPERS["palette"]

    lines = [
        "vec3 _dsl_palette(float t) {",
        f"    t = clamp(t, 0.0, 1.0) * {n - 1}.0;",
        "    int idx = int(floor(t));",
        "    float f = fract(t);",
    ]
    # Declare color array
    for i, c in enumerate(colors):
        lines.append(f"    vec3 c{i} = {_hex_to_vec3(c)};")

    # Generate interpolation chain
    if n == 1:
        lines.append(f"    return c0;")
    else:
        lines.append(f"    if (idx >= {n - 1}) return c{n - 1};")
        for i in range(n - 1):
            cond = f"if (idx == {i})" if i < n - 2 else ""
            if cond:
                lines.append(f"    {cond} return mix(c{i}, c{i + 1}, f);")
            else:
                lines.append(f"    return mix(c{i}, c{i + 1}, f);")

    lines.append("}")
    return "\n".join(lines) + "\n"


def _resolve_helpers(required: set[str], dsl: ShaderDSL) -> str:
    """Build the helper function block, respecting dependency order."""
    # Expand dependencies
    all_needed: set[str] = set()
    stack = list(required)
    while stack:
        name = stack.pop()
        if name not in all_needed:
            all_needed.add(name)
            stack.extend(_HELPER_DEPS.get(name, []))

    # Topological order
    ordered = []
    for name in ["hash", "hash21", "noise", "fbm", "voronoi", "hsv2rgb", "palette"]:
        if name in all_needed:
            ordered.append(name)

    parts = []
    for name in ordered:
        if name == "palette":
            # Find custom palette colors from any palette_map node's param reference
            palette_colors = None
            for node in dsl.pipeline:
                if node.op == "palette_map" and node.palette:
                    candidate = dsl.params.get(node.palette, [])
                    if isinstance(candidate, list) and all(isinstance(c, str) for c in candidate):
                        palette_colors = candidate
                        break
            if palette_colors:
                parts.append(_build_custom_palette(palette_colors))
            else:
                parts.append(_GLSL_HELPERS[name])
        else:
            parts.append(_GLSL_HELPERS[name])

    return "\n".join(parts)


def compile_dsl(dsl: ShaderDSL) -> CompileResult:
    """Compile a ShaderDSL specification into GLSL ES 3.00 source code."""
    warnings: list[str] = []

    # Context: maps node ID -> {"var": glsl_var_name, "type": glsl_type}
    ctx: dict[str, dict[str, str]] = {}
    all_required_helpers: set[str] = set()
    body_lines: list[str] = []

    for node in dsl.pipeline:
        handler = OP_DISPATCH.get(node.op)
        if handler is None:
            warnings.append(f"Unknown operation '{node.op}' in node '{node.id}', skipped")
            continue

        lines, var_name, var_type, requires = handler(node, ctx)
        ctx[node.id] = {"var": var_name, "type": var_type}
        all_required_helpers |= requires
        body_lines.extend(lines)

    # Build helper functions
    helpers = _resolve_helpers(all_required_helpers, dsl)

    # Assemble full shader
    glsl_parts = [
        "#version 300 es",
        "precision highp float;",
        "",
        "uniform float iTime;",
        "uniform vec2 iResolution;",
        "uniform vec4 iMouse;",
        "uniform int iFrame;",
        "",
        "out vec4 fragColor;",
    ]

    if helpers.strip():
        glsl_parts.append("")
        glsl_parts.append("// --- DSL helper functions ---")
        glsl_parts.append(helpers)

    glsl_parts.append("")
    glsl_parts.append("void main() {")
    for line in body_lines:
        glsl_parts.append(f"    {line}")
    glsl_parts.append("}")
    glsl_parts.append("")

    return CompileResult(glsl="\n".join(glsl_parts), warnings=warnings)
