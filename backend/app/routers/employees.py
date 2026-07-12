from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_employee, require_admin
from app.models.employees import Employee
from app.schemas.employees import EmployeeDirectoryItem, EmployeePublic, RoleUpdate, StatusUpdate
from app.utils.errors import not_found, bad_request

router = APIRouter(tags=["Employees"])

VALID_ROLES = {"Admin", "Employee"}
VALID_STATUSES = {"Active", "Inactive"}


@router.get("/employees", response_model=list[EmployeeDirectoryItem])
def list_employees(db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    """Directory list — needed for dropdowns (Owner, Auditor, Department
    Head assignment) and for viewing others' badges/rank."""
    return db.query(Employee).order_by(Employee.first_name, Employee.last_name).all()


@router.get("/employees/{employee_id}", response_model=EmployeePublic)
def get_employee(employee_id: int, db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    """Public profile fields only — no email, no OAuth identity, no other
    sensitive fields. Full record is only ever returned via /auth/me."""
    employee = db.get(Employee, employee_id)
    if not employee:
        raise not_found("Employee not found.")
    return employee


@router.put("/employees/{employee_id}/role", response_model=EmployeePublic)
def update_employee_role(
    employee_id: int,
    payload: RoleUpdate,
    db: Session = Depends(get_db),
    _: Employee = Depends(require_admin),
):
    """The ONLY place role is ever changed — direct implementation of the
    'no self-assigned admin roles' security rule. Only an existing Admin
    can call this; role is never accepted anywhere else in the app."""
    if payload.role not in VALID_ROLES:
        raise bad_request(f"Invalid role '{payload.role}'. Must be one of: {', '.join(sorted(VALID_ROLES))}.")

    employee = db.get(Employee, employee_id)
    if not employee:
        raise not_found("Employee not found.")

    employee.role = payload.role
    db.commit()
    db.refresh(employee)
    return employee


@router.put("/employees/{employee_id}/status", response_model=EmployeePublic)
def update_employee_status(
    employee_id: int,
    payload: StatusUpdate,
    db: Session = Depends(get_db),
    _: Employee = Depends(require_admin),
):
    if payload.status not in VALID_STATUSES:
        raise bad_request(f"Invalid status '{payload.status}'. Must be one of: {', '.join(sorted(VALID_STATUSES))}.")

    employee = db.get(Employee, employee_id)
    if not employee:
        raise not_found("Employee not found.")

    employee.status = payload.status
    db.commit()
    db.refresh(employee)
    return employee
