import time

from langchain_core.messages import HumanMessage, SystemMessage

from app.agent.prompts import REPAIR_SYSTEM_PROMPT
from app.agent.state import AgentState
from app.agent.utils import extract_glsl, get_shader_line_context
from app.llm.provider import get_llm
from app.models.events import SSEEvent


async def repair_shader(state: AgentState) -> dict:
    """Repair a shader based on compilation errors."""
    llm = get_llm()
    t0 = time.time()

    retry = state["retry_count"] + 1
    max_r = state["max_retries"]

    events: list[SSEEvent] = []
    events.append(SSEEvent(type="repair_attempt", data={"attempt": retry, "max": max_r}))
    events.append(SSEEvent(type="thinking", data={
        "text": f"Repairing shader (attempt {retry}/{max_r})...",
    }))

    # Build detailed error context with surrounding code lines
    validation = state["validation_result"]
    shader_code = state["fragment_shader"] or ""
    error_sections = []

    if validation and validation.errors:
        for err in validation.errors:
            section = f"Line {err.line}: {err.message}"
            if err.line > 0:
                context = get_shader_line_context(shader_code, err.line)
                if context:
                    section += f"\n{context}"
            error_sections.append(section)

    error_text = "\n\n".join(error_sections) if error_sections else "Unknown compilation error"

    # Build the user message with shader and errors
    user_msg = f"""## Errors to fix

{error_text}

## Current shader

```glsl
{shader_code}
```

Return the fixed shader in a single ```glsl code block."""

    response = await llm.ainvoke([
        SystemMessage(content=REPAIR_SYSTEM_PROMPT),
        HumanMessage(content=user_msg),
    ])

    elapsed = round(time.time() - t0, 2)
    code = extract_glsl(response.content)

    if code:
        events.append(SSEEvent(type="shader_code", data={
            "code": code,
            "stage": "fragment",
            "elapsed_s": elapsed,
        }))
    else:
        events.append(SSEEvent(type="thinking", data={
            "text": f"Repair attempt {retry} failed to produce valid code",
        }))

    return {
        "messages": [response],
        "fragment_shader": code or state["fragment_shader"],
        "retry_count": retry,
        "pending_events": events,
    }
