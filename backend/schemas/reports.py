from datetime import date
from typing import Optional
from pydantic import BaseModel


class CustomReportFilter(BaseModel):
    department_id: Optional[int] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    module: Optional[str] = None  # Environmental | Social | Governance | Gamification
    employee_id: Optional[int] = None
    challenge_id: Optional[int] = None