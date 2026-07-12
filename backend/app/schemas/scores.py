from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict


class DepartmentScoreOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    department_id: int
    environmental_score: Decimal
    social_score: Decimal
    governance_score: Decimal
    total_score: Decimal
    calculated_at: datetime


class DepartmentScoreWithName(DepartmentScoreOut):
    department_name: str


class OverallScoreOut(BaseModel):
    overall_score: float
    calculated_at: datetime


class ScoreTrendPoint(BaseModel):
    department_id: int
    total_score: Decimal
    calculated_at: datetime