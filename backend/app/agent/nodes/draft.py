import time

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from app.agent.prompts import DRAFT_SYSTEM_PROMPT, REFINE_SYSTEM_PROMPT
from app.agent.state import AgentState
from app.agent.utils import extract_glsl, extract_reasoning
from app.llm.provider import get_llm
from app.models.events import SSEEvent


async def draft_shader(state: AgentState) -> dict:
    """Generate a new GLSL shader from the user's prompt."""
    llm = get_llm()
    t0 = time.time()

    events: list[SSEEvent] = []
    events.append(SSEEvent(type="thinking", data={"text": "Generating shader..."}))

    messages = [
        SystemMessage(content=DRAFT_SYSTEM_PROMPT),
        HumanMessage(content=state["user_prompt"]),
    ]

    response = await llm.ainvoke(messages)
    elapsed = round(time.time() - t0, 2)

    # Extract and stream the reasoning block
    reasoning = extract_reasoning(response.content)
    if reasoning:
        events.append(SSEEvent(type="thinking", data={"text": reasoning}))

    # Extract GLSL code
    code = extract_glsl(response.content)

    if code is None:
        events.append(SSEEvent(type="error", data={
            "message": "Failed to extract GLSL from LLM response",
            "elapsed_s": elapsed,
        }))
        return {
            "messages": [response],
            "fragment_shader": None,
            "pending_events": events,
            "error": "Failed to extract GLSL code from response",
        }

    events.append(SSEEvent(type="shader_code", data={
        "code": code,
        "stage": "fragment",
        "elapsed_s": elapsed,
    }))

    return {
        "messages": [response],
        "fragment_shader": code,
        "pending_events": events,
        "error": None,
    }


async def refine_shader(state: AgentState) -> dict:
    """Modify an existing shader based on user feedback."""
    llm = get_llm()
    t0 = time.time()

    events: list[SSEEvent] = []
    events.append(SSEEvent(type="thinking", data={"text": "Refining shader..."}))

    current_shader = state.get("fragment_shader") or ""

    prompt = REFINE_SYSTEM_PROMPT.replace("{current_shader}", current_shader).replace(
        "{user_prompt}", state["user_prompt"]
    )

    messages = [
        SystemMessage(content=prompt),
    ]

    # Inject prior conversation turns for multi-turn context
    for turn in state.get("conversation_history", []):
        role = turn.get("role", "")
        content = turn.get("content", "")
        if role == "user":
            messages.append(HumanMessage(content=content))
        elif role == "assistant":
            messages.append(AIMessage(content=content))

    messages.append(HumanMessage(content=state["user_prompt"]))

    response = await llm.ainvoke(messages)
    elapsed = round(time.time() - t0, 2)

    reasoning = extract_reasoning(response.content)
    if reasoning:
        events.append(SSEEvent(type="thinking", data={"text": reasoning}))

    code = extract_glsl(response.content)

    if code is None:
        events.append(SSEEvent(type="error", data={
            "message": "Failed to extract GLSL from refinement response",
            "elapsed_s": elapsed,
        }))
        return {
            "messages": [response],
            "fragment_shader": state.get("fragment_shader"),
            "pending_events": events,
            "error": "Failed to extract GLSL code from refinement response",
        }

    events.append(SSEEvent(type="shader_code", data={
        "code": code,
        "stage": "fragment",
        "elapsed_s": elapsed,
    }))

    return {
        "messages": [response],
        "fragment_shader": code,
        "pending_events": events,
        "error": None,
    }
