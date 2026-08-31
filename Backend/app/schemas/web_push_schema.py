from pydantic import BaseModel

class PushSubscriptionKey(BaseModel):
    auth: str
    p256dh: str
    
class PushSubscriptionSchema(BaseModel):
    endpoint: str
    keys: PushSubscriptionKey
    

class PushNotificationPayload(BaseModel):
    title: str
    body: str
    icon: str
    url: str