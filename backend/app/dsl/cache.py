"""In-memory LRU cache for DSL-to-GLSL compilation results."""

from __future__ import annotations

import hashlib
import json
from collections import OrderedDict

from app.dsl.compiler import CompileResult, compile_dsl
from app.dsl.schema import ShaderDSL


class DSLCache:
    """Simple LRU cache that maps DSL specs to compiled GLSL."""

    def __init__(self, max_size: int = 256) -> None:
        self._cache: OrderedDict[str, CompileResult] = OrderedDict()
        self._max_size = max_size
        self.hits = 0
        self.misses = 0

    @staticmethod
    def _cache_key(dsl: ShaderDSL) -> str:
        """Hash the DSL spec (excluding metadata) for cache lookup."""
        payload = {
            "version": dsl.version,
            "params": dsl.params,
            "pipeline": [n.model_dump(exclude_none=True) for n in dsl.pipeline],
        }
        raw = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(raw.encode()).hexdigest()[:32]

    def get_or_compile(self, dsl: ShaderDSL) -> CompileResult:
        """Return cached result or compile and cache."""
        key = self._cache_key(dsl)

        if key in self._cache:
            self.hits += 1
            self._cache.move_to_end(key)
            return self._cache[key]

        self.misses += 1
        result = compile_dsl(dsl)
        self._cache[key] = result

        # Evict oldest if over capacity
        while len(self._cache) > self._max_size:
            self._cache.popitem(last=False)

        return result

    def clear(self) -> None:
        self._cache.clear()
        self.hits = 0
        self.misses = 0

    @property
    def size(self) -> int:
        return len(self._cache)


# Module-level singleton
_cache = DSLCache()


def get_cache() -> DSLCache:
    return _cache
