import json
import shutil
import tempfile
from pathlib import Path
from unittest.mock import patch

from app.services.logger import (
    SessionLog,
    create_session,
    list_sessions,
    load_session,
    load_shader_file,
)

# Use a temp directory for all storage tests
_tmp = tempfile.mkdtemp()
_sessions = Path(_tmp) / "sessions"
_shaders = Path(_tmp) / "shaders"


def setup_module():
    _sessions.mkdir(parents=True, exist_ok=True)
    _shaders.mkdir(parents=True, exist_ok=True)


def teardown_module():
    shutil.rmtree(_tmp, ignore_errors=True)


def _patch_dirs():
    """Patch storage directories to use temp paths."""
    return (
        patch("app.services.logger.SESSIONS_DIR", _sessions),
        patch("app.services.logger.SHADERS_DIR", _shaders),
    )


def test_create_and_save_session():
    p1, p2 = _patch_dirs()
    with p1, p2:
        session = create_session("a plasma effect", mode="generate")
        session.add_message("human", "a plasma effect")
        session.add_thinking("Generating shader...")
        session.add_thinking("Category: Moving")
        session.add_validation(valid=True, errors=[], retry=0)
        session.finalize(
            shader="#version 300 es\nvoid main() {}",
            valid=True,
            retry_count=0,
            error=None,
        )
        session.save()

        # Verify session JSON was saved
        session_path = _sessions / f"{session.session_id}.json"
        assert session_path.exists()

        data = json.loads(session_path.read_text())
        assert data["user_prompt"] == "a plasma effect"
        assert data["valid"] is True
        assert len(data["chain_of_thought"]) == 2
        assert len(data["conversation"]) == 1
        assert len(data["validations"]) == 1

        # Verify shader file was saved
        shader_path = _shaders / f"{session.session_id}.frag"
        assert shader_path.exists()
        assert "void main()" in shader_path.read_text()


def test_load_session():
    p1, p2 = _patch_dirs()
    with p1, p2:
        session = create_session("ripple effect")
        session.finalize(shader="// test", valid=True, retry_count=0, error=None)
        session.save()

        loaded = load_session(session.session_id)
        assert loaded is not None
        assert loaded["user_prompt"] == "ripple effect"
        assert loaded["valid"] is True


def test_load_shader_file():
    p1, p2 = _patch_dirs()
    with p1, p2:
        session = create_session("gradient")
        session.finalize(shader="precision highp float;\nvoid main() { }", valid=True, retry_count=0, error=None)
        session.save()

        shader = load_shader_file(session.session_id)
        assert shader is not None
        assert "void main()" in shader


def test_list_sessions():
    p1, p2 = _patch_dirs()
    with p1, p2:
        # Create a few sessions
        for prompt in ["test1", "test2", "test3"]:
            s = create_session(prompt)
            s.finalize(shader="// shader", valid=True, retry_count=0, error=None)
            s.save()

        sessions = list_sessions(limit=10)
        assert len(sessions) >= 3
        # Most recent first
        assert sessions[0]["created_at"] >= sessions[-1]["created_at"]


def test_nonexistent_session():
    p1, p2 = _patch_dirs()
    with p1, p2:
        assert load_session("nonexistent") is None
        assert load_shader_file("nonexistent") is None


def test_session_summary():
    session = create_session("test summary")
    session.finalize(shader="// code", valid=True, retry_count=1, error=None)
    summary = session.to_summary()
    assert summary["user_prompt"] == "test summary"
    assert summary["valid"] is True
    assert summary["retry_count"] == 1
    assert "session_id" in summary
