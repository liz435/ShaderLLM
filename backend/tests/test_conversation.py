import json
import shutil
import tempfile
from pathlib import Path
from unittest.mock import patch

from app.services.conversation import (
    Conversation,
    create_conversation,
    list_conversations,
    load_conversation,
)

_tmp = tempfile.mkdtemp()
_conversations = Path(_tmp) / "conversations"


def setup_module():
    _conversations.mkdir(parents=True, exist_ok=True)


def teardown_module():
    shutil.rmtree(_tmp, ignore_errors=True)


def _patch_dir():
    return patch("app.services.conversation.CONVERSATIONS_DIR", _conversations)


def test_create_and_save_conversation():
    with _patch_dir():
        conv = create_conversation("a plasma effect")
        conv.add_message("user", "a plasma effect")
        conv.link_run("run_abc123")
        conv.current_shader = "#version 300 es\nvoid main() {}"
        conv.add_message("assistant", "Shader generated successfully.")
        conv.save()

        path = _conversations / f"{conv.conversation_id}.json"
        assert path.exists()

        data = json.loads(path.read_text())
        assert data["title"] == "a plasma effect"
        assert len(data["messages"]) == 2
        assert data["messages"][0]["role"] == "user"
        assert data["messages"][1]["role"] == "assistant"
        assert data["agent_runs"] == ["run_abc123"]
        assert "void main()" in data["current_shader"]


def test_load_conversation():
    with _patch_dir():
        conv = create_conversation("ripple effect")
        conv.add_message("user", "ripple effect")
        conv.save()

        loaded = load_conversation(conv.conversation_id)
        assert loaded is not None
        assert loaded.title == "ripple effect"
        assert len(loaded.messages) == 1


def test_load_nonexistent():
    with _patch_dir():
        assert load_conversation("nonexistent") is None


def test_list_conversations():
    with _patch_dir():
        for prompt in ["test1", "test2", "test3"]:
            c = create_conversation(prompt)
            c.add_message("user", prompt)
            c.save()

        convs = list_conversations(limit=10)
        assert len(convs) >= 3
        # Most recent first
        assert convs[0]["updated_at"] >= convs[-1]["updated_at"]


def test_conversation_summary():
    conv = create_conversation("test summary")
    conv.add_message("user", "test summary")
    conv.current_shader = "// code"
    summary = conv.to_summary()
    assert summary["title"] == "test summary"
    assert summary["message_count"] == 1
    assert summary["current_shader"] is True


def test_link_multiple_runs():
    with _patch_dir():
        conv = create_conversation("multi-run test")
        conv.link_run("run_1")
        conv.link_run("run_2")
        conv.save()

        loaded = load_conversation(conv.conversation_id)
        assert loaded is not None
        assert loaded.agent_runs == ["run_1", "run_2"]
