"""Shader DSL — compact JSON intermediate representation compiled to GLSL ES 3.00."""

from app.dsl.compiler import CompileResult, compile_dsl
from app.dsl.schema import ShaderDSL

__all__ = ["ShaderDSL", "compile_dsl", "CompileResult"]
