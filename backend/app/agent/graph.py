from langgraph.graph import END, START, StateGraph

from app.agent.nodes.draft import draft_shader, refine_shader
from app.agent.nodes.draft_dsl import draft_shader_dsl
from app.agent.nodes.finalize import finalize
from app.agent.nodes.repair import repair_shader
from app.agent.nodes.validate import validate_shader
from app.agent.state import AgentState
from app.agent.utils import classify_prompt_complexity


def route_after_start(state: AgentState) -> str:
    """Route to draft_dsl, draft, or refine based on mode and prompt complexity."""
    if state.get("mode") == "refine" and state.get("fragment_shader"):
        return "refine"

    # Use DSL path for standard prompts, direct GLSL for complex ones
    complexity = classify_prompt_complexity(state.get("user_prompt", ""))
    if complexity == "dsl":
        return "draft_dsl"
    return "draft"


def route_after_dsl_draft(state: AgentState) -> str:
    """After DSL draft: validate if we got GLSL, fallback to direct draft otherwise."""
    if state.get("error") == "dsl_fallback":
        return "draft"
    if state.get("fragment_shader"):
        return "validate"
    return "draft"


def route_after_draft(state: AgentState) -> str:
    """Route after draft: clarification skips validation, otherwise validate."""
    if state.get("clarification"):
        return "finalize"
    return "validate"


def route_after_validate(state: AgentState) -> str:
    """Decide whether to finalize, repair, or give up."""
    vr = state.get("validation_result")

    # Valid shader -> finalize
    if vr and vr.valid:
        return "finalize"

    # No shader at all (extraction failed) -> finalize with error
    if not state.get("fragment_shader"):
        return "finalize"

    # Retries remaining -> repair
    if state["retry_count"] < state["max_retries"]:
        return "repair"

    # Exhausted retries -> finalize with best effort
    return "finalize"


def build_graph():
    """Build and compile the shader generation graph.

    Graph topology:
        START → [draft_dsl | draft | refine] → validate → [finalize | repair → validate → ...]

    The DSL path (draft_dsl) generates a compact JSON spec compiled to GLSL.
    If DSL fails, it falls back to the direct draft node.
    """
    graph = StateGraph(AgentState)

    graph.add_node("draft_dsl", draft_shader_dsl)
    graph.add_node("draft", draft_shader)
    graph.add_node("refine", refine_shader)
    graph.add_node("validate", validate_shader)
    graph.add_node("repair", repair_shader)
    graph.add_node("finalize", finalize)

    # START -> route to draft_dsl, draft, or refine
    graph.add_conditional_edges(
        START,
        route_after_start,
        {"draft_dsl": "draft_dsl", "draft": "draft", "refine": "refine"},
    )

    # DSL draft -> conditional: validate (success) or draft (fallback)
    graph.add_conditional_edges(
        "draft_dsl",
        route_after_dsl_draft,
        {"validate": "validate", "draft": "draft"},
    )

    # Draft -> conditional: clarification goes to finalize, else validate
    graph.add_conditional_edges(
        "draft",
        route_after_draft,
        {"finalize": "finalize", "validate": "validate"},
    )

    # Refine always goes to validate
    graph.add_edge("refine", "validate")

    # validate -> conditional routing
    graph.add_conditional_edges(
        "validate",
        route_after_validate,
        {"finalize": "finalize", "repair": "repair"},
    )

    # repair -> validate (re-check the fix)
    graph.add_edge("repair", "validate")

    # finalize -> END
    graph.add_edge("finalize", END)

    return graph.compile()


# Pre-compiled graph singleton — avoids recompilation on every request
compiled_graph = build_graph()
