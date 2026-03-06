from pydantic import BaseModel, Field


class GenerateRequest(BaseModel):
    prompt: str = Field(max_length=2000)
    conversation_id: str | None = None


class RefineRequest(BaseModel):
    prompt: str = Field(max_length=2000)
    current_fragment_shader: str = Field(max_length=50_000)
    history: list[dict] = []
    conversation_id: str | None = None


class ValidateRequest(BaseModel):
    code: str = Field(max_length=50_000)
    stage: str = "fragment"
