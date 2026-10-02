from pydantic import BaseModel

class BarangayMemberBase(BaseModel):
    id: int
    barangay_id: int
    name: str
    position: str

    class Config:
        from_attributes = True
    
class BarangayMemberCreate(BaseModel):
    barangay_id: int | None = None
    name: str
    position: str