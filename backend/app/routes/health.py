from fastapi import APIRouter

from app.config import settings

router = APIRouter()


@router.get("/health")
async def health_check():
    provider = settings.llm_provider
    model = settings.anthropic_model if provider == "anthropic" else settings.openai_model
    return {"status": "ok", "provider": provider, "model": model}
