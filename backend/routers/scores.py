from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_employee, require_admin
from app.models.employees import Employee
from app.models.departments import Department
from app.models.scores import DepartmentScore
from app.models.config import EsgConfig
from app.schemas.scores import DepartmentScoreOut, OverallScoreOut, DepartmentScoreWithName, ScoreTrendPoint
from app.schemas.settings import WeightsUpdate
from app.services.scoring_engine import (
    get_latest_department_score, get_all_latest_scores, get_overall_score, recalculate_all_departments,
)
from app.utils.errors import not_found, bad_request

router = APIRouter(tags=["Scores"])


@router.get("/scores/department/{department_id}", response_model=DepartmentScoreOut)
def get_department_score(department_id: int, db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    department = db.get(Department, department_id)
    if not department:
        raise not_found("Department not found.")
    score = get_latest_department_score(db, department_id)
    if score is None:
        from app.services.scoring_engine import recalculate_department_score
        score = recalculate_department_score(db, department_id, commit=True)
    return score


@router.get("/scores/departments", response_model=list[DepartmentScoreWithName])
def get_all_department_scores(db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    departments = {d.id: d.name for d in db.query(Department).all()}
    scores = get_all_latest_scores(db)
    return [
        DepartmentScoreWithName(
            department_id=s.department_id,
            department_name=departments.get(s.department_id, "Unknown"),
            environmental_score=s.environmental_score,
            social_score=s.social_score,
            governance_score=s.governance_score,
            total_score=s.total_score,
            calculated_at=s.calculated_at,
        )
        for s in scores
    ]


@router.get("/scores/overall", response_model=OverallScoreOut)
def overall_score(db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    return OverallScoreOut(overall_score=get_overall_score(db), calculated_at=datetime.now(timezone.utc))


@router.get("/scores/trend", response_model=list[ScoreTrendPoint])
def score_trend(department_id: int | None = None, db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    query = db.query(DepartmentScore)
    if department_id:
        query = query.filter(DepartmentScore.department_id == department_id)
    return query.order_by(DepartmentScore.calculated_at).all()


@router.put("/config/weights")
def update_weights(payload: WeightsUpdate, db: Session = Depends(get_db), _: Employee = Depends(require_admin)):
    total = payload.env_weight + payload.social_weight + payload.governance_weight
    if total != 100:
        raise bad_request(
            f"Environmental, Social, and Governance weights must sum to 100. Received: {total}."
        )

    config = db.get(EsgConfig, 1)
    config.env_weight = payload.env_weight
    config.social_weight = payload.social_weight
    config.governance_weight = payload.governance_weight
    config.updated_at = datetime.now(timezone.utc)
    db.commit()

    snapshots = recalculate_all_departments(db)
    return {
        "detail": "Weights updated. All department scores recalculated.",
        "env_weight": float(config.env_weight),
        "social_weight": float(config.social_weight),
        "governance_weight": float(config.governance_weight),
        "departments_recalculated": len(snapshots),
    }