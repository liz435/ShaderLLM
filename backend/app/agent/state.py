from typing import Annotated, Literal

from langchain_core.messages import BaseMessage
from langgraph.graph import add_messages
from typing_extensions import TypedDict

from app.models.events import SSEEvent
from app.tools.glsl_validator import ValidationResult


def _concat_events(existing: list[SSEEvent], new: list[SSEEvent]) -> list[SSEEvent]:
    """Reducer that accumulates SSE events across nodes."""
    return existing + new


class AgentState(TypedDict):
    # Conversation messages (LangGraph reducer appends)
    messages: Annotated[list[BaseMessage], add_messages]

    # User's original prompt
    user_prompt: str

    # Generated GLSL code
    fragment_shader: str | None
    vertex_shader: str | None

    # Validation
    validation_result: ValidationResult | None

    # Retry tracking
    retry_count: int
    max_retries: int

    # SSE events to stream (accumulated across nodes via reducer)
    pending_events: Annotated[list[SSEEvent], _concat_events]

    # Mode: generate new or refine existing
    mode: Literal["generate", "refine"]

    # Prior conversation turns for multi-turn context
    conversation_history: list[dict]

    # Error message if unrecoverable
    error: str | None
