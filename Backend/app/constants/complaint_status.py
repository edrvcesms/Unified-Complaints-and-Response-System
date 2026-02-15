from enum import Enum

class ComplaintStatus(str, Enum):
    SUBMITTED = "Submitted"
    UNDER_REVIEW = "Under Review"
    RESOLVED = "Resolved"
    
    