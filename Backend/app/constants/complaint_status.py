from enum import Enum

class ComplaintStatus(str, Enum):
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    RESOLVED = "resolved"
    FORWARDED_TO_LGU = "forwarded_to_lgu"
    FORWARDED_TO_DEPARTMENT = "forwarded_to_department"
    
    