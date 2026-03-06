"""Tests for the DSL schema validation."""

import pytest
from pydantic import ValidationError

from app.dsl.schema import PipelineNode, ShaderDSL


class TestPipelineNode:
    def test_valid_node(self):
        node = PipelineNode(id="uv", op="uv_normalize")
        assert node.id == "uv"
        assert node.op == "uv_normalize"

    def test_node_with_params(self):
        node = PipelineNode(
            id="n1", op="fbm", input="uv", octaves=4, frequency=3.0
        )
        assert node.octaves == 4
        assert node.frequency == 3.0

    def test_invalid_op_type(self):
        with pytest.raises(ValidationError):
            PipelineNode(id="x", op="nonexistent_op")

    def test_octaves_bounds(self):
        with pytest.raises(ValidationError):
            PipelineNode(id="n", op="fbm", octaves=0)
        with pytest.raises(ValidationError):
            PipelineNode(id="n", op="fbm", octaves=11)


class TestShaderDSL:
    def test_minimal_valid(self):
        dsl = ShaderDSL(pipeline=[
            PipelineNode(id="uv", op="uv_normalize"),
            PipelineNode(id="out", op="output", input="uv"),
        ])
        assert len(dsl.pipeline) == 2

    def test_missing_output_node(self):
        with pytest.raises(ValidationError, match="output"):
            ShaderDSL(pipeline=[
                PipelineNode(id="uv", op="uv_normalize"),
            ])

    def test_empty_pipeline(self):
        with pytest.raises(ValidationError):
            ShaderDSL(pipeline=[])

    def test_invalid_node_reference(self):
        with pytest.raises(ValidationError, match="references"):
            ShaderDSL(pipeline=[
                PipelineNode(id="uv", op="uv_normalize"),
                PipelineNode(id="n1", op="fbm", input="nonexistent"),
                PipelineNode(id="out", op="output", input="n1"),
            ])

    def test_valid_param_reference(self):
        dsl = ShaderDSL(
            params={"palette": ["#ff0000", "#00ff00"]},
            pipeline=[
                PipelineNode(id="uv", op="uv_normalize"),
                PipelineNode(id="n", op="noise", input="uv", frequency=2.0),
                PipelineNode(id="c", op="palette_map", input="n", palette="palette"),
                PipelineNode(id="out", op="output", input="c"),
            ],
        )
        assert dsl.params["palette"] == ["#ff0000", "#00ff00"]

    def test_complex_pipeline(self):
        dsl = ShaderDSL(
            version=1,
            metadata={"category": "moving"},
            params={"palette": ["#1a1a2e", "#16213e", "#0f3460", "#e94560"]},
            pipeline=[
                PipelineNode(id="uv", op="uv_normalize"),
                PipelineNode(id="anim", op="time_animate", input="uv", speed=0.3),
                PipelineNode(id="n1", op="fbm", input="anim", octaves=5, frequency=4.0),
                PipelineNode(id="warp", op="domain_warp", input="uv", offset="n1", strength=0.2),
                PipelineNode(id="n2", op="fbm", input="warp", octaves=6, frequency=3.0),
                PipelineNode(id="color", op="palette_map", input="n2", palette="palette"),
                PipelineNode(id="out", op="output", input="color"),
            ],
        )
        assert len(dsl.pipeline) == 7
        assert dsl.metadata["category"] == "moving"

    def test_model_dump_roundtrip(self):
        """Ensure we can serialize and deserialize."""
        original = ShaderDSL(
            params={"speed": 0.5},
            pipeline=[
                PipelineNode(id="uv", op="uv_normalize"),
                PipelineNode(id="out", op="output", input="uv"),
            ],
        )
        data = original.model_dump()
        restored = ShaderDSL.model_validate(data)
        assert len(restored.pipeline) == len(original.pipeline)
