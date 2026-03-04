import time
from typing import Literal

from pydantic import BaseModel, Field


class SSEEvent(BaseModel):
    type: Literal[
        "thinking",
        "shader_code",
        "validation",
        "repair_start",
        "repair_attempt",
        "error",
        "done",
    ]
    data: dict
    timestamp: float = Field(default_factory=time.time)
