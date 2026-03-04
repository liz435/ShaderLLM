from app.agent.state import AgentState
from app.models.events import SSEEvent
from app.tools.glsl_validator import validate_glsl


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
        events.append(SSEEvent(type="validation", data={"valid": True, "errors": []}))
        events.append(SSEEvent(type="thinking", data={"text": "Shader compiled successfully."}))
    else:
        error_summary = "; ".join(f"L{e.line}: {e.message}" for e in result.errors[:3])
        if len(result.errors) > 3:
            error_summary += f" (+{len(result.errors) - 3} more)"
        events.append(SSEEvent(type="validation", data={"valid": False, "errors": error_data}))
        events.append(SSEEvent(type="thinking", data={
            "text": f"Compilation failed ({len(result.errors)} error{'s' if len(result.errors) != 1 else ''}): {error_summary}",
        }))

    return {
        "validation_result": result,
        "pending_events": events,
    }
