import time

from app.agent.error_handling import safe_node
from app.agent.state import AgentState
from app.models.events import SSEEvent


@safe_node
async def finalize(state: AgentState) -> dict:
    """Emit the final result event with summary metadata."""
    events: list[SSEEvent] = []

    valid = state.get("validation_result") and state["validation_result"].valid
    shader = state.get("fragment_shader")
    retries = state.get("retry_count", 0)
    error = state.get("error")
    clarification = state.get("clarification")

    # If this was a clarification, just emit done without shader status
    if clarification:
        events.append(SSEEvent(
            type="done",
            data={
                "shader": "",
                "valid": False,
                "retries": 0,
                "error": None,
                "clarification": clarification,
                "timestamp": time.time(),
            },
        ))
        return {"pending_events": events}

    # Summary thinking event
    if valid and shader:
        if retries > 0:
            events.append(SSEEvent(type="thinking", data={
                "text": f"Done — shader valid after {retries} repair{'s' if retries != 1 else ''}.",
            }))
        else:
            events.append(SSEEvent(type="thinking", data={
                "text": "Done — shader compiled on first attempt.",
            }))
    elif shader:
        events.append(SSEEvent(type="thinking", data={
            "text": f"Done — shader may have errors after {retries} repair attempt{'s' if retries != 1 else ''}. Sending best result.",
        }))
    else:
        events.append(SSEEvent(type="thinking", data={
            "text": "Generation failed — no shader code produced.",
        }))

    events.append(SSEEvent(
        type="done",
        data={
            "shader": shader or "",
            "valid": bool(valid),
            "retries": retries,
            "error": error,
            "timestamp": time.time(),
        },
    ))

    return {"pending_events": events}
