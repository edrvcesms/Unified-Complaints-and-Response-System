from app.database.database import Base
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Table
from sqlalchemy.orm import relationship
from datetime import datetime, timezone


response_barangay_members = Table(
    "response_barangay_members",
    Base.metadata,
    Column("response_id", ForeignKey("response.id", ondelete="CASCADE"), primary_key=True),
    Column("barangay_member_id", ForeignKey("barangay_members.id", ondelete="CASCADE"), primary_key=True),
)

class Response(Base):
    __tablename__ = "response"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=True, index=True)
    responder_id = Column(Integer, ForeignKey("user.id"), nullable=False, index=True)
    actions_taken = Column(String, nullable=False)
    response_date = Column(DateTime(timezone=True), nullable=False, default=datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=True, default=datetime.now(timezone.utc))

    incident = relationship("IncidentModel", back_populates="responses")
    user = relationship("User", back_populates="responses")
    response_attachments = relationship("ResponseAttachments", back_populates="response")
    barangay_members = relationship(
        "BarangayMember",
        secondary=response_barangay_members,
        back_populates="responses",
        lazy="selectin",
    )