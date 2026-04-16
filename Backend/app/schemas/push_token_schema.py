from pydantic import BaseModel


class SavePushTokenRequest(BaseModel):
    token: str