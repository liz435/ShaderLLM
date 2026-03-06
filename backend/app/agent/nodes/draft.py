import asyncio
import time

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import tool

from app.agent.examples import get_available_tags, search_by_keywords
from app.agent.prompts import CLARIFY_SYSTEM_PROMPT, DRAFT_SYSTEM_PROMPT, REFINE_SYSTEM_PROMPT
from app.agent.state import AgentState
from app.agent.utils import build_draft_prompt, extract_glsl, extract_reasoning
from app.config import settings
from app.llm.provider import get_llm
from app.models.events import SSEEvent


# ──────────────────────────────────────────────
# Tool definition for example retrieval
# ──────────────────────────────────────────────

_available_tags = get_available_tags()


@tool
def search_shader_examples(keywords: list[str]) -> str:
    """Search for reference shader examples by keywords.

    Use this to find high-quality example shaders that are similar to what
    the user wants. Returns 1-2 complete GLSL shaders you should study
    and match in quality and complexity.

    Args:
        keywords: List of keywords to search for (e.g. ["fire", "flame", "warm"]).
    """
    results = search_by_keywords(keywords, max_results=2)
    if not results:
        return "No matching examples found. Generate the shader from your own knowledge."

    parts = []
    for r in results:
        parts.append(f'Example prompt: "{r["prompt"]}"\n\n```glsl\n{r["code"]}\n```')
    return (
        "Here are reference examples. Your shader must be AT LEAST as complex "
        "and visually rich as these:\n\n" + "\n\n---\n\n".join(parts)
    )


# Update tool description with actual available tags
search_shader_examples.description += (
    f"\n\nAvailable tags in the database: {', '.join(_available_tags)}"
)

_TOOLS = [search_shader_examples]


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

async def _invoke_with_timeout(llm, messages: list, timeout: float | None = None) -> AIMessage:
    """Call the LLM with a timeout."""
    return await asyncio.wait_for(
        llm.ainvoke(messages),
        timeout=timeout or settings.request_timeout,
    )


async def _check_clarity(llm, user_prompt: str) -> str | None:
    """Check if the prompt is clear enough to generate a shader.

    Returns None if clear, or a clarification question string if unclear.
    """
    messages = [
        SystemMessage(content=CLARIFY_SYSTEM_PROMPT),
        HumanMessage(content=user_prompt),
    ]
    try:
        response = await asyncio.wait_for(
            llm.ainvoke(messages),
            timeout=15.0,  # Quick check, short timeout
        )
        text = response.content.strip()
        if text.startswith("CLARIFY:"):
            return text[len("CLARIFY:"):].strip()
        return None
    except (asyncio.TimeoutError, Exception):
        # If clarity check fails, proceed with generation
        return None


# ──────────────────────────────────────────────
# Draft node — with tool-calling example retrieval
# ──────────────────────────────────────────────

async def draft_shader(state: AgentState) -> dict:
    """Generate a new GLSL shader from the user's prompt.

    Flow:
    1. Check prompt clarity — if too vague, return a clarification question
    2. LLM calls search_shader_examples tool to find relevant references
    3. LLM generates the shader with those examples as context
    Falls back to static example selection if tool calling fails.
    """
    llm = get_llm()
    t0 = time.time()

    events: list[SSEEvent] = []
    user_prompt = state["user_prompt"]

    # Step 0: Clarity check — ask follow-up if prompt is too vague
    events.append(SSEEvent(type="thinking", data={"text": "Analyzing prompt..."}))
    clarification = await _check_clarity(llm, user_prompt)
    if clarification:
        events.append(SSEEvent(type="clarification", data={
            "question": clarification,
        }))
        return {
            "fragment_shader": None,
            "clarification": clarification,
            "pending_events": events,
            "error": None,
        }

    events.append(SSEEvent(type="thinking", data={"text": "Generating shader..."}))

    # Bind the example search tool to the LLM
    llm_with_tools = llm.bind_tools(_TOOLS)

    messages = [
        SystemMessage(content=DRAFT_SYSTEM_PROMPT),
        HumanMessage(
            content=(
                f"{user_prompt}\n\n"
                "Before generating the shader, call the search_shader_examples tool "
                "to find relevant reference examples. Pick 2-3 keywords that describe "
                "the visual effect the user wants."
            )
        ),
    ]

    try:
        # Step 1: LLM decides what examples to fetch
        response = await asyncio.wait_for(
            llm_with_tools.ainvoke(messages),
            timeout=settings.request_timeout,
        )

        # Check if the LLM made a tool call
        if response.tool_calls:
            events.append(SSEEvent(type="thinking", data={
                "text": f"Searching examples: {response.tool_calls[0].get('args', {}).get('keywords', [])}",
            }))

            # Execute the tool call
            tool_call = response.tool_calls[0]
            keywords = tool_call.get("args", {}).get("keywords", [])
            tool_result = search_shader_examples.invoke({"keywords": keywords})

            # Add tool interaction to messages
            messages.append(response)
            messages.append(ToolMessage(
                content=tool_result,
                tool_call_id=tool_call["id"],
            ))

            # Step 2: LLM generates shader with examples as context (no tools bound)
            messages.append(HumanMessage(
                content="Now generate the shader. Output <reasoning>...</reasoning> then ```glsl code."
            ))
            response = await asyncio.wait_for(
                llm.ainvoke(messages),
                timeout=settings.request_timeout,
            )
        else:
            # LLM skipped the tool — fall back to static injection
            # This can happen if the model decides it doesn't need examples
            events.append(SSEEvent(type="thinking", data={
                "text": "Generating without reference examples...",
            }))

    except asyncio.TimeoutError:
        elapsed = round(time.time() - t0, 2)
        events.append(SSEEvent(type="error", data={
            "message": f"LLM timed out after {settings.request_timeout}s",
            "elapsed_s": elapsed,
        }))
        return {
            "fragment_shader": None,
            "pending_events": events,
            "error": "LLM request timed out",
        }
    except Exception:
        # If tool calling fails (e.g., model doesn't support it), fall back
        events.append(SSEEvent(type="thinking", data={
            "text": "Falling back to static example selection...",
        }))
        system_prompt = build_draft_prompt(DRAFT_SYSTEM_PROMPT, user_prompt)
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]
        try:
            response = await _invoke_with_timeout(llm, messages)
        except asyncio.TimeoutError:
            elapsed = round(time.time() - t0, 2)
            events.append(SSEEvent(type="error", data={
                "message": f"LLM timed out after {settings.request_timeout}s",
                "elapsed_s": elapsed,
            }))
            return {
                "fragment_shader": None,
                "pending_events": events,
                "error": "LLM request timed out",
            }

    elapsed = round(time.time() - t0, 2)

    reasoning = extract_reasoning(response.content)
    if reasoning:
        events.append(SSEEvent(type="thinking", data={"text": reasoning}))

    code = extract_glsl(response.content)

    if code is None:
        events.append(SSEEvent(type="error", data={
            "message": "Failed to extract GLSL from LLM response",
            "elapsed_s": elapsed,
        }))
        return {
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
        "fragment_shader": code,
        "pending_events": events,
        "error": None,
    }


# ──────────────────────────────────────────────
# Refine node — no tool calling needed
# ──────────────────────────────────────────────

async def refine_shader(state: AgentState) -> dict:
    """Modify an existing shader based on user feedback."""
    llm = get_llm()
    t0 = time.time()

    events: list[SSEEvent] = []
    events.append(SSEEvent(type="thinking", data={"text": "Refining shader..."}))

    current_shader = state.get("fragment_shader") or ""

    prompt = REFINE_SYSTEM_PROMPT.replace("{current_shader}", current_shader)

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

    # The user's current refinement request as the final human message
    messages.append(HumanMessage(content=state["user_prompt"]))

    try:
        response = await _invoke_with_timeout(llm, messages)
    except asyncio.TimeoutError:
        elapsed = round(time.time() - t0, 2)
        events.append(SSEEvent(type="error", data={
            "message": f"LLM timed out after {settings.request_timeout}s",
            "elapsed_s": elapsed,
        }))
        return {
            "fragment_shader": state.get("fragment_shader"),
            "pending_events": events,
            "error": "LLM request timed out",
        }

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
        "fragment_shader": code,
        "pending_events": events,
        "error": None,
    }
