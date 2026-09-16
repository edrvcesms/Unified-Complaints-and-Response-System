from pydantic import BaseModel

class RespondentsModel(BaseModel):
    name: str
    email: str | None = None