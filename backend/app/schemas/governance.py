from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class PolicyCreate(BaseModel):
    title: str
    content: str
    effective_date: date


class PolicyUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    effective_date: Optional[date] = None
    status: Optional[str] = None


class PolicyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    content: str
    effective_date: date
    status: str


class PolicyAcknowledgementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    policy_id: int
    employee_id: int
    acknowledged_at: datetime


class AuditCreate(BaseModel):
    title: str
    department_id: Optional[int] = None
    auditor_id: Optional[int] = None


class AuditUpdate(BaseModel):
    title: Optional[str] = None
    auditor_id: Optional[int] = None
    status: Optional[str] = None


class AuditOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    department_id: Optional[int] = None
    conducted_at: datetime
    auditor_id: Optional[int] = None
    status: str


class ComplianceIssueCreate(BaseModel):
    audit_id: int
    severity: str
    description: str
    owner_id: int
    due_date: date


class ComplianceIssueUpdate(BaseModel):
    severity: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[date] = None


class ComplianceIssueOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    audit_id: int
    severity: str
    description: str
    owner_id: int
    due_date: date
    status: str
    is_overdue: Optional[bool] = None
    created_at: datetime