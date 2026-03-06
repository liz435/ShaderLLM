import asyncio
import time

from langchain_core.messages import HumanMessage, SystemMessage

from backend.app.agent.prompts.v0.prompts import REPAIR_SYSTEM_PROMPT
from app.agent.state import AgentState, RepairAttempt
from app.agent.utils import extract_glsl, get_shader_line_context
from app.config import settings
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

    # Structured repair history — show the LLM what was already tried
    history_section = ""
    prior_attempts = state.get("repair_history", [])
    if prior_attempts:
        parts = []
        for i, attempt in enumerate(prior_attempts, 1):
            parts.append(
                f"### Attempt {i}\n"
                f"Errors seen: {attempt['errors']}\n"
                f"Shader had: {attempt['shader_snippet']}"
            )
        history_section = (
            f"\n\n## Previous failed repairs\n"
            f"The following approaches were already tried and DID NOT work. "
            f"Do NOT repeat the same fix — try a fundamentally different approach.\n\n"
            + "\n\n".join(parts)
        )

    user_msg = f"""## Errors to fix

{error_text}{history_section}

## Current shader

```glsl
{shader_code}
```

Return the fixed shader in a single ```glsl code block."""

    # Record this attempt for future retries
    new_attempt = RepairAttempt(
        errors=error_text[:500],
        shader_snippet=shader_code[:200] + ("..." if len(shader_code) > 200 else ""),
    )

    try:
        response = await asyncio.wait_for(
            llm.ainvoke([
                SystemMessage(content=REPAIR_SYSTEM_PROMPT),
                HumanMessage(content=user_msg),
            ]),
            timeout=settings.request_timeout,
        )
    except asyncio.TimeoutError:
        elapsed = round(time.time() - t0, 2)
        events.append(SSEEvent(type="thinking", data={
            "text": f"Repair attempt {retry} timed out after {settings.request_timeout}s",
        }))
        return {
            "fragment_shader": state["fragment_shader"],
            "retry_count": retry,
            "repair_history": [new_attempt],
            "pending_events": events,
        }

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
        "fragment_shader": code or state["fragment_shader"],
        "retry_count": retry,
        "repair_history": [new_attempt],
        "pending_events": events,
    }
