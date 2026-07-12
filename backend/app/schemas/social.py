from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class CsrActivityCreate(BaseModel):
    title: str
    category_id: Optional[int] = None
    description: str
    points_awarded: int = Field(ge=0)
    evidence_required: bool = True
    activity_date: datetime


class CsrActivityUpdate(BaseModel):
    title: Optional[str] = None
    category_id: Optional[int] = None
    description: Optional[str] = None
    points_awarded: Optional[int] = Field(default=None, ge=0)
    evidence_required: Optional[bool] = None
    activity_date: Optional[datetime] = None
    status: Optional[str] = None


class CsrActivityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    category_id: Optional[int] = None
    description: str
    points_awarded: int
    evidence_required: bool
    activity_date: datetime
    status: str


class ParticipationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    employee_id: int
    activity_id: int
    proof_file_path: Optional[str] = None
    approval_status: str
    points_earned: int
    completion_date: Optional[datetime] = None
    created_at: datetime


class ParticipationRejectRequest(BaseModel):
    reason: str


class DiversityMetricCreate(BaseModel):
    department_id: int
    metric_name: str
    metric_value: Decimal


class DiversityMetricOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    department_id: int
    metric_name: str
    metric_value: Decimal
    recorded_at: datetime