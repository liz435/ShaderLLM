from typing import Literal

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    llm_provider: Literal["openai", "anthropic"] = "anthropic"
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    openai_model: str = "gpt-4o"
    anthropic_model: str = "claude-sonnet-4-20250514"
    glslang_path: str = "glslangValidator"
    max_retries: int = 3
    max_tokens: int = 4096
    temperature: float = 0.4
    temperature_repair: float = 0.15
    temperature_refine: float = 0.3
    request_timeout: int = 60
    llm_max_retries: int = 2

    # Rate limiting
    rate_limit_rpm: int = 20  # max requests per minute per IP
    max_request_body_bytes: int = 100_000  # 100 KB max request body

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
