"""Consistent error handling for LangGraph agent nodes."""

import functools
import logging

from app.models.events import SSEEvent

log = logging.getLogger(__name__)


def safe_node(func):
    """Decorator that wraps agent node functions with consistent error handling.

    If the node raises an unhandled exception, this emits an error SSE event
    and returns a state update that won't crash the graph.
    """

    @functools.wraps(func)
    async def wrapper(state, *args, **kwargs):
        try:
            return await func(state, *args, **kwargs)
        except Exception as e:
            log.exception("Unhandled error in node %s", func.__name__)
            error_event = SSEEvent(
                type="error",
                data={"message": f"Internal error in {func.__name__}: {e}"},
            )
            return {
                "pending_events": [error_event],
                "error": str(e),
            }

    return wrapper
