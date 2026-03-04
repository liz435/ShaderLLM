from app.tools.glsl_validator import validate_glsl


VALID_FRAGMENT = """#version 300 es
precision highp float;
uniform float iTime;
uniform vec2 iResolution;
out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution;
    fragColor = vec4(uv, 0.5 + 0.5 * sin(iTime), 1.0);
}
"""

MISSING_MAIN = """#version 300 es
precision highp float;
out vec4 fragColor;
"""

SYNTAX_ERROR = """#version 300 es
precision highp float;
out vec4 fragColor;
void main() {
    fragColor = vec4(1.0, 0.0, 0.0, 1.0)
}
"""

UNDECLARED_VAR = """#version 300 es
precision highp float;
out vec4 fragColor;
void main() {
    fragColor = vec4(undeclaredVar, 0.0, 0.0, 1.0);
}
"""

TYPE_MISMATCH = """#version 300 es
precision highp float;
out vec4 fragColor;
void main() {
    float x = vec3(1.0);
    fragColor = vec4(x, 0.0, 0.0, 1.0);
}
"""


def test_valid_shader():
    result = validate_glsl(VALID_FRAGMENT, "fragment")
    assert result.valid is True
    assert len(result.errors) == 0


def test_missing_main():
    result = validate_glsl(MISSING_MAIN, "fragment")
    assert result.valid is False
    assert any("entry point" in e.message.lower() or "main" in e.message.lower() for e in result.errors)


def test_syntax_error_missing_semicolon():
    result = validate_glsl(SYNTAX_ERROR, "fragment")
    assert result.valid is False
    assert len(result.errors) > 0


def test_undeclared_variable():
    result = validate_glsl(UNDECLARED_VAR, "fragment")
    assert result.valid is False
    assert len(result.errors) > 0


def test_type_mismatch():
    result = validate_glsl(TYPE_MISMATCH, "fragment")
    assert result.valid is False
    assert len(result.errors) > 0
