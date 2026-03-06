import asyncio
import json
import logging
from typing import Any

from fastapi import APIRouter, Request
from langchain_core.callbacks import AsyncCallbackHandler
from sse_starlette.sse import EventSourceResponse

from app.agent.graph import compiled_graph
from app.config import settings
from app.models.requests import GenerateRequest, RefineRequest, ValidateRequest
from app.services.conversation import (
    Conversation,
    create_conversation,
    load_conversation,
)
from app.services.logger import SessionLog, create_session
from app.tools.glsl_validator import validate_glsl

log = logging.getLogger(__name__)

router = APIRouter()


# ──────────────────────────────────────────────
# Token streaming callback
# ──────────────────────────────────────────────

class TokenStreamHandler(AsyncCallbackHandler):
    """Pushes LLM token deltas to an asyncio queue for real-time SSE streaming.

    In refine mode, only the <reasoning> section is streamed. Code block tokens
    are suppressed since the final shader arrives via the shader_code event.
    """

    def __init__(self, queue: asyncio.Queue, suppress_code: bool = False):
        self.queue = queue
        self._suppress_code = suppress_code
        self._buf = ""
        self._in_code_block = False

    async def on_llm_new_token(self, token: str, **kwargs: Any) -> None:
        if not token:
            return

        if self._suppress_code:
            self._buf += token
            # Detect code fence transitions
            if not self._in_code_block and "```" in self._buf:
                # Entered a code block — stream everything before the fence
                idx = self._buf.index("```")
                before = self._buf[:idx]
                if before.strip():
                    await self.queue.put(("text_delta", before))
                self._in_code_block = True
                self._buf = ""
                return
            if self._in_code_block:
                # Check for closing fence
                if "```" in self._buf.split("\n", 1)[-1] if "\n" in self._buf else False:
                    self._in_code_block = False
                self._buf = ""
                return
            # Not in code block — flush buffer
            await self.queue.put(("text_delta", token))
            self._buf = self._buf[-10:]  # Keep small tail for fence detection
        else:
            await self.queue.put(("text_delta", token))


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def _make_initial_state(
    prompt: str,
    mode: str = "generate",
    existing_shader: str | None = None,
    conversation_history: list[dict] | None = None,
):
    return {
        "user_prompt": prompt,
        "fragment_shader": existing_shader,
        "retry_count": 0,
        "max_retries": settings.max_retries,
        "pending_events": [],
        "mode": mode,
        "conversation_history": conversation_history or [],
        "repair_history": [],
    }


def _capture_event(session: SessionLog, event_type: str, data: dict):
    """Capture an SSE event into the session log, routing to the right field."""
    if event_type == "text_delta":
        return  # Don't log individual token deltas

    session.add_event(event_type, data)

    if event_type == "thinking":
        session.add_thinking(data.get("text", ""))
    elif event_type == "validation":
        session.add_validation(
            valid=data.get("valid", False),
            errors=data.get("errors", []),
            retry=session.retry_count,
        )
    elif event_type == "repair_attempt":
        session.retry_count = data.get("attempt", 0)
    elif event_type == "clarification":
        session.add_thinking(f"Clarification: {data.get('question', '')}")
    elif event_type == "done":
        session.finalize(
            shader=data.get("shader"),
            valid=data.get("valid", False),
            retry_count=data.get("retries", 0),
            error=data.get("error"),
        )


def _get_or_create_conversation(conversation_id: str | None, prompt: str) -> Conversation:
    """Load existing conversation or create a new one."""
    if conversation_id:
        conv = load_conversation(conversation_id)
        if conv is not None:
            return conv
    return create_conversation(prompt)


# ──────────────────────────────────────────────
# SSE stream with real-time token streaming
# ──────────────────────────────────────────────

async def _run_graph_stream(
    request: Request,
    session: SessionLog,
    conversation: Conversation,
    state: dict,
    mode: str,
):
    """Shared SSE streaming logic with real-time token deltas."""
    queue: asyncio.Queue = asyncio.Queue()
    handler = TokenStreamHandler(queue, suppress_code=(mode == "refine"))
    config = {"callbacks": [handler]}

    ids = {
        "session_id": session.session_id,
        "conversation_id": conversation.conversation_id,
    }

    async def _run_graph():
        """Run the LangGraph graph, pushing node-level events to the queue."""
        try:
            async for event in compiled_graph.astream(
                state, config=config, stream_mode="updates"
            ):
                for _node_name, state_update in event.items():
                    for sse_event in state_update.get("pending_events", []):
                        await queue.put(("sse", sse_event))
        except Exception as e:
            await queue.put(("error", e))
        finally:
            await queue.put(("end", None))

    task = asyncio.create_task(_run_graph())

    try:
        while True:
            if await request.is_disconnected():
                task.cancel()
                break

            try:
                msg_type, payload = await asyncio.wait_for(queue.get(), timeout=0.5)
            except asyncio.TimeoutError:
                continue

            if msg_type == "end":
                break

            if msg_type == "error":
                log.exception("Error during shader %s", mode, exc_info=payload)
                session.finalize(shader=None, valid=False, retry_count=0, error=str(payload))
                yield {"event": "error", "data": json.dumps({"message": str(payload)})}
                break

            if msg_type == "text_delta":
                yield {
                    "event": "text_delta",
                    "data": json.dumps({"text": payload, **ids}),
                }
                continue

            if msg_type == "sse":
                sse_event = payload
                _capture_event(session, sse_event.type, sse_event.data)

                if sse_event.type == "shader_code":
                    conversation.current_shader = sse_event.data.get("code")

                yield {
                    "event": sse_event.type,
                    "data": json.dumps({**sse_event.data, **ids}),
                }
    finally:
        if not task.done():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

        verb = "generated" if mode == "generate" else "refined"
        if session.valid:
            retries = session.retry_count
            suffix = f" ({retries} repair{'s' if retries != 1 else ''})" if retries > 0 else ""
            msg = f"Shader {verb} successfully{suffix}."
        elif session.final_shader:
            msg = f"Shader {verb} with potential errors."
        else:
            msg = f"Shader {mode} failed."
        conversation.add_message("assistant", msg)
        conversation.save()
        session.save()
        log.info(
            "Session %s completed: valid=%s retries=%d elapsed=%.1fs",
            session.session_id, session.valid, session.retry_count, session.total_elapsed_s,
        )


# ──────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────

@router.post("/generate")
async def generate_shader(request: Request, body: GenerateRequest):
    """SSE endpoint: generate a shader from a natural language prompt."""
    conversation = _get_or_create_conversation(body.conversation_id, body.prompt)
    conversation.add_message("user", body.prompt)

    session = create_session(body.prompt, mode="generate")
    session.add_message("human", body.prompt)
    conversation.link_run(session.session_id)

    state = _make_initial_state(body.prompt)
    return EventSourceResponse(_run_graph_stream(request, session, conversation, state, "generate"))


@router.post("/refine")
async def refine_shader(request: Request, body: RefineRequest):
    """SSE endpoint: refine an existing shader based on feedback."""
    conversation = _get_or_create_conversation(body.conversation_id, body.prompt)
    conversation.add_message("user", body.prompt)

    session = create_session(body.prompt, mode="refine")
    session.add_message("human", body.prompt)
    conversation.link_run(session.session_id)

    if body.current_fragment_shader:
        session.add_message("system", f"[existing shader: {len(body.current_fragment_shader)} chars]")

    state = _make_initial_state(
        body.prompt,
        mode="refine",
        existing_shader=body.current_fragment_shader,
        conversation_history=body.history,
    )
    return EventSourceResponse(_run_graph_stream(request, session, conversation, state, "refine"))


@router.post("/validate")
async def validate_shader_endpoint(body: ValidateRequest):
    """Non-streaming: validate shader code and return result."""
    result = validate_glsl(body.code, body.stage)
    return {
        "valid": result.valid,
        "errors": [e.model_dump() for e in result.errors],
        "raw_output": result.raw_output,
    }
