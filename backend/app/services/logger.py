"""Session logger that persists agent runs to disk.

Each generation/refinement session gets a unique ID and is stored as a JSON file
containing the full chain-of-thought, conversation messages, validation results,
and a link to the generated shader file.

Storage layout:
    storage/
    ├── sessions/
    │   ├── {session_id}.json        # Full session log
    │   └── ...
    └── shaders/
        ├── {session_id}.frag        # Generated shader file
        └── ...
"""

import json
import os
import time
import uuid
from pathlib import Path
from dataclasses import dataclass, field, asdict

from app.config import settings
from app.services.filelock import atomic_write

# Resolve storage paths relative to backend/ root
_BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent
STORAGE_DIR = _BACKEND_ROOT / "storage"
SESSIONS_DIR = STORAGE_DIR / "sessions"
SHADERS_DIR = STORAGE_DIR / "shaders"


def _ensure_dirs():
    SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
    SHADERS_DIR.mkdir(parents=True, exist_ok=True)


@dataclass
class SessionLog:
    """Complete log of a single agent run."""

    session_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    created_at: float = field(default_factory=time.time)
    mode: str = "generate"  # "generate" or "refine"
    user_prompt: str = ""
    llm_provider: str = ""
    llm_model: str = ""

    # Chain-of-thought: reasoning blocks extracted from LLM responses
    chain_of_thought: list[dict] = field(default_factory=list)

    # Full conversation messages (role + content)
    conversation: list[dict] = field(default_factory=list)

    # Validation history: one entry per validate pass
    validations: list[dict] = field(default_factory=list)

    # All SSE events emitted during the session
    events: list[dict] = field(default_factory=list)

    # Final result
    final_shader: str | None = None
    shader_file: str | None = None  # relative path to .frag file
    valid: bool = False
    retry_count: int = 0
    total_elapsed_s: float = 0.0
    error: str | None = None

    def add_thinking(self, text: str):
        self.chain_of_thought.append({"text": text, "timestamp": time.time()})

    def add_message(self, role: str, content: str):
        self.conversation.append({
            "role": role,
            "content": content[:2000],  # truncate very long messages
            "timestamp": time.time(),
        })

    def add_validation(self, valid: bool, errors: list[dict], retry: int):
        self.validations.append({
            "valid": valid,
            "errors": errors,
            "retry": retry,
            "timestamp": time.time(),
        })

    def add_event(self, event_type: str, data: dict):
        self.events.append({
            "type": event_type,
            "data": data,
            "timestamp": time.time(),
        })

    def finalize(self, shader: str | None, valid: bool, retry_count: int, error: str | None):
        self.final_shader = shader
        self.valid = valid
        self.retry_count = retry_count
        self.error = error
        self.total_elapsed_s = round(time.time() - self.created_at, 2)

    def save(self):
        """Persist the session log to disk and save the shader file."""
        _ensure_dirs()

        # Save shader file
        if self.final_shader:
            shader_path = SHADERS_DIR / f"{self.session_id}.frag"
            atomic_write(shader_path, self.final_shader)
            self.shader_file = f"shaders/{self.session_id}.frag"

        # Save session JSON
        session_path = SESSIONS_DIR / f"{self.session_id}.json"
        atomic_write(session_path, json.dumps(asdict(self), indent=2, default=str))

    def to_summary(self) -> dict:
        """Return a lightweight summary for the history API."""
        return {
            "session_id": self.session_id,
            "created_at": self.created_at,
            "mode": self.mode,
            "user_prompt": self.user_prompt,
            "valid": self.valid,
            "retry_count": self.retry_count,
            "total_elapsed_s": self.total_elapsed_s,
            "shader_file": self.shader_file,
            "error": self.error,
        }


def create_session(prompt: str, mode: str = "generate") -> SessionLog:
    """Create a new session log."""
    provider = settings.llm_provider
    model = settings.anthropic_model if provider == "anthropic" else settings.openai_model
    session = SessionLog(
        mode=mode,
        user_prompt=prompt,
        llm_provider=provider,
        llm_model=model,
    )
    return session


def load_session(session_id: str) -> dict | None:
    """Load a session log from disk."""
    path = SESSIONS_DIR / f"{session_id}.json"
    if not path.exists():
        return None
    return json.loads(path.read_text())


def list_sessions(limit: int = 50, offset: int = 0) -> list[dict]:
    """List session summaries, most recent first."""
    _ensure_dirs()
    files = sorted(SESSIONS_DIR.glob("*.json"), key=os.path.getmtime, reverse=True)
    sessions = []
    for f in files[offset:offset + limit]:
        try:
            data = json.loads(f.read_text())
            sessions.append({
                "session_id": data.get("session_id"),
                "created_at": data.get("created_at"),
                "mode": data.get("mode"),
                "user_prompt": data.get("user_prompt"),
                "valid": data.get("valid"),
                "retry_count": data.get("retry_count"),
                "total_elapsed_s": data.get("total_elapsed_s"),
                "shader_file": data.get("shader_file"),
                "error": data.get("error"),
            })
        except (json.JSONDecodeError, KeyError):
            continue
    return sessions


def load_shader_file(session_id: str) -> str | None:
    """Load a saved shader file by session ID."""
    path = SHADERS_DIR / f"{session_id}.frag"
    if not path.exists():
        return None
    return path.read_text()
