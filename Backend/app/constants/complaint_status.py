from enum import Enum

class ComplaintStatus(str, Enum):
    SUBMITTED = "submitted"
    REVIEWED_BY_BARANGAY = "reviewed_by_barangay"
    RESOLVED_BY_BARANGAY = "resolved_by_barangay"
    FORWARDED_TO_LGU = "forwarded_to_lgu"
    REVIEWED_BY_LGU = "reviewed_by_lgu"
    RESOLVED_BY_LGU = "resolved_by_lgu"
    RESOLVED_BY_DEPARTMENT = "resolved_by_department"
    FORWARDED_TO_DEPARTMENT = "forwarded_to_department"
    REVIEWED_BY_DEPARTMENT = "reviewed_by_department"
    REJECTED = "rejected"
    
    


