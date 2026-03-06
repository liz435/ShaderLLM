import time
from typing import Literal

from pydantic import BaseModel, Field


class SSEEvent(BaseModel):
    type: Literal[
        "thinking",
        "text_delta",
        "shader_code",
        "validation",
        "repair_start",
        "repair_attempt",
        "clarification",
        "error",
        "done",
    ]
    data: dict
    timestamp: float = Field(default_factory=time.time)
