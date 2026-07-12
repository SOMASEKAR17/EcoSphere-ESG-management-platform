from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_employee, require_admin
from app.models.departments import Department, Category
from app.models.employees import Employee
from app.schemas.departments import (
    DepartmentCreate, DepartmentUpdate, DepartmentOut,
    CategoryCreate, CategoryUpdate, CategoryOut,
)
from app.services.scoring_engine import get_latest_department_score
from app.utils.errors import not_found

router = APIRouter(tags=["Departments & Categories"])


@router.get("/departments", response_model=list[DepartmentOut])
def list_departments(db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    return db.query(Department).order_by(Department.name).all()


@router.post("/departments", response_model=DepartmentOut, status_code=201)
def create_department(payload: DepartmentCreate, db: Session = Depends(get_db), _: Employee = Depends(require_admin)):
    department = Department(**payload.model_dump())
    db.add(department)
    db.commit()
    db.refresh(department)
    return department


@router.get("/departments/{department_id}")
def get_department(department_id: int, db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    department = db.get(Department, department_id)
    if not department:
        raise not_found("Department not found.")
    latest_score = get_latest_department_score(db, department_id)
    return {
        "id": department.id,
        "name": department.name,
        "code": department.code,
        "parent_department_id": department.parent_department_id,
        "head_employee_id": department.head_employee_id,
        "employee_count": department.employee_count,
        "status": department.status,
        "created_at": department.created_at,
        "updated_at": department.updated_at,
        "latest_score": {
            "environmental_score": latest_score.environmental_score,
            "social_score": latest_score.social_score,
            "governance_score": latest_score.governance_score,
            "total_score": latest_score.total_score,
            "calculated_at": latest_score.calculated_at,
        } if latest_score else None,
    }


@router.put("/departments/{department_id}", response_model=DepartmentOut)
def update_department(department_id: int, payload: DepartmentUpdate, db: Session = Depends(get_db), _: Employee = Depends(require_admin)):
    department = db.get(Department, department_id)
    if not department:
        raise not_found("Department not found.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(department, field, value)
    db.commit()
    db.refresh(department)
    return department


@router.delete("/departments/{department_id}", response_model=DepartmentOut)
def delete_department(department_id: int, db: Session = Depends(get_db), _: Employee = Depends(require_admin)):
    """Soft-delete only — never hard-delete a department that may be
    referenced elsewhere (employees, transactions, goals, etc.)."""
    department = db.get(Department, department_id)
    if not department:
        raise not_found("Department not found.")
    department.status = "Inactive"
    db.commit()
    db.refresh(department)
    return department


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(type: Optional[str] = Query(default=None), db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    query = db.query(Category)
    if type:
        query = query.filter(Category.type == type)
    return query.order_by(Category.name).all()


@router.post("/categories", response_model=CategoryOut, status_code=201)
def create_category(payload: CategoryCreate, db: Session = Depends(get_db), _: Employee = Depends(require_admin)):
    category = Category(**payload.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.put("/categories/{category_id}", response_model=CategoryOut)
def update_category(category_id: int, payload: CategoryUpdate, db: Session = Depends(get_db), _: Employee = Depends(require_admin)):
    category = db.get(Category, category_id)
    if not category:
        raise not_found("Category not found.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(category, field, value)
    db.commit()
    db.refresh(category)
    return category


@router.delete("/categories/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db), _: Employee = Depends(require_admin)):
    category = db.get(Category, category_id)
    if not category:
        raise not_found("Category not found.")
    db.delete(category)
    db.commit()
    return {"detail": "Category deleted."}