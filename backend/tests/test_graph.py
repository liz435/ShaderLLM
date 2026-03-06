import asyncio
from unittest.mock import AsyncMock, patch

from langchain_core.messages import AIMessage

from app.agent.graph import build_graph

VALID_SHADER = """```glsl
#version 300 es
precision highp float;
uniform float iTime;
uniform vec2 iResolution;
out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution;
    fragColor = vec4(uv, 0.5 + 0.5 * sin(iTime), 1.0);
}
```"""

BROKEN_SHADER = """```glsl
#version 300 es
precision highp float;
out vec4 fragColor;
void main() {
    fragColor = vec4(undeclaredVar, 0.0, 0.0, 1.0);
}
```"""


def _make_initial_state(prompt: str = "a colorful plasma"):
    return {
        "user_prompt": prompt,
        "fragment_shader": None,
        "validation_result": None,
        "retry_count": 0,
        "max_retries": 3,
        "pending_events": [],
        "mode": "generate",
        "conversation_history": [],
        "repair_history": [],
        "error": None,
    }


def test_graph_valid_first_try():
    """LLM generates a valid shader on first attempt -> no repair needed."""
    mock_llm = AsyncMock()
    mock_llm.ainvoke = AsyncMock(return_value=AIMessage(content=VALID_SHADER))

    with patch("app.agent.nodes.draft.get_llm", return_value=mock_llm):
        graph = build_graph()
        result = asyncio.get_event_loop().run_until_complete(
            graph.ainvoke(_make_initial_state())
        )

    assert result["fragment_shader"] is not None
    assert result["validation_result"].valid is True
    assert result["retry_count"] == 0

    # Check we got a done event
    event_types = [e.type for e in result["pending_events"]]
    assert "done" in event_types


def test_graph_repair_then_valid():
    """LLM generates broken shader, repair fixes it."""
    mock_draft_llm = AsyncMock()
    mock_draft_llm.ainvoke = AsyncMock(return_value=AIMessage(content=BROKEN_SHADER))

    mock_repair_llm = AsyncMock()
    mock_repair_llm.ainvoke = AsyncMock(return_value=AIMessage(content=VALID_SHADER))

    call_count = 0

    def get_llm_side_effect():
        nonlocal call_count
        call_count += 1
        # First call is draft, second is repair
        if call_count == 1:
            return mock_draft_llm
        return mock_repair_llm

    with patch("app.agent.nodes.draft.get_llm", side_effect=get_llm_side_effect), \
         patch("app.agent.nodes.repair.get_llm", return_value=mock_repair_llm):
        graph = build_graph()
        result = asyncio.get_event_loop().run_until_complete(
            graph.ainvoke(_make_initial_state())
        )

    assert result["validation_result"].valid is True
    assert result["retry_count"] == 1

    event_types = [e.type for e in result["pending_events"]]
    assert "repair_attempt" in event_types
    assert "done" in event_types


def test_graph_exhaust_retries():
    """LLM always generates broken shader -> retries exhaust."""
    mock_llm = AsyncMock()
    mock_llm.ainvoke = AsyncMock(return_value=AIMessage(content=BROKEN_SHADER))

    with patch("app.agent.nodes.draft.get_llm", return_value=mock_llm), \
         patch("app.agent.nodes.repair.get_llm", return_value=mock_llm):
        graph = build_graph()
        state = _make_initial_state()
        state["max_retries"] = 2
        result = asyncio.get_event_loop().run_until_complete(
            graph.ainvoke(state)
        )

    assert result["retry_count"] == 2
    assert result["validation_result"].valid is False

    event_types = [e.type for e in result["pending_events"]]
    assert "done" in event_types
