from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.middleware import BodySizeLimitMiddleware, RateLimitMiddleware
from app.routes import generate, health, history

app = FastAPI(title="ShaderLLM", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(BodySizeLimitMiddleware)

app.include_router(health.router, prefix="/api")
app.include_router(generate.router, prefix="/api")
app.include_router(history.router, prefix="/api")
