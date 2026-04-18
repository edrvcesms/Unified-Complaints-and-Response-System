from pydantic import BaseModel
from typing import List, Optional

class SendSMSRequest(BaseModel):
    recipient_number: str
    message: str