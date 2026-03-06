"""Prompt versioning — auto-loads the latest prompt version.

Prompt versions live in subfolders: v0/, v1/, v2/, etc.
Each contains a prompts.py exporting the standard prompt constants.
This module scans for the highest version number and re-exports from it.
"""

import importlib
from pathlib import Path

_PROMPTS_DIR = Path(__file__).parent


def _find_latest_version() -> int:
    """Scan for v0, v1, v2, ... directories and return the highest number."""
    versions = []
    for child in _PROMPTS_DIR.iterdir():
        if child.is_dir() and child.name.startswith("v"):
            try:
                versions.append(int(child.name[1:]))
            except ValueError:
                continue
    if not versions:
        raise RuntimeError("No prompt versions found in %s" % _PROMPTS_DIR)
    return max(versions)


PROMPT_VERSION = _find_latest_version()

_module = importlib.import_module(f".v{PROMPT_VERSION}.prompts", package=__name__)

# Re-export all standard prompt constants
CLARIFY_SYSTEM_PROMPT = _module.CLARIFY_SYSTEM_PROMPT
DRAFT_SYSTEM_PROMPT = _module.DRAFT_SYSTEM_PROMPT
DSL_DRAFT_SYSTEM_PROMPT = _module.DSL_DRAFT_SYSTEM_PROMPT
REPAIR_SYSTEM_PROMPT = _module.REPAIR_SYSTEM_PROMPT
REFINE_SYSTEM_PROMPT = _module.REFINE_SYSTEM_PROMPT

# Re-export shared blocks if consumers need them
GLSL_HEADER_BLOCK = getattr(_module, "GLSL_HEADER_BLOCK", "")
NOISE_HELPERS_BLOCK = getattr(_module, "NOISE_HELPERS_BLOCK", "")
TECHNICAL_RULES_BLOCK = getattr(_module, "TECHNICAL_RULES_BLOCK", "")
