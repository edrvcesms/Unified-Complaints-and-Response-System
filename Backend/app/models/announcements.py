from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database.database import Base

class Announcement(Base):
    __tablename__ = "announcement"

    id = Column(Integer, primary_key=True, index=True)
    uploader_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    barangay_account_id = Column(Integer, ForeignKey("barangay_account.id"), nullable=True)
    title = Column(String, nullable=False)
    content = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=True, default=datetime.now(timezone.utc))

    uploader = relationship("User", back_populates="announcements")
    barangay_account = relationship("BarangayAccount", back_populates="announcements")
    media = relationship("AnnouncementMedia", back_populates="announcement", cascade="all, delete-orphan")