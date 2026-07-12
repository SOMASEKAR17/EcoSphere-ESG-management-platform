from datetime import date
from typing import Any, Optional
from pydantic import BaseModel


class CustomReportFilter(BaseModel):
    department_id: Optional[int] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    module: Optional[str] = None  # Environmental | Social | Governance | Gamification
    employee_id: Optional[int] = None
    challenge_id: Optional[int] = None
    esg_category: Optional[str] = None  # Environmental | Social | Governance


class CustomReportResponse(BaseModel):
    module: str
    filters_applied: dict[str, Any]
    row_count: int
    rows: list[dict[str, Any]]