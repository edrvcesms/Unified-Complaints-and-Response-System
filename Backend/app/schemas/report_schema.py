from datetime import date

from pydantic import BaseModel


class ComplaintReportRequest(BaseModel):
    from_date: date
    to_date: date