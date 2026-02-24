from pydantic import BaseModel
from datetime import datetime

class AttachmentBaseModel(BaseModel):
      id: int
      file_name: str
      file_path: str
      file_type: str
      file_size: int
      uploaded_at: datetime
      complaint_id: int
      uploaded_by: int