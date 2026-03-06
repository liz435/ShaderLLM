"""Tests for the DSL-to-GLSL compiler."""

import pytest

from app.dsl.cache import DSLCache
from app.dsl.compiler import compile_dsl
from app.dsl.schema import PipelineNode, ShaderDSL


def _make_dsl(pipeline: list[dict], params: dict | None = None) -> ShaderDSL:
    nodes = [PipelineNode(**n) for n in pipeline]
    return ShaderDSL(pipeline=nodes, params=params or {})


class TestCompiler:
    def test_minimal_uv_output(self):
        dsl = _make_dsl([
            {"id": "uv", "op": "uv_normalize"},
            {"id": "out", "op": "output", "input": "uv"},
        ])
        result = compile_dsl(dsl)
        assert "#version 300 es" in result.glsl
        assert "precision highp float;" in result.glsl
        assert "void main()" in result.glsl
        assert "fragColor" in result.glsl
        assert len(result.warnings) == 0

    def test_noise_includes_helpers(self):
        dsl = _make_dsl([
            {"id": "uv", "op": "uv_normalize"},
            {"id": "n", "op": "noise", "input": "uv", "frequency": 5.0},
            {"id": "out", "op": "output", "input": "n"},
        ])
        result = compile_dsl(dsl)
        assert "_dsl_hash" in result.glsl
        assert "_dsl_noise" in result.glsl

    def test_fbm_includes_all_deps(self):
        dsl = _make_dsl([
            {"id": "uv", "op": "uv_normalize"},
            {"id": "f", "op": "fbm", "input": "uv", "octaves": 4, "frequency": 2.0},
            {"id": "out", "op": "output", "input": "f"},
        ])
        result = compile_dsl(dsl)
        assert "_dsl_hash" in result.glsl
        assert "_dsl_noise" in result.glsl
        assert "_dsl_fbm" in result.glsl

    def test_voronoi(self):
        dsl = _make_dsl([
            {"id": "uv", "op": "uv_normalize"},
            {"id": "v", "op": "voronoi", "input": "uv", "frequency": 8.0},
            {"id": "out", "op": "output", "input": "v"},
        ])
        result = compile_dsl(dsl)
        assert "_dsl_voronoi" in result.glsl
        assert "_dsl_hash21" in result.glsl

    def test_custom_palette(self):
        dsl = _make_dsl(
            [
                {"id": "uv", "op": "uv_normalize"},
                {"id": "n", "op": "noise", "input": "uv"},
                {"id": "c", "op": "palette_map", "input": "n", "palette": "pal"},
                {"id": "out", "op": "output", "input": "c"},
            ],
            params={"pal": ["#ff0000", "#00ff00", "#0000ff"]},
        )
        result = compile_dsl(dsl)
        assert "_dsl_palette" in result.glsl
        # Should contain the hex-converted colors
        assert "1.0000" in result.glsl  # red channel of #ff0000

    def test_sdf_circle(self):
        dsl = _make_dsl([
            {"id": "uv", "op": "uv_normalize"},
            {"id": "s", "op": "sdf_circle", "input": "uv", "radius": 0.3, "center": [0.5, 0.5]},
            {"id": "out", "op": "output", "input": "s"},
        ])
        result = compile_dsl(dsl)
        assert "length" in result.glsl
        assert "0.3" in result.glsl

    def test_domain_warp_chain(self):
        dsl = _make_dsl([
            {"id": "uv", "op": "uv_normalize"},
            {"id": "n1", "op": "fbm", "input": "uv", "octaves": 4, "frequency": 3.0},
            {"id": "warp", "op": "domain_warp", "input": "uv", "offset": "n1", "strength": 0.3},
            {"id": "n2", "op": "fbm", "input": "warp", "octaves": 5, "frequency": 2.0},
            {"id": "out", "op": "output", "input": "n2"},
        ])
        result = compile_dsl(dsl)
        assert "v_warp" in result.glsl
        assert "0.3" in result.glsl

    def test_time_animate(self):
        dsl = _make_dsl([
            {"id": "uv", "op": "uv_normalize"},
            {"id": "anim", "op": "time_animate", "input": "uv", "speed": 0.5},
            {"id": "n", "op": "noise", "input": "anim"},
            {"id": "out", "op": "output", "input": "n"},
        ])
        result = compile_dsl(dsl)
        assert "iTime" in result.glsl
        assert "0.5" in result.glsl

    def test_gradient_operation(self):
        dsl = _make_dsl([
            {"id": "uv", "op": "uv_normalize"},
            {"id": "g", "op": "gradient", "input": "uv", "color_a": [0.0, 0.0, 0.2], "color_b": [0.0, 0.4, 1.0]},
            {"id": "out", "op": "output", "input": "g"},
        ])
        result = compile_dsl(dsl)
        assert "mix" in result.glsl

    def test_mix_operation(self):
        dsl = _make_dsl([
            {"id": "uv", "op": "uv_normalize"},
            {"id": "c1", "op": "color_constant", "color": [1.0, 0.0, 0.0]},
            {"id": "c2", "op": "color_constant", "color": [0.0, 0.0, 1.0]},
            {"id": "m", "op": "mix_op", "input": "c1", "input_b": "c2", "factor": 0.5},
            {"id": "out", "op": "output", "input": "m"},
        ])
        result = compile_dsl(dsl)
        assert "mix(" in result.glsl

    def test_no_unused_helpers(self):
        """Compiler should only include helpers that are actually needed."""
        dsl = _make_dsl([
            {"id": "uv", "op": "uv_normalize"},
            {"id": "out", "op": "output", "input": "uv"},
        ])
        result = compile_dsl(dsl)
        assert "_dsl_hash" not in result.glsl
        assert "_dsl_noise" not in result.glsl
        assert "_dsl_fbm" not in result.glsl

    def test_float_output_to_grayscale(self):
        dsl = _make_dsl([
            {"id": "uv", "op": "uv_normalize"},
            {"id": "n", "op": "noise", "input": "uv"},
            {"id": "out", "op": "output", "input": "n"},
        ])
        result = compile_dsl(dsl)
        assert "vec4(vec3(" in result.glsl

    def test_vec3_output(self):
        dsl = _make_dsl([
            {"id": "uv", "op": "uv_normalize"},
            {"id": "c", "op": "color_constant", "color": [0.5, 0.5, 0.5]},
            {"id": "out", "op": "output", "input": "c"},
        ])
        result = compile_dsl(dsl)
        assert "vec4(v_c, 1.0)" in result.glsl


class TestCache:
    def test_cache_hit(self):
        cache = DSLCache(max_size=10)
        dsl = _make_dsl([
            {"id": "uv", "op": "uv_normalize"},
            {"id": "out", "op": "output", "input": "uv"},
        ])
        r1 = cache.get_or_compile(dsl)
        r2 = cache.get_or_compile(dsl)
        assert r1.glsl == r2.glsl
        assert cache.hits == 1
        assert cache.misses == 1

    def test_cache_miss_different_specs(self):
        cache = DSLCache(max_size=10)
        dsl1 = _make_dsl([
            {"id": "uv", "op": "uv_normalize"},
            {"id": "out", "op": "output", "input": "uv"},
        ])
        dsl2 = _make_dsl([
            {"id": "uv", "op": "uv_normalize"},
            {"id": "n", "op": "noise", "input": "uv"},
            {"id": "out", "op": "output", "input": "n"},
        ])
        cache.get_or_compile(dsl1)
        cache.get_or_compile(dsl2)
        assert cache.misses == 2
        assert cache.size == 2

    def test_cache_eviction(self):
        cache = DSLCache(max_size=2)
        dsls = []
        for i in range(3):
            dsl = _make_dsl([
                {"id": "uv", "op": "uv_normalize"},
                {"id": f"n{i}", "op": "noise", "input": "uv", "frequency": float(i + 1)},
                {"id": "out", "op": "output", "input": f"n{i}"},
            ])
            dsls.append(dsl)

        cache.get_or_compile(dsls[0])
        cache.get_or_compile(dsls[1])
        cache.get_or_compile(dsls[2])
        assert cache.size == 2  # oldest evicted

    def test_cache_clear(self):
        cache = DSLCache(max_size=10)
        dsl = _make_dsl([
            {"id": "uv", "op": "uv_normalize"},
            {"id": "out", "op": "output", "input": "uv"},
        ])
        cache.get_or_compile(dsl)
        cache.clear()
        assert cache.size == 0
        assert cache.hits == 0

    def test_metadata_ignored_in_cache_key(self):
        """Two DSLs differing only in metadata should share cache entry."""
        cache = DSLCache(max_size=10)
        pipeline = [
            {"id": "uv", "op": "uv_normalize"},
            {"id": "out", "op": "output", "input": "uv"},
        ]
        dsl1 = ShaderDSL(
            metadata={"category": "static"},
            pipeline=[PipelineNode(**n) for n in pipeline],
        )
        dsl2 = ShaderDSL(
            metadata={"category": "moving"},
            pipeline=[PipelineNode(**n) for n in pipeline],
        )
        cache.get_or_compile(dsl1)
        cache.get_or_compile(dsl2)
        assert cache.hits == 1
        assert cache.misses == 1
