from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.employees import Employee

bearer_scheme = HTTPBearer(auto_error=False)


def create_access_token(employee: Employee) -> str:
    """Issue our own signed JWT. Identity/role is ALWAYS derived server-side
    from the DB record being encoded — never accept these fields from a
    client-supplied payload anywhere in the app."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(employee.id),
        "employee_id": employee.id,
        "role": employee.role,
        "department_id": employee.department_id,
        "iat": now,
        "exp": now + timedelta(minutes=settings.JWT_EXPIRY_MINUTES),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
        )


def get_current_employee(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Employee:
    """Resolves the authenticated Employee purely from the JWT. Route
    handlers must use this — and never a client-supplied employee_id — for
    any 'act on my own data' endpoint."""
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token.")

    payload = decode_access_token(credentials.credentials)
    employee_id = payload.get("employee_id")
    employee = db.get(Employee, employee_id)

    if employee is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Employee no longer exists.")
    if employee.status != "Active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account has been deactivated.")

    return employee


def require_admin(current_employee: Employee = Depends(get_current_employee)) -> Employee:
    if current_employee.role != "Admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges are required for this action.")
    return current_employee