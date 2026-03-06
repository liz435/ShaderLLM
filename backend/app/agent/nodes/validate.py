from app.agent.error_handling import safe_node
from app.agent.state import AgentState
from app.models.events import SSEEvent
from app.tools.glsl_validator import validate_glsl


@safe_node
async def validate_shader(state: AgentState) -> dict:
    """Validate the generated GLSL shader."""
    events: list[SSEEvent] = []

    fragment = state.get("fragment_shader")
    if not fragment:
        events.append(SSEEvent(type="validation", data={
            "valid": False,
            "errors": [{"line": 0, "message": "No shader code to validate", "severity": "error", "stage": "fragment"}],
        }))
        return {
            "validation_result": None,
            "pending_events": events,
        }

    events.append(SSEEvent(type="thinking", data={"text": "Validating GLSL..."}))

    result = validate_glsl(fragment, "fragment")

    error_data = [
        {"line": e.line, "message": e.message, "severity": e.severity, "stage": e.stage}
        for e in result.errors
    ]

    if result.valid:
        # Surface any warnings (e.g., fallback validator degraded mode)
        warnings = [e for e in result.errors if e.severity == "warning"]
        events.append(SSEEvent(type="validation", data={
            "valid": True,
            "errors": [{"line": w.line, "message": w.message, "severity": "warning", "stage": w.stage} for w in warnings],
        }))
        events.append(SSEEvent(type="thinking", data={"text": "Shader compiled successfully."}))
    else:
        error_summary = "; ".join(f"L{e.line}: {e.message}" for e in result.errors if e.severity == "error")
        error_count = sum(1 for e in result.errors if e.severity == "error")
        if error_count > 3:
            error_summary += f" (+{error_count - 3} more)"
        events.append(SSEEvent(type="validation", data={"valid": False, "errors": error_data}))
        events.append(SSEEvent(type="thinking", data={
            "text": f"Compilation failed ({error_count} error{'s' if error_count != 1 else ''}): {error_summary}",
        }))

    return {
        "validation_result": result,
        "pending_events": events,
    }
