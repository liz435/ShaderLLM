from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse

from app.services.conversation import list_conversations, load_conversation
from app.services.logger import list_sessions, load_session, load_shader_file

router = APIRouter()


@router.get("/history")
async def get_history(limit: int = 50, offset: int = 0):
    """List recent generation sessions (summaries)."""
    return list_sessions(limit=limit, offset=offset)


@router.get("/history/{session_id}")
async def get_session(session_id: str):
    """Get full session log including CoT, conversation, events, and shader."""
    session = load_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.get("/history/{session_id}/shader")
async def get_shader(session_id: str):
    """Get the generated shader file for a session."""
    shader = load_shader_file(session_id)
    if shader is None:
        raise HTTPException(status_code=404, detail="Shader file not found")
    return PlainTextResponse(content=shader, media_type="text/plain")


@router.get("/conversations")
async def get_conversations(limit: int = 50, offset: int = 0):
    """List conversation summaries (most recent first)."""
    return list_conversations(limit=limit, offset=offset)


@router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    """Get full conversation with messages and shader."""
    conv = load_conversation(conversation_id)
    if conv is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv.to_dict()
