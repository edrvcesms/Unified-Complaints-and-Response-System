from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database.database import Base

class UserDevice(Base):
    __tablename__ = "user_devices"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    device_id = Column(String, nullable=False)
    model = Column(String, nullable=False)
    brand = Column(String, nullable=False)
    system_name = Column(String, nullable=False)
    app_version = Column(String, nullable=False)
    build_number = Column(String, nullable=False)

    user = relationship("User", back_populates="user_devices")