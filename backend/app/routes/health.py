from fastapi import APIRouter

from app.agent.prompts import PROMPT_VERSION, get_all_versions
from app.config import settings

router = APIRouter()


@router.get("/health")
async def health_check():
    provider = settings.llm_provider
    model = settings.anthropic_model if provider == "anthropic" else settings.openai_model
    return {
        "status": "ok",
        "provider": provider,
        "model": model,
        "prompt_version": PROMPT_VERSION,
        "prompt_versions": get_all_versions(),
    }
