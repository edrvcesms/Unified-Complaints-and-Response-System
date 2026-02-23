from enum import Enum

class UserRole(str, Enum):
    USER = "user"
    BARANGAY_OFFICIAL = "barangay_official"
    LGU_OFFICIAL = "lgu_official"
    DEPARTMENT_STAFF = "department_staff"
    