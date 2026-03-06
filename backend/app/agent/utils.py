import json
import re

from app.agent.examples import select_examples


def build_draft_prompt(base_prompt: str, user_prompt: str) -> str:
    """Build the full draft system prompt with dynamically selected examples."""
    examples = select_examples(user_prompt, max_examples=2)

    example_sections = []
    for ex in examples:
        example_sections.append(
            f'Prompt: "{ex["prompt"]}"\n\n```glsl\n{ex["code"]}\n```'
        )

    examples_text = "\n\n---\n\n".join(example_sections)

    return (
        base_prompt
        + "\n\n────────────────────────────────────────────────────\n"
        "REFERENCE EXAMPLES (match or exceed this quality level)\n"
        "────────────────────────────────────────────────────\n"
        + examples_text
        + "\n\nYour shader must be at least as complex and visually rich as these examples."
    )


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


def extract_dsl_json(text: str) -> dict | None:
    """Extract a JSON object from ```json fences or raw JSON in LLM response."""
    # Try fenced JSON blocks first
    patterns = [
        r"```json\s*\n(.*?)```",
        r"```\s*\n(\{.*?\})\s*```",
    ]
    for pattern in patterns:
        m = re.search(pattern, text, re.DOTALL)
        if m:
            try:
                return json.loads(m.group(1).strip())
            except json.JSONDecodeError:
                continue

    # Fallback: find the outermost { ... } in the text
    depth = 0
    start = None
    for i, ch in enumerate(text):
        if ch == "{":
            if depth == 0:
                start = i
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and start is not None:
                try:
                    return json.loads(text[start : i + 1])
                except json.JSONDecodeError:
                    start = None

    return None


# Keywords that suggest the prompt is too complex for the DSL.
# These need real GLSL with geometry, lighting, or structured layering
# that the DSL's simple op-chain cannot express.
_COMPLEX_KEYWORDS = {
    # 3D / advanced rendering
    "raymarching", "ray marching", "ray tracing", "raytracing",
    "3d scene", "volumetric", "physically based", "pbr",
    "fluid simulation", "particles", "reaction diffusion",
    "turing pattern", "cellular automata",
    # Nature scenes requiring per-element geometry or layered depth
    "grass", "field", "meadow", "lawn", "vegetation",
    "forest", "trees", "tree", "rain", "snow", "snowfall",
    "ocean", "waves", "water", "sea", "lake", "river",
    "fire", "flame", "flames", "campfire", "torch",
    "terrain", "mountain", "landscape", "canyon",
    "cloud", "clouds", "sky", "sunset", "sunrise",
    "city", "buildings", "corridor", "hallway", "room",
}


def classify_prompt_complexity(prompt: str) -> str:
    """Classify whether a prompt should use the DSL path or direct GLSL.

    Returns 'dsl' or 'direct'.
    """
    lower = prompt.lower()
    for keyword in _COMPLEX_KEYWORDS:
        if keyword in lower:
            return "direct"
    return "dsl"
