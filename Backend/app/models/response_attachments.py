from app.database.database import Base
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship

class ResponseAttachments(Base):
    __tablename__ = "response_attachments"

    id = Column(Integer, primary_key=True, index=True)
    response_id = Column(Integer, ForeignKey("response.id"), nullable=False)
    file_url = Column(String, nullable=False)
    media_type = Column(String, nullable=False)  # 'image', 'video', etc.
    created_at = Column(DateTime(timezone=True), nullable=False)

    response = relationship("Response", back_populates="response_attachments")