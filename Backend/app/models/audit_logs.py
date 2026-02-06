from app.database.database import Base
from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey
from sqlalchemy.orm import relationship

class AuditLogs(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    action = Column(String, nullable=False)
    entity_type = Column(String, nullable=False)
    ip_address = Column(String, nullable=False)
    timestamp = Column(Date, nullable=False)

    user = relationship("User", back_populates="audit_logs")