from langgraph.graph import END, START, StateGraph

from app.agent.nodes.draft import draft_shader, refine_shader
from app.agent.nodes.finalize import finalize
from app.agent.nodes.repair import repair_shader
from app.agent.nodes.validate import validate_shader
from app.agent.state import AgentState


def route_after_start(state: AgentState) -> str:
    """Route to draft or refine based on mode."""
    if state.get("mode") == "refine" and state.get("fragment_shader"):
        return "refine"
    return "draft"


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
        START → [draft | refine] → validate → [finalize | repair → validate → ...]
    """
    graph = StateGraph(AgentState)

    graph.add_node("draft", draft_shader)
    graph.add_node("refine", refine_shader)
    graph.add_node("validate", validate_shader)
    graph.add_node("repair", repair_shader)
    graph.add_node("finalize", finalize)

    # START -> route to draft or refine
    graph.add_conditional_edges(
        START,
        route_after_start,
        {"draft": "draft", "refine": "refine"},
    )

    # Both draft and refine flow into validate
    graph.add_edge("draft", "validate")
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
