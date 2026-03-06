"""Prompt versioning — auto-loads the latest prompt version.

Prompt versions live in subfolders: v0/, v1/, v2/, etc.
Each contains a prompts.py exporting the standard prompt constants.
This module scans for the highest version number and re-exports from it.
Consumers can also request a specific version via get_prompts(version).
"""

import importlib
from pathlib import Path
from types import ModuleType

_PROMPTS_DIR = Path(__file__).parent
_version_cache: dict[int, ModuleType] = {}

_PROMPT_NAMES = [
    "CLARIFY_SYSTEM_PROMPT",
    "DRAFT_SYSTEM_PROMPT",
    "DSL_DRAFT_SYSTEM_PROMPT",
    "REPAIR_SYSTEM_PROMPT",
    "REFINE_SYSTEM_PROMPT",
]


def get_all_versions() -> list[int]:
    """Return all available prompt version numbers, sorted ascending."""
    versions = []
    for child in _PROMPTS_DIR.iterdir():
        if child.is_dir() and child.name.startswith("v"):
            try:
                versions.append(int(child.name[1:]))
            except ValueError:
                continue
    if not versions:
        raise RuntimeError("No prompt versions found in %s" % _PROMPTS_DIR)
    return sorted(versions)


def _load_version(version: int) -> ModuleType:
    """Load and cache a specific prompt version module."""
    if version not in _version_cache:
        _version_cache[version] = importlib.import_module(
            f".v{version}.prompts", package=__name__
        )
    return _version_cache[version]


def get_prompts(version: int | None = None) -> dict[str, str]:
    """Get all prompt constants for a specific version.

    If version is None, uses the latest available version.
    Returns a dict like {"DRAFT_SYSTEM_PROMPT": "...", ...}.
    """
    if version is None:
        version = PROMPT_VERSION
    mod = _load_version(version)
    return {name: getattr(mod, name) for name in _PROMPT_NAMES}


# Default: latest version
PROMPT_VERSION = max(get_all_versions())

_module = _load_version(PROMPT_VERSION)

# Re-export all standard prompt constants (latest version as default)
CLARIFY_SYSTEM_PROMPT = _module.CLARIFY_SYSTEM_PROMPT
DRAFT_SYSTEM_PROMPT = _module.DRAFT_SYSTEM_PROMPT
DSL_DRAFT_SYSTEM_PROMPT = _module.DSL_DRAFT_SYSTEM_PROMPT
REPAIR_SYSTEM_PROMPT = _module.REPAIR_SYSTEM_PROMPT
REFINE_SYSTEM_PROMPT = _module.REFINE_SYSTEM_PROMPT

# Re-export shared blocks if consumers need them
GLSL_HEADER_BLOCK = getattr(_module, "GLSL_HEADER_BLOCK", "")
NOISE_HELPERS_BLOCK = getattr(_module, "NOISE_HELPERS_BLOCK", "")
TECHNICAL_RULES_BLOCK = getattr(_module, "TECHNICAL_RULES_BLOCK", "")
