from pydantic import BaseModel


class GenerateRequest(BaseModel):
    prompt: str
    conversation_id: str | None = None


class RefineRequest(BaseModel):
    prompt: str
    current_fragment_shader: str
    current_vertex_shader: str = ""
    history: list[dict] = []
    conversation_id: str | None = None


class ValidateRequest(BaseModel):
    code: str
    stage: str = "fragment"
