from app.database.database import Base
from sqlalchemy import Column, Float, ForeignKey, Integer


class CategoryConfigModel(Base):
    """
    Stores per-category configuration: base severity weight and time window.
    OCP: Adding new config fields here doesn't break the domain or use-cases.
    """
    __tablename__ = "category_configs"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("category.id"), nullable=False, unique=True)
    base_severity_weight = Column(Float, nullable=False, default=2.0)  # 1.0–5.0
    time_window_hours = Column(Float, nullable=False, default=24.0)
    similarity_threshold = Column(Float, nullable=False, default=0.65)  # tunable per category
