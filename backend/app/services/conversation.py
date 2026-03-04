"""Conversation manager that groups multiple agent runs into logical sessions.

A Conversation represents a user-visible chat thread. Each generate/refine call
creates a SessionLog (detailed agent run), which gets linked to a Conversation.

Storage layout:
    storage/
    └── conversations/
        ├── {conversation_id}.json
        └── ...
"""

import json
import os
import time
import uuid
from dataclasses import asdict, dataclass, field
from pathlib import Path

_BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent
STORAGE_DIR = _BACKEND_ROOT / "storage"
CONVERSATIONS_DIR = STORAGE_DIR / "conversations"


def _ensure_dirs():
    CONVERSATIONS_DIR.mkdir(parents=True, exist_ok=True)


@dataclass
class Conversation:
    """A logical session grouping multiple agent runs."""

    conversation_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    title: str = ""
    messages: list[dict] = field(default_factory=list)
    current_shader: str | None = None
    agent_runs: list[str] = field(default_factory=list)

    def add_message(self, role: str, content: str):
        self.messages.append({
            "role": role,
            "content": content,
            "timestamp": time.time(),
        })
        self.updated_at = time.time()

    def link_run(self, session_id: str):
        self.agent_runs.append(session_id)
        self.updated_at = time.time()

    def save(self):
        _ensure_dirs()
        path = CONVERSATIONS_DIR / f"{self.conversation_id}.json"
        path.write_text(json.dumps(asdict(self), indent=2, default=str))

    def to_dict(self) -> dict:
        return asdict(self)

    def to_summary(self) -> dict:
        return {
            "conversation_id": self.conversation_id,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "title": self.title,
            "message_count": len(self.messages),
            "current_shader": self.current_shader is not None,
        }


def create_conversation(prompt: str) -> Conversation:
    """Create a new conversation from the first user prompt."""
    return Conversation(title=prompt[:60])


def load_conversation(conversation_id: str) -> Conversation | None:
    """Load a conversation from disk."""
    _ensure_dirs()
    path = CONVERSATIONS_DIR / f"{conversation_id}.json"
    if not path.exists():
        return None
    data = json.loads(path.read_text())
    return Conversation(
        conversation_id=data["conversation_id"],
        created_at=data["created_at"],
        updated_at=data["updated_at"],
        title=data["title"],
        messages=data.get("messages", []),
        current_shader=data.get("current_shader"),
        agent_runs=data.get("agent_runs", []),
    )


def list_conversations(limit: int = 50, offset: int = 0) -> list[dict]:
    """List conversation summaries, most recent first."""
    _ensure_dirs()
    files = sorted(CONVERSATIONS_DIR.glob("*.json"), key=os.path.getmtime, reverse=True)
    results = []
    for f in files[offset:offset + limit]:
        try:
            data = json.loads(f.read_text())
            results.append({
                "conversation_id": data.get("conversation_id"),
                "created_at": data.get("created_at"),
                "updated_at": data.get("updated_at"),
                "title": data.get("title"),
                "message_count": len(data.get("messages", [])),
                "current_shader": data.get("current_shader") is not None,
            })
        except (json.JSONDecodeError, KeyError):
            continue
    return results
