from enum import Enum

class ComplaintStatus(str, Enum):
    SUBMITTED = "submitted"
    FORWARDED_TO_LGU = "forwarded_to_lgu"
    FORWARDED_TO_DEPARTMENT = "forwarded_to_department"
    RESOLVED_BY_DEPARTMENT = "resolved_by_department"
    RESOLVED_BY_BARANGAY = "resolved_by_barangay"
    REVIEWED_BY_DEPARTMENT = "reviewed_by_department"
    REVIEWED_BY_BARANGAY = "reviewed_by_barangay"
    
    


