"""Agent node that generates a shader via the DSL intermediate representation."""

import time

from langchain_core.messages import HumanMessage, SystemMessage

from app.agent.error_handling import safe_node
from backend.app.agent.prompts.v0.prompts import DSL_DRAFT_SYSTEM_PROMPT
from app.agent.state import AgentState
from app.agent.utils import extract_dsl_json, extract_reasoning
from app.dsl.cache import get_cache
from app.dsl.schema import ShaderDSL
from app.llm.provider import get_llm
from app.models.events import SSEEvent


@safe_node
async def draft_shader_dsl(state: AgentState) -> dict:
    """Generate a shader by having the LLM produce a DSL spec, then compile to GLSL."""
    llm = get_llm()
    t0 = time.time()

    events: list[SSEEvent] = []
    events.append(SSEEvent(type="thinking", data={"text": "Generating shader via DSL..."}))

    messages = [
        SystemMessage(content=DSL_DRAFT_SYSTEM_PROMPT),
        HumanMessage(content=state["user_prompt"]),
    ]

    response = await llm.ainvoke(messages)
    elapsed = round(time.time() - t0, 2)

    # Extract reasoning
    reasoning = extract_reasoning(response.content)
    if reasoning:
        events.append(SSEEvent(type="thinking", data={"text": reasoning}))

    # Extract DSL JSON
    dsl_json = extract_dsl_json(response.content)
    if dsl_json is None:
        # DSL extraction failed — signal fallback to direct GLSL draft
        events.append(SSEEvent(type="thinking", data={
            "text": "DSL extraction failed, falling back to direct GLSL generation",
        }))
        return {
            "messages": [response],
            "fragment_shader": None,
            "dsl_spec": None,
            "use_dsl": False,
            "pending_events": events,
            "error": "dsl_fallback",
        }

    # Parse and validate DSL
    try:
        dsl = ShaderDSL.model_validate(dsl_json)
    except Exception as e:
        events.append(SSEEvent(type="thinking", data={
            "text": f"DSL validation failed ({e}), falling back to direct GLSL generation",
        }))
        return {
            "messages": [response],
            "fragment_shader": None,
            "dsl_spec": None,
            "use_dsl": False,
            "pending_events": events,
            "error": "dsl_fallback",
        }

    # Compile DSL to GLSL (using cache)
    cache = get_cache()
    result = cache.get_or_compile(dsl)

    if result.warnings:
        for w in result.warnings:
            events.append(SSEEvent(type="thinking", data={"text": f"DSL warning: {w}"}))

    events.append(SSEEvent(type="shader_code", data={
        "code": result.glsl,
        "stage": "fragment",
        "elapsed_s": elapsed,
        "source": "dsl",
    }))

    return {
        "messages": [response],
        "fragment_shader": result.glsl,
        "dsl_spec": dsl.model_dump(),
        "use_dsl": True,
        "pending_events": events,
        "error": None,
    }
