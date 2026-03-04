import re


def extract_glsl(text: str) -> str | None:
    """Extract GLSL code from markdown fences in LLM response.

    Handles ```glsl, ```c, bare ``` blocks, and raw GLSL without fences.
    """
    patterns = [
        r"```glsl\s*\n(.*?)```",
        r"```c\s*\n(.*?)```",
        r"```\s*\n(.*?)```",
    ]
    for pattern in patterns:
        m = re.search(pattern, text, re.DOTALL)
        if m:
            return m.group(1).strip()

    # Fallback: raw GLSL without fences
    if "#version" in text or "void main" in text:
        # Try to isolate just the shader portion
        lines = text.splitlines()
        start = next((i for i, l in enumerate(lines) if "#version" in l or "precision" in l), 0)
        return "\n".join(lines[start:]).strip()

    return None


def extract_reasoning(text: str) -> str | None:
    """Extract <reasoning>...</reasoning> block from LLM response."""
    m = re.search(r"<reasoning>\s*\n?(.*?)</reasoning>", text, re.DOTALL)
    if m:
        return m.group(1).strip()
    return None


def get_shader_line_context(shader: str, line_num: int, context: int = 2) -> str:
    """Get a few lines of shader code around a specific line number for error context."""
    lines = shader.splitlines()
    if line_num < 1 or line_num > len(lines):
        return ""
    start = max(0, line_num - 1 - context)
    end = min(len(lines), line_num + context)
    result = []
    for i in range(start, end):
        marker = ">>>" if i == line_num - 1 else "   "
        result.append(f"{marker} {i + 1:3d} | {lines[i]}")
    return "\n".join(result)
