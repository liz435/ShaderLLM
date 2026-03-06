"""Example shader loader — selects relevant examples for few-shot prompting."""

import json
from pathlib import Path

_EXAMPLES_DIR = Path(__file__).parent
_manifest: list[dict] | None = None
_cache: dict[str, str] = {}


def _load_manifest() -> list[dict]:
    global _manifest
    if _manifest is None:
        manifest_path = _EXAMPLES_DIR / "manifest.json"
        _manifest = json.loads(manifest_path.read_text())
    return _manifest


def _load_shader(filename: str) -> str:
    if filename not in _cache:
        path = _EXAMPLES_DIR / filename
        # Strip the header comment lines (// Prompt: ..., // Tags: ...)
        lines = path.read_text().splitlines()
        code_lines = [l for l in lines if not l.startswith("// Prompt:") and not l.startswith("// Tags:")]
        _cache[filename] = "\n".join(code_lines).strip()
    return _cache[filename]


def get_available_tags() -> list[str]:
    """Return all unique tags across all examples. Used for tool descriptions."""
    manifest = _load_manifest()
    tags = set()
    for entry in manifest:
        tags.update(entry["tags"])
    return sorted(tags)


def search_by_keywords(keywords: list[str], max_results: int = 2) -> list[dict]:
    """Search examples by keywords (called by the LLM tool).

    Returns a list of {"prompt": str, "code": str} dicts.
    """
    manifest = _load_manifest()

    scored = []
    for entry in manifest:
        score = sum(
            1 for kw in keywords
            if any(kw.lower() in tag for tag in entry["tags"])
        )
        if score > 0:
            scored.append((score, entry))

    scored.sort(key=lambda x: x[0], reverse=True)

    results = []
    for _score, entry in scored[:max_results]:
        results.append({
            "prompt": entry["prompt"],
            "code": _load_shader(entry["file"]),
        })

    # Fallback: return first example if nothing matched
    if not results:
        fallback = manifest[0]
        results.append({
            "prompt": fallback["prompt"],
            "code": _load_shader(fallback["file"]),
        })

    return results


def select_examples(prompt: str, max_examples: int = 2) -> list[dict]:
    """Select the most relevant example shaders for a given prompt.

    Returns a list of {"prompt": str, "code": str} dicts, sorted by relevance.
    Uses simple keyword overlap scoring — fast and predictable.
    Kept as fallback when tool calling is not used.
    """
    manifest = _load_manifest()
    prompt_lower = prompt.lower()
    prompt_words = set(prompt_lower.split())

    scored = []
    for entry in manifest:
        tag_matches = sum(1 for tag in entry["tags"] if tag in prompt_lower)
        word_matches = sum(1 for tag in entry["tags"] if tag in prompt_words)
        score = tag_matches * 2 + word_matches
        if score > 0:
            scored.append((score, entry))

    scored.sort(key=lambda x: x[0], reverse=True)

    results = []
    for _score, entry in scored[:max_examples]:
        results.append({
            "prompt": entry["prompt"],
            "code": _load_shader(entry["file"]),
        })

    if not results:
        fallback = manifest[0]
        results.append({
            "prompt": fallback["prompt"],
            "code": _load_shader(fallback["file"]),
        })

    return results
