import json
import logging

from fastapi import APIRouter, Request
from langchain_core.messages import HumanMessage
from sse_starlette.sse import EventSourceResponse

from app.agent.graph import build_graph
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


def _make_initial_state(
    prompt: str,
    mode: str = "generate",
    existing_shader: str | None = None,
    conversation_history: list[dict] | None = None,
):
    return {
        "messages": [HumanMessage(content=prompt)],
        "user_prompt": prompt,
        "fragment_shader": existing_shader,
        "vertex_shader": None,
        "validation_result": None,
        "retry_count": 0,
        "max_retries": settings.max_retries,
        "pending_events": [],
        "mode": mode,
        "conversation_history": conversation_history or [],
        "error": None,
    }


def _capture_event(session: SessionLog, event_type: str, data: dict):
    """Capture an SSE event into the session log, routing to the right field."""
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

    elif event_type == "done":
        session.finalize(
            shader=data.get("shader"),
            valid=data.get("valid", False),
            retry_count=data.get("retries", 0),
            error=data.get("error"),
        )


def _capture_messages(session: SessionLog, state_update: dict):
    """Capture LLM conversation messages from a node's state update."""
    for msg in state_update.get("messages", []):
        role = getattr(msg, "type", "unknown")  # "human", "ai", "system"
        content = getattr(msg, "content", "")
        if content:
            session.add_message(role, content)


def _get_or_create_conversation(conversation_id: str | None, prompt: str) -> Conversation:
    """Load existing conversation or create a new one."""
    if conversation_id:
        conv = load_conversation(conversation_id)
        if conv is not None:
            return conv
    return create_conversation(prompt)


@router.post("/generate")
async def generate_shader(request: Request, body: GenerateRequest):
    """SSE endpoint: generate a shader from a natural language prompt."""
    conversation = _get_or_create_conversation(body.conversation_id, body.prompt)
    conversation.add_message("user", body.prompt)

    session = create_session(body.prompt, mode="generate")
    session.add_message("human", body.prompt)
    conversation.link_run(session.session_id)

    async def event_stream():
        graph = build_graph()
        state = _make_initial_state(body.prompt)

        try:
            async for event in graph.astream(state, stream_mode="updates"):
                for node_name, state_update in event.items():
                    _capture_messages(session, state_update)

                    for sse_event in state_update.get("pending_events", []):
                        _capture_event(session, sse_event.type, sse_event.data)

                        if await request.is_disconnected():
                            session.save()
                            conversation.save()
                            return

                        # Update conversation shader on shader_code events
                        if sse_event.type == "shader_code":
                            conversation.current_shader = sse_event.data.get("code")

                        yield {
                            "event": sse_event.type,
                            "data": json.dumps({
                                **sse_event.data,
                                "session_id": session.session_id,
                                "conversation_id": conversation.conversation_id,
                            }),
                        }
        except Exception as e:
            log.exception("Error during shader generation")
            session.finalize(shader=None, valid=False, retry_count=0, error=str(e))
            yield {"event": "error", "data": json.dumps({"message": str(e)})}
        finally:
            # Add assistant summary to conversation
            if session.valid:
                retries = session.retry_count
                suffix = f" ({retries} repair{'s' if retries != 1 else ''})" if retries > 0 else ""
                msg = f"Shader generated successfully{suffix}."
            elif session.final_shader:
                msg = "Shader generated with potential errors."
            else:
                msg = "Shader generation failed."
            conversation.add_message("assistant", msg)
            conversation.save()
            session.save()
            log.info(
                "Session %s completed: valid=%s retries=%d elapsed=%.1fs",
                session.session_id, session.valid, session.retry_count, session.total_elapsed_s,
            )

    return EventSourceResponse(event_stream())


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

    async def event_stream():
        graph = build_graph()
        state = _make_initial_state(
            body.prompt,
            mode="refine",
            existing_shader=body.current_fragment_shader,
            conversation_history=body.history,
        )

        try:
            async for event in graph.astream(state, stream_mode="updates"):
                for node_name, state_update in event.items():
                    _capture_messages(session, state_update)

                    for sse_event in state_update.get("pending_events", []):
                        _capture_event(session, sse_event.type, sse_event.data)

                        if await request.is_disconnected():
                            session.save()
                            conversation.save()
                            return

                        if sse_event.type == "shader_code":
                            conversation.current_shader = sse_event.data.get("code")

                        yield {
                            "event": sse_event.type,
                            "data": json.dumps({
                                **sse_event.data,
                                "session_id": session.session_id,
                                "conversation_id": conversation.conversation_id,
                            }),
                        }
        except Exception as e:
            log.exception("Error during shader refinement")
            session.finalize(shader=None, valid=False, retry_count=0, error=str(e))
            yield {"event": "error", "data": json.dumps({"message": str(e)})}
        finally:
            if session.valid:
                retries = session.retry_count
                suffix = f" ({retries} repair{'s' if retries != 1 else ''})" if retries > 0 else ""
                msg = f"Shader refined successfully{suffix}."
            elif session.final_shader:
                msg = "Shader refined with potential errors."
            else:
                msg = "Shader refinement failed."
            conversation.add_message("assistant", msg)
            conversation.save()
            session.save()
            log.info(
                "Session %s completed: valid=%s retries=%d elapsed=%.1fs",
                session.session_id, session.valid, session.retry_count, session.total_elapsed_s,
            )

    return EventSourceResponse(event_stream())


@router.post("/validate")
async def validate_shader_endpoint(body: ValidateRequest):
    """Non-streaming: validate shader code and return result."""
    result = validate_glsl(body.code, body.stage)
    return {
        "valid": result.valid,
        "errors": [e.model_dump() for e in result.errors],
        "raw_output": result.raw_output,
    }
