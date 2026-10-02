from pydantic import BaseModel
from typing import List


class FeedbackPerCategory(BaseModel):
    category_id: int
    category_name: str
    total_feedbacks: int
    average_rating: float
    total_resolved: int
    total_rate: float
    
class CategoryRatesResponse(BaseModel):
    total_resolved: int
    total_rate: float
    average_rate: float
    by_category: List[FeedbackPerCategory]
    
    