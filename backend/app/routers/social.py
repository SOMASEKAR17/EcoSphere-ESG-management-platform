from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_employee, require_admin
from app.models.employees import Employee
from app.models.social import CsrActivity, EmployeeParticipation, DiversityMetric
from app.models.config import EsgConfig
from app.schemas.social import (
    CsrActivityCreate, CsrActivityUpdate, CsrActivityOut,
    ParticipationOut, ParticipationRejectRequest,
    DiversityMetricCreate, DiversityMetricOut,
)
from app.services.scoring_engine import recalculate_department_score
from app.services.badge_engine import check_and_award_badges
from app.services.notification_service import create_notification
from app.utils.uploads import save_proof_file
from app.utils.errors import not_found, bad_request, conflict

router = APIRouter(tags=["Social"])


# ---- CSR Activities ---------------------------------------------------
@router.get("/csr-activities", response_model=list[CsrActivityOut])
def list_csr_activities(db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    return db.query(CsrActivity).order_by(CsrActivity.activity_date.desc()).all()


@router.post("/csr-activities", response_model=CsrActivityOut, status_code=201)
def create_csr_activity(payload: CsrActivityCreate, db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    activity = CsrActivity(**payload.model_dump())
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity


@router.put("/csr-activities/{activity_id}", response_model=CsrActivityOut)
def update_csr_activity(activity_id: int, payload: CsrActivityUpdate, db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    activity = db.get(CsrActivity, activity_id)
    if not activity:
        raise not_found("CSR activity not found.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(activity, field, value)
    db.commit()
    db.refresh(activity)
    return activity


@router.delete("/csr-activities/{activity_id}")
def delete_csr_activity(activity_id: int, db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    activity = db.get(CsrActivity, activity_id)
    if not activity:
        raise not_found("CSR activity not found.")
    activity.status = "Closed"
    db.commit()
    return {"detail": "CSR activity closed."}


# ---- Employee Participation ------------------------------------------
@router.post("/csr-activities/{activity_id}/participate", response_model=ParticipationOut, status_code=201)
async def participate_in_csr_activity(
    activity_id: int,
    proof_file: Optional[UploadFile] = File(default=None),
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee),
):
    activity = db.get(CsrActivity, activity_id)
    if not activity:
        raise not_found("CSR activity not found.")

    existing = (
        db.query(EmployeeParticipation)
        .filter(
            EmployeeParticipation.employee_id == current_employee.id,
            EmployeeParticipation.activity_id == activity_id,
        )
        .first()
    )
    if existing:
        raise conflict("You have already joined this CSR activity.")

    config = db.get(EsgConfig, 1)
    evidence_required = activity.evidence_required if activity.evidence_required is not None else (
        config.evidence_required_default if config else True
    )

    proof_path = None
    if proof_file is not None:
        proof_path = await save_proof_file(proof_file, prefix=f"csr{activity_id}_emp{current_employee.id}")
    elif evidence_required:
        raise bad_request("Proof file is required for this activity before it can be submitted.")

    participation = EmployeeParticipation(
        employee_id=current_employee.id,
        activity_id=activity_id,
        proof_file_path=proof_path,
    )
    db.add(participation)
    db.commit()
    db.refresh(participation)
    return participation


@router.get("/csr-participation", response_model=list[ParticipationOut])
def list_csr_participation(status: Optional[str] = Query(default=None), db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    query = db.query(EmployeeParticipation)
    if status:
        query = query.filter(EmployeeParticipation.approval_status == status)
    return query.order_by(EmployeeParticipation.created_at.desc()).all()


@router.get("/csr-participation/me", response_model=list[ParticipationOut])
def my_csr_participation(db: Session = Depends(get_db), current_employee: Employee = Depends(get_current_employee)):
    return (
        db.query(EmployeeParticipation)
        .filter(EmployeeParticipation.employee_id == current_employee.id)
        .order_by(EmployeeParticipation.created_at.desc())
        .all()
    )


@router.put("/csr-participation/{participation_id}/approve", response_model=ParticipationOut)
def approve_csr_participation(participation_id: int, db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    participation = db.get(EmployeeParticipation, participation_id)
    if not participation:
        raise not_found("Participation record not found.")
    if participation.approval_status == "Approved":
        raise bad_request("This participation has already been approved.")

    activity = db.get(CsrActivity, participation.activity_id)
    config = db.get(EsgConfig, 1)
    evidence_required = activity.evidence_required if activity.evidence_required is not None else (
        config.evidence_required_default if config else True
    )
    if evidence_required and not participation.proof_file_path:
        raise bad_request("Proof file is required before approval.")

    employee = db.get(Employee, participation.employee_id)

    participation.approval_status = "Approved"
    participation.points_earned = activity.points_awarded
    participation.completion_date = datetime.now(timezone.utc)

    employee.points_balance = (employee.points_balance or 0) + activity.points_awarded

    create_notification(
        db, employee_id=employee.id, type_="CSR_APPROVED",
        message=f"Your participation in '{activity.title}' was approved. You earned {activity.points_awarded} points.",
        commit=False,
    )
    check_and_award_badges(db, employee.id)
    recalculate_department_score(db, employee.department_id, commit=False)

    db.commit()
    db.refresh(participation)
    return participation


@router.put("/csr-participation/{participation_id}/reject", response_model=ParticipationOut)
def reject_csr_participation(participation_id: int, payload: ParticipationRejectRequest, db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    participation = db.get(EmployeeParticipation, participation_id)
    if not participation:
        raise not_found("Participation record not found.")

    participation.approval_status = "Rejected"

    create_notification(
        db, employee_id=participation.employee_id, type_="CSR_REJECTED",
        message=f"Your CSR participation was rejected. Reason: {payload.reason}",
        commit=False,
    )
    db.commit()
    db.refresh(participation)
    return participation


# ---- Diversity Metrics --------------------------------------------------
@router.get("/diversity-metrics", response_model=list[DiversityMetricOut])
def list_diversity_metrics(department_id: Optional[int] = Query(default=None), db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    query = db.query(DiversityMetric)
    if department_id:
        query = query.filter(DiversityMetric.department_id == department_id)
    return query.all()


@router.post("/diversity-metrics", response_model=DiversityMetricOut, status_code=201)
def create_diversity_metric(payload: DiversityMetricCreate, db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    metric = DiversityMetric(**payload.model_dump())
    db.add(metric)
    db.commit()
    db.refresh(metric)
    return metric