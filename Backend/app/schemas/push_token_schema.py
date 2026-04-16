from pydantic import BaseModel


class SavePushTokenRequest(BaseModel):
    token: str
    



class PushNotificationRequest(BaseModel):
    enabled: bool