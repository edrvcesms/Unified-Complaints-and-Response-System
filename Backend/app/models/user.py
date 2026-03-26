from datetime import datetime
from app.database.database import Base
from sqlalchemy import Column, DateTime, Integer, String, Boolean, Date, ForeignKey
from sqlalchemy.orm import relationship

class User(Base):
    __tablename__ = "user"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, index=True)
    middle_name = Column(String, index=True, nullable=True)
    last_name = Column(String, index=True)
    suffix = Column(String, index=True, nullable=True)
    age = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)
    birthdate = Column(Date, nullable=True)
    phone_number = Column(String, unique=True, index=True, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    role = Column(String, default="user")
    barangay = Column(String, nullable=True)
    zip_code = Column(String, nullable=True)
    push_token = Column(String, nullable=True)
    full_address = Column(String, nullable=True)
    latitude = Column(String, nullable=True)
    longitude = Column(String, nullable=True)
    id_type = Column(String, nullable=True)
    id_number = Column(String, nullable=True)
    front_id = Column(String, nullable=True)
    back_id = Column(String, nullable=True)
    selfie_with_id = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    is_administrator = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True)

    barangay_account = relationship("BarangayAccount", back_populates="user", uselist=False)
    department_account = relationship("DepartmentAccount", back_populates="user", uselist=False)
    complaint = relationship("Complaint", back_populates="user", cascade="all, delete-orphan")
    attachment = relationship("Attachment", back_populates="uploader", cascade="all, delete-orphan")
    feedback = relationship("Feedback", back_populates="user")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    announcements = relationship("Announcement", back_populates="uploader", cascade="all, delete-orphan")
    app_feedbacks = relationship("AppFeedback", back_populates="user", cascade="all, delete-orphan")
    incidents = relationship("IncidentModel", back_populates="lgu_account", cascade="all, delete-orphan")
    responses = relationship("Response", back_populates="responder", cascade="all, delete-orphan")