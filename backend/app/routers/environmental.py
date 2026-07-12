from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_employee, require_admin
from app.models.employees import Employee
from app.models.environmental import EmissionFactor, CarbonTransaction, EnvironmentalGoal, ProductEsgProfile
from app.schemas.environmental import (
    EmissionFactorCreate, EmissionFactorUpdate, EmissionFactorOut,
    CarbonTransactionCreate, CarbonTransactionAutoGenerate, CarbonTransactionOut,
    EnvironmentalGoalCreate, EnvironmentalGoalUpdate, EnvironmentalGoalOut,
    ProductEsgProfileCreate, ProductEsgProfileUpdate, ProductEsgProfileOut,
)
from app.services.scoring_engine import recalculate_department_score
from app.utils.errors import not_found, bad_request

router = APIRouter(tags=["Environmental"])


# ---- Emission Factors ----------------------------------------------------
@router.get("/emission-factors", response_model=list[EmissionFactorOut])
def list_emission_factors(db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    return db.query(EmissionFactor).order_by(EmissionFactor.id).all()


@router.post("/emission-factors", response_model=EmissionFactorOut, status_code=201)
def create_emission_factor(payload: EmissionFactorCreate, db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    factor = EmissionFactor(**payload.model_dump())
    db.add(factor)
    db.commit()
    db.refresh(factor)
    return factor


@router.put("/emission-factors/{factor_id}", response_model=EmissionFactorOut)
def update_emission_factor(factor_id: int, payload: EmissionFactorUpdate, db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    factor = db.get(EmissionFactor, factor_id)
    if not factor:
        raise not_found("Emission factor not found.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(factor, field, value)
    db.commit()
    db.refresh(factor)
    return factor


@router.delete("/emission-factors/{factor_id}")
def delete_emission_factor(factor_id: int, db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    factor = db.get(EmissionFactor, factor_id)
    if not factor:
        raise not_found("Emission factor not found.")
    factor.status = "Inactive"
    db.commit()
    return {"detail": "Emission factor deactivated."}


# ---- Carbon Transactions --------------------------------------------------
def _create_transaction(db: Session, payload_dict: dict, logged_by: int) -> CarbonTransaction:
    factor = db.get(EmissionFactor, payload_dict["emission_factor_id"])
    if not factor:
        raise not_found("Emission factor not found.")

    calculated_emission = float(payload_dict["operational_quantity"]) * float(factor.factor_value)

    transaction = CarbonTransaction(
        department_id=payload_dict["department_id"],
        source_type=payload_dict["source_type"],
        source_record_id=payload_dict.get("source_record_id"),
        emission_factor_id=payload_dict["emission_factor_id"],
        operational_quantity=payload_dict["operational_quantity"],
        calculated_emission=calculated_emission,
        logged_by=logged_by,
    )
    db.add(transaction)
    db.flush()

    # Triggers Environmental Score recalculation for the affected department
    recalculate_department_score(db, transaction.department_id, commit=False)

    db.commit()
    db.refresh(transaction)
    return transaction


@router.get("/carbon-transactions", response_model=list[CarbonTransactionOut])
def list_carbon_transactions(
    department_id: Optional[int] = Query(default=None),
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    _: Employee = Depends(get_current_employee),
):
    query = db.query(CarbonTransaction)
    if department_id:
        query = query.filter(CarbonTransaction.department_id == department_id)
    if date_from:
        query = query.filter(CarbonTransaction.transaction_date >= date_from)
    if date_to:
        query = query.filter(CarbonTransaction.transaction_date <= date_to)
    return query.order_by(CarbonTransaction.transaction_date.desc()).offset(offset).limit(limit).all()


@router.post("/carbon-transactions", response_model=CarbonTransactionOut, status_code=201)
def create_carbon_transaction(payload: CarbonTransactionCreate, db: Session = Depends(get_db), employee: Employee = Depends(get_current_employee)):
    return _create_transaction(db, payload.model_dump(), logged_by=employee.id)


@router.get("/carbon-transactions/{transaction_id}", response_model=CarbonTransactionOut)
def get_carbon_transaction(transaction_id: int, db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    transaction = db.get(CarbonTransaction, transaction_id)
    if not transaction:
        raise not_found("Carbon transaction not found.")
    return transaction


@router.post("/carbon-transactions/auto-generate", response_model=CarbonTransactionOut, status_code=201)
def auto_generate_carbon_transaction(payload: CarbonTransactionAutoGenerate, db: Session = Depends(get_db), employee: Employee = Depends(get_current_employee)):
    """Simulated auto-calc path (see build reference Section 12.3): accepts
    a simplified 'operational activity' payload and performs the calculation
    without a human typing the CO2 number directly. This is a documented
    scope cut standing in for a full Purchase/Manufacturing/Expense/Fleet
    source-record pipeline, which is out of scope for this build."""
    return _create_transaction(db, payload.model_dump(), logged_by=employee.id)


# ---- Environmental Goals ---------------------------------------------------
@router.get("/environmental-goals", response_model=list[EnvironmentalGoalOut])
def list_environmental_goals(department_id: Optional[int] = Query(default=None), db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    query = db.query(EnvironmentalGoal)
    if department_id:
        query = query.filter(EnvironmentalGoal.department_id == department_id)
    return query.all()


@router.post("/environmental-goals", response_model=EnvironmentalGoalOut, status_code=201)
def create_environmental_goal(payload: EnvironmentalGoalCreate, db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    goal = EnvironmentalGoal(**payload.model_dump())
    db.add(goal)
    db.commit()
    db.refresh(goal)
    recalculate_department_score(db, goal.department_id, commit=True)
    return goal


@router.put("/environmental-goals/{goal_id}", response_model=EnvironmentalGoalOut)
def update_environmental_goal(goal_id: int, payload: EnvironmentalGoalUpdate, db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    goal = db.get(EnvironmentalGoal, goal_id)
    if not goal:
        raise not_found("Environmental goal not found.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(goal, field, value)
    db.commit()
    db.refresh(goal)
    recalculate_department_score(db, goal.department_id, commit=True)
    return goal


@router.delete("/environmental-goals/{goal_id}")
def delete_environmental_goal(goal_id: int, db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    goal = db.get(EnvironmentalGoal, goal_id)
    if not goal:
        raise not_found("Environmental goal not found.")
    department_id = goal.department_id
    db.delete(goal)
    db.commit()
    recalculate_department_score(db, department_id, commit=True)
    return {"detail": "Environmental goal deleted."}


# ---- Product ESG Profiles --------------------------------------------------
@router.get("/product-esg-profiles", response_model=list[ProductEsgProfileOut])
def list_product_profiles(db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    return db.query(ProductEsgProfile).all()


@router.post("/product-esg-profiles", response_model=ProductEsgProfileOut, status_code=201)
def create_product_profile(payload: ProductEsgProfileCreate, db: Session = Depends(get_db), _: Employee = Depends(require_admin)):
    existing = db.query(ProductEsgProfile).filter(ProductEsgProfile.product_sku == payload.product_sku).first()
    if existing:
        raise bad_request(f"A product with SKU '{payload.product_sku}' already exists.")
    profile = ProductEsgProfile(**payload.model_dump())
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.put("/product-esg-profiles/{profile_id}", response_model=ProductEsgProfileOut)
def update_product_profile(profile_id: int, payload: ProductEsgProfileUpdate, db: Session = Depends(get_db), _: Employee = Depends(require_admin)):
    profile = db.get(ProductEsgProfile, profile_id)
    if not profile:
        raise not_found("Product ESG profile not found.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return profile