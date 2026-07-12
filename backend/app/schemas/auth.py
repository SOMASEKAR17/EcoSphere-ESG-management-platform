from pydantic import BaseModel

from app.schemas.employees import EmployeeMe


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    employee: EmployeeMe