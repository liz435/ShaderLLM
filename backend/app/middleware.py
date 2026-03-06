"""Request middleware: rate limiting and body size enforcement."""

import time
from collections import defaultdict

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.config import settings


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory per-IP rate limiter using a sliding window."""

    def __init__(self, app):
        super().__init__(app)
        self._requests: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        # Only rate-limit mutation endpoints
        if request.method != "POST":
            return await call_next(request)

        ip = request.client.host if request.client else "unknown"
        now = time.time()
        window = 60.0  # 1 minute
        max_rpm = settings.rate_limit_rpm

        # Prune old entries
        timestamps = self._requests[ip]
        self._requests[ip] = [t for t in timestamps if now - t < window]

        if len(self._requests[ip]) >= max_rpm:
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Try again in a minute."},
            )

        self._requests[ip].append(now)
        return await call_next(request)


class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    """Reject request bodies that exceed the configured max size."""

    async def dispatch(self, request: Request, call_next):
        if request.method in ("POST", "PUT", "PATCH"):
            content_length = request.headers.get("content-length")
            if content_length and int(content_length) > settings.max_request_body_bytes:
                return JSONResponse(
                    status_code=413,
                    content={"detail": f"Request body too large (max {settings.max_request_body_bytes} bytes)."},
                )
        return await call_next(request)
