"""Atomic file write with advisory file locking."""

import fcntl
import os
import tempfile
from pathlib import Path


def atomic_write(path: Path, content: str) -> None:
    """Write content to path atomically using a temp file + rename.

    Acquires an advisory lock to prevent concurrent writes to the same file.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    lock_path = path.with_suffix(path.suffix + ".lock")

    with open(lock_path, "w") as lock_fd:
        fcntl.flock(lock_fd, fcntl.LOCK_EX)
        try:
            # Write to temp file in the same directory (same filesystem for rename)
            fd, tmp = tempfile.mkstemp(dir=path.parent, suffix=".tmp")
            with os.fdopen(fd, "w") as f:
                f.write(content)
                f.flush()
                os.fsync(f.fileno())
            # Atomic rename
            os.replace(tmp, path)
        finally:
            fcntl.flock(lock_fd, fcntl.LOCK_UN)
