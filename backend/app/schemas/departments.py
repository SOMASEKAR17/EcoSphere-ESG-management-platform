from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class DepartmentCreate(BaseModel):
    name: str
    code: str
    parent_department_id: Optional[int] = None
    head_employee_id: Optional[int] = None


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    parent_department_id: Optional[int] = None
    head_employee_id: Optional[int] = None
    status: Optional[str] = None


class DepartmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    code: str
    parent_department_id: Optional[int] = None
    head_employee_id: Optional[int] = None
    employee_count: int
    status: str
    created_at: datetime
    updated_at: datetime


class CategoryCreate(BaseModel):
    name: str
    type: str = Field(description="'CSR Activity' or 'Challenge'")


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    type: str
    status: str