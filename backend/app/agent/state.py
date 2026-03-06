from typing import Annotated, Literal

from typing_extensions import TypedDict

from app.models.events import SSEEvent
from app.tools.glsl_validator import ValidationResult


def _concat_events(existing: list[SSEEvent], new: list[SSEEvent]) -> list[SSEEvent]:
    """Reducer that accumulates SSE events across nodes."""
    return existing + new


class ConversationTurn(TypedDict):
    role: str
    content: str


class RepairAttempt(TypedDict):
    errors: str
    shader_snippet: str


def _concat_repairs(existing: list[RepairAttempt], new: list[RepairAttempt]) -> list[RepairAttempt]:
    """Reducer that accumulates repair history across nodes."""
    return existing + new


class AgentState(TypedDict):
    # User's original prompt
    user_prompt: str

    # Generated GLSL code
    fragment_shader: str | None

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
    conversation_history: list[ConversationTurn]

    # History of failed repair attempts (structured error recovery)
    repair_history: Annotated[list[RepairAttempt], _concat_repairs]

    # Clarification question (if prompt was too vague)
    clarification: str | None

    # DSL support
    use_dsl: bool
    dsl_spec: dict | None

    # Prompt version override (None = latest)
    prompt_version: int | None

    # Error message if unrecoverable
    error: str | None
