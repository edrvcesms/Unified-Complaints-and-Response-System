from enum import Enum

class RejectionCategory(Enum):
    SPAM = "Spam / Nonsense"
    FALSE_REPORT = "False Report / Misleading"
    INCOMPLETE = "Incomplete / Lacking details"
