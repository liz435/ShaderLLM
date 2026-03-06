from langchain_core.language_models import BaseChatModel
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic

from app.config import settings


def get_llm() -> BaseChatModel:
    """Factory that returns a LangChain chat model based on config."""
    if settings.llm_provider == "openai":
        return ChatOpenAI(
            model=settings.openai_model,
            api_key=settings.openai_api_key,
            temperature=settings.temperature,
            max_tokens=settings.max_tokens,
            max_retries=settings.llm_max_retries,
            streaming=True,
        )
    return ChatAnthropic(
        model=settings.anthropic_model,
        api_key=settings.anthropic_api_key,
        temperature=settings.temperature,
        max_tokens=settings.max_tokens,
        max_retries=settings.llm_max_retries,
        streaming=True,
    )
