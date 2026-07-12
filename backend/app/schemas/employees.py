from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class EmployeePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    first_name: str
    last_name: str
    department_id: Optional[int] = None
    avatar_url: Optional[str] = None
    xp_balance: int
    role: str


class EmployeeMe(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    first_name: str
    last_name: str
    email: str
    avatar_url: Optional[str] = None
    department_id: Optional[int] = None
    role: str
    status: str
    xp_balance: int
    points_balance: int
    created_at: datetime
    last_login_at: Optional[datetime] = None


class EmployeeDirectoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    first_name: str
    last_name: str
    email: str
    department_id: Optional[int] = None
    role: str
    status: str
    xp_balance: int


class RoleUpdate(BaseModel):
    role: str  # "Admin" | "Employee"


class StatusUpdate(BaseModel):
    status: str  # "Active" | "Inactive"