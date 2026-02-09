from app.database.database import Base
from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey
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
    last_login = Column(Date, nullable=True)
    created_at = Column(Date, nullable=False)
    updated_at = Column(Date, nullable=True)

    report = relationship("Report", back_populates="user")
    barangay_account = relationship("BarangayAccount", back_populates="user")
    comittee_account = relationship("ComitteeAccount", back_populates="user")
    complaint = relationship("Complaint", back_populates="user")
    attachment = relationship("Attachment", back_populates="uploader")
    response = relationship("Response", back_populates="responder")
    feedback = relationship("Feedback", back_populates="user")
    audit_logs = relationship("AuditLogs", back_populates="user")
    notifications = relationship("Notification", back_populates="user")