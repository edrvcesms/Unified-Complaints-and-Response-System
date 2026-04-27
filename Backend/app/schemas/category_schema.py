from pydantic import BaseModel

class CategoryModel(BaseModel):
    id: int
    category_name: str
    
    class Config:
        from_attributes = True
        
class RejectionCategoryModel(BaseModel):
    id: int
    name: str
    
    class Config:
        from_attributes = True