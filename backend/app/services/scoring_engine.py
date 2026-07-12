"""
The scoring engine — the heart of EcoSphere.

Principle: scores are NEVER stored as a value someone types in. They are
always derived from underlying transactional data, and recalculated
synchronously as a side effect of the writes that matter (see Section 13
of the build reference). Every recalculation appends a new row to
`department_scores` — it never updates an existing row — so the trend
chart has real history to show.
"""
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.models.departments import Department
from app.models.environmental import EnvironmentalGoal
from app.models.social import EmployeeParticipation, CsrActivity, DiversityMetric
from app.models.governance import PolicyAcknowledgement, EsgPolicy, ComplianceIssue, Audit
from app.models.employees import Employee
from app.models.scores import DepartmentScore
from app.models.config import EsgConfig


def _round2(value) -> float:
    return float(Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def get_config(db: Session) -> EsgConfig:
    config = db.get(EsgConfig, 1)
    if config is None:
        # Defensive fallback — the row is seeded by the schema, but guard anyway.
        config = EsgConfig(
            id=1,
            env_weight=settings.DEFAULT_ENV_WEIGHT,
            social_weight=settings.DEFAULT_SOCIAL_WEIGHT,
            governance_weight=settings.DEFAULT_GOVERNANCE_WEIGHT,
        )
        db.add(config)
        db.flush()
    return config


def calculate_environmental_score(db: Session, department_id: int) -> float:
    """Average of (current_value / target_value), capped at 100%, across all
    Environmental Goals for the department. No goals -> neutral baseline."""
    goals = db.query(EnvironmentalGoal).filter(EnvironmentalGoal.department_id == department_id).all()
    if not goals:
        return float(settings.DEFAULT_ENVIRONMENTAL_SCORE_BASELINE)

    progress_values = []
    for goal in goals:
        target = float(goal.target_value or 0)
        current = float(goal.current_value or 0)
        if target <= 0:
            continue
        progress = min(current / target, 1.0) * 100
        progress_values.append(progress)

    if not progress_values:
        return float(settings.DEFAULT_ENVIRONMENTAL_SCORE_BASELINE)

    return _round2(sum(progress_values) / len(progress_values))


def calculate_social_score(db: Session, department_id: int) -> float:
    """(approved participation count / total employees in department) * 100,
    blended with average diversity metric value if any are recorded."""
    total_employees = (
        db.query(func.count(Employee.id))
        .filter(Employee.department_id == department_id, Employee.status == "Active")
        .scalar()
    ) or 0

    approved_count = (
        db.query(func.count(EmployeeParticipation.id))
        .join(CsrActivity, EmployeeParticipation.activity_id == CsrActivity.id)
        .join(Employee, EmployeeParticipation.employee_id == Employee.id)
        .filter(
            Employee.department_id == department_id,
            EmployeeParticipation.approval_status == "Approved",
        )
        .scalar()
    ) or 0

    if total_employees == 0:
        participation_score = float(settings.DEFAULT_ENVIRONMENTAL_SCORE_BASELINE)
    else:
        participation_score = min((approved_count / total_employees) * 100, 100.0)

    diversity_avg = (
        db.query(func.avg(DiversityMetric.metric_value))
        .filter(DiversityMetric.department_id == department_id)
        .scalar()
    )

    if diversity_avg is None:
        return _round2(participation_score)

    blended = (participation_score * 0.7) + (float(diversity_avg) * 0.3)
    return _round2(min(blended, 100.0))


def calculate_governance_score(db: Session, department_id: int) -> float:
    """(acknowledged / total applicable policies) * 60 + (resolved / total
    issues raised in this department's audits) * 40, normalized to 0-100."""
    total_policies = db.query(func.count(EsgPolicy.id)).filter(EsgPolicy.status == "Active").scalar() or 0
    total_employees_in_dept = (
        db.query(func.count(Employee.id))
        .filter(Employee.department_id == department_id, Employee.status == "Active")
        .scalar()
    ) or 0

    applicable = total_policies * total_employees_in_dept
    if applicable > 0:
        acknowledged = (
            db.query(func.count(PolicyAcknowledgement.id))
            .join(Employee, PolicyAcknowledgement.employee_id == Employee.id)
            .filter(Employee.department_id == department_id)
            .scalar()
        ) or 0
        ack_rate = min(acknowledged / applicable, 1.0) * 100
    else:
        ack_rate = float(settings.DEFAULT_ENVIRONMENTAL_SCORE_BASELINE)

    audit_ids = [a.id for a in db.query(Audit.id).filter(Audit.department_id == department_id).all()]
    if audit_ids:
        total_issues = (
            db.query(func.count(ComplianceIssue.id))
            .filter(ComplianceIssue.audit_id.in_(audit_ids))
            .scalar()
        ) or 0
        resolved_issues = (
            db.query(func.count(ComplianceIssue.id))
            .filter(ComplianceIssue.audit_id.in_(audit_ids), ComplianceIssue.status == "Resolved")
            .scalar()
        ) or 0
        resolution_rate = (resolved_issues / total_issues * 100) if total_issues > 0 else 100.0
    else:
        resolution_rate = 100.0

    weight_a, weight_b = 0.6, 0.4
    score = (ack_rate * weight_a) + (resolution_rate * weight_b)
    return _round2(min(score, 100.0))


def recalculate_department_score(db: Session, department_id: int, commit: bool = True) -> DepartmentScore:
    """Computes E/S/G + weighted total for one department and appends a new
    department_scores row. Caller decides whether to commit (so this can be
    composed inside a larger transaction, e.g. the approval endpoints)."""
    config = get_config(db)

    env_score = calculate_environmental_score(db, department_id)
    social_score = calculate_social_score(db, department_id)
    gov_score = calculate_governance_score(db, department_id)

    env_weight = float(config.env_weight)
    social_weight = float(config.social_weight)
    gov_weight = float(config.governance_weight)

    total = (
        (env_score * env_weight / 100)
        + (social_score * social_weight / 100)
        + (gov_score * gov_weight / 100)
    )

    snapshot = DepartmentScore(
        department_id=department_id,
        environmental_score=env_score,
        social_score=social_score,
        governance_score=gov_score,
        total_score=_round2(total),
    )
    db.add(snapshot)
    db.flush()
    if commit:
        db.commit()
        db.refresh(snapshot)
    return snapshot


def recalculate_all_departments(db: Session) -> list[DepartmentScore]:
    department_ids = [d.id for d in db.query(Department.id).filter(Department.status == "Active").all()]
    snapshots = [recalculate_department_score(db, dept_id, commit=False) for dept_id in department_ids]
    db.commit()
    for s in snapshots:
        db.refresh(s)
    return snapshots


def get_latest_department_score(db: Session, department_id: int) -> DepartmentScore | None:
    return (
        db.query(DepartmentScore)
        .filter(DepartmentScore.department_id == department_id)
        .order_by(DepartmentScore.calculated_at.desc())
        .first()
    )


def get_all_latest_scores(db: Session) -> list[DepartmentScore]:
    departments = db.query(Department).filter(Department.status == "Active").all()
    results = []
    for dept in departments:
        latest = get_latest_department_score(db, dept.id)
        if latest is None:
            latest = recalculate_department_score(db, dept.id, commit=True)
        results.append(latest)
    return results


def get_overall_score(db: Session) -> float:
    latest_scores = get_all_latest_scores(db)
    if not latest_scores:
        return float(settings.DEFAULT_ENVIRONMENTAL_SCORE_BASELINE)
    total = sum(float(s.total_score) for s in latest_scores)
    return _round2(total / len(latest_scores))