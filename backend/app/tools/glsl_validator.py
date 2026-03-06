import logging
import os
import re
import subprocess
import tempfile
from typing import Literal

from pydantic import BaseModel

from app.config import settings

log = logging.getLogger(__name__)


class ValidationError(BaseModel):
    line: int
    message: str
    severity: Literal["error", "warning"]
    stage: Literal["vertex", "fragment"]


class ValidationResult(BaseModel):
    valid: bool
    errors: list[ValidationError]
    raw_output: str


def _parse_glslang_output(output: str, stage: Literal["vertex", "fragment"]) -> list[ValidationError]:
    errors: list[ValidationError] = []
    for line in output.splitlines():
        # glslangValidator format: ERROR: 0:LINE: ... or ERROR: /path/file:LINE: ...
        m = re.match(r"(ERROR|WARNING):\s*(?:\d+|[^:]+):(\d+):\s*(.+)", line)
        if m:
            severity = "warning" if m.group(1) == "WARNING" else "error"
            errors.append(ValidationError(
                line=int(m.group(2)),
                message=m.group(3).strip(),
                severity=severity,
                stage=stage,
            ))
        # Linking errors: ERROR: Linking fragment stage: message
        elif re.match(r"ERROR:\s*Linking", line):
            msg = line.split(":", 2)[-1].strip() if ":" in line[6:] else line
            errors.append(ValidationError(
                line=0, message=msg, severity="error", stage=stage,
            ))
    return errors


def validate_glsl(source: str, stage: Literal["vertex", "fragment"]) -> ValidationResult:
    """Validate GLSL source code using glslangValidator.

    Falls back to basic regex checks if the binary is not available.
    """
    ext = ".frag" if stage == "fragment" else ".vert"

    # Check if glslangValidator is available
    glslang = settings.glslang_path
    try:
        subprocess.run([glslang, "--version"], capture_output=True, timeout=5)
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return _fallback_validate(source, stage)

    # Write to temp file and validate
    fd, path = tempfile.mkstemp(suffix=ext)
    try:
        with os.fdopen(fd, "w") as f:
            f.write(source)

        result = subprocess.run(
            [glslang, "-l", path],
            capture_output=True,
            text=True,
            timeout=10,
        )
        raw = result.stdout + result.stderr
        errors = _parse_glslang_output(raw, stage)
        return ValidationResult(
            valid=result.returncode == 0 and not any(e.severity == "error" for e in errors),
            errors=errors,
            raw_output=raw,
        )
    except subprocess.TimeoutExpired:
        return ValidationResult(
            valid=False,
            errors=[ValidationError(line=0, message="Validation timed out", severity="error", stage=stage)],
            raw_output="",
        )
    finally:
        os.unlink(path)


def _fallback_validate(source: str, stage: Literal["vertex", "fragment"]) -> ValidationResult:
    """Basic regex-based checks when glslangValidator is not available.

    WARNING: This only catches gross structural errors (missing main, unmatched braces).
    Type errors, undeclared variables, and invalid syntax will pass through unchecked.
    Install glslangValidator for real validation.
    """
    log.warning(
        "glslangValidator not found — using degraded fallback validation. "
        "Install glslang-tools for proper GLSL compilation checks."
    )

    errors: list[ValidationError] = []

    # Always add a warning so consumers know this was fallback-checked
    errors.append(ValidationError(
        line=0,
        message="Validation degraded: glslangValidator not installed. Only basic checks performed.",
        severity="warning",
        stage=stage,
    ))

    if "void main" not in source:
        errors.append(ValidationError(
            line=0, message="Missing void main() function", severity="error", stage=stage
        ))

    if source.count("{") != source.count("}"):
        errors.append(ValidationError(
            line=0, message="Mismatched curly braces", severity="error", stage=stage
        ))

    has_errors = any(e.severity == "error" for e in errors)
    return ValidationResult(
        valid=not has_errors,
        errors=errors,
        raw_output="fallback validation (glslangValidator not found)",
    )
