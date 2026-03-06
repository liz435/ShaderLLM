"""Pydantic models for the shader DSL node-graph format."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator


# ---------------------------------------------------------------------------
# Supported operation types
# ---------------------------------------------------------------------------

OpType = Literal[
    # Coordinate operations
    "uv_normalize",
    "rotate",
    "scale",
    "translate",
    # Noise / procedural
    "noise",
    "fbm",
    "voronoi",
    # SDF primitives
    "sdf_circle",
    "sdf_box",
    "sdf_line",
    "sdf_smooth_union",
    # Domain manipulation
    "domain_warp",
    "domain_repeat",
    # Math / blending
    "mix_op",
    "smoothstep_op",
    "step_op",
    "abs_op",
    "sin_op",
    "pow_op",
    "add",
    "multiply",
    "subtract",
    # Color
    "palette_map",
    "color_constant",
    "gradient",
    "hsv_to_rgb",
    # Animation
    "time_animate",
    "mouse_interact",
    # Output
    "output",
]


class PipelineNode(BaseModel):
    """A single node in the shader pipeline graph."""

    id: str = Field(..., description="Unique identifier for this node")
    op: OpType = Field(..., description="Operation type")

    # Inputs — reference other node IDs or param keys
    input: str | None = Field(None, description="Primary input node ID")
    input_b: str | None = Field(None, description="Secondary input node ID")
    offset: str | None = Field(None, description="Offset input node ID (for domain_warp)")

    # Numeric parameters (operation-dependent)
    octaves: int | None = Field(None, ge=1, le=10)
    frequency: float | None = None
    amplitude: float | None = None
    strength: float | None = None
    radius: float | None = None
    size: list[float] | None = Field(None, min_length=2, max_length=2)
    center: list[float] | None = Field(None, min_length=2, max_length=2)
    angle: float | None = None
    factor: float | None = Field(None, description="Scale/mix/pow factor")
    edge0: float | None = None
    edge1: float | None = None
    speed: float | None = None

    # Color parameters
    color: list[float] | None = Field(None, min_length=3, max_length=4)
    palette: str | None = Field(None, description="Reference to params.palette key")
    color_a: list[float] | None = Field(None, min_length=3, max_length=3)
    color_b: list[float] | None = Field(None, min_length=3, max_length=3)

    # Repeat parameters
    cell_size: float | None = None

    # Smooth union
    smoothness: float | None = None


class ShaderDSL(BaseModel):
    """Top-level shader DSL specification."""

    version: int = Field(1, description="DSL schema version")
    metadata: dict = Field(default_factory=dict, description="Category, complexity, etc.")
    params: dict = Field(default_factory=dict, description="Named parameters (palette, speed, etc.)")
    pipeline: list[PipelineNode] = Field(..., min_length=1, description="Ordered pipeline nodes")

    @model_validator(mode="after")
    def validate_pipeline_refs(self) -> ShaderDSL:
        """Check that all node input references point to existing node IDs or param keys."""
        node_ids = {n.id for n in self.pipeline}
        param_keys = set(self.params.keys())
        valid_refs = node_ids | param_keys

        for node in self.pipeline:
            for ref_field in ("input", "input_b", "offset", "palette"):
                ref = getattr(node, ref_field)
                if ref is not None and ref not in valid_refs:
                    raise ValueError(
                        f"Node '{node.id}' references '{ref}' in field '{ref_field}', "
                        f"but no node or param with that ID exists"
                    )
        return self

    @model_validator(mode="after")
    def validate_has_output(self) -> ShaderDSL:
        """Ensure pipeline ends with an output node."""
        if not any(n.op == "output" for n in self.pipeline):
            raise ValueError("Pipeline must contain at least one 'output' node")
        return self
