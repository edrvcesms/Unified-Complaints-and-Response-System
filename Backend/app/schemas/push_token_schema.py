from pydantic import BaseModel


class SavePushTokenRequest(BaseModel):
    userId: str
    token: str