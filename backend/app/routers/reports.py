import csv
import io
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import require_admin
from app.models.employees import Employee
from app.models.departments import Department
from app.models.environmental import CarbonTransaction, EnvironmentalGoal, ProductEsgProfile
from app.models.social import CsrActivity, EmployeeParticipation, DiversityMetric
from app.models.governance import EsgPolicy, PolicyAcknowledgement, Audit, ComplianceIssue
from app.models.gamification import Challenge, ChallengeParticipation
from app.schemas.reports import CustomReportFilter, CustomReportResponse
from app.services.scoring_engine import get_all_latest_scores, get_overall_score
from app.utils.errors import bad_request

router = APIRouter(prefix="/reports", tags=["Reports"])

# All Reports endpoints are Admin-only per the build reference (Section 11.8).


# ---- Standard Reports -----------------------------------------------------
@router.get("/environmental")
def environmental_report(db: Session = Depends(get_db), _: Employee = Depends(require_admin)):
    total_emission = db.query(func.coalesce(func.sum(CarbonTransaction.calculated_emission), 0)).scalar()

    emission_by_department = [
        {"department_id": dept_id, "department_name": name, "total_emission": float(total or 0)}
        for dept_id, name, total in (
            db.query(Department.id, Department.name, func.coalesce(func.sum(CarbonTransaction.calculated_emission), 0))
            .outerjoin(CarbonTransaction, CarbonTransaction.department_id == Department.id)
            .group_by(Department.id, Department.name)
            .all()
        )
    ]

    goals = db.query(EnvironmentalGoal).all()
    products = db.query(ProductEsgProfile).all()

    return {
        "total_emission": float(total_emission or 0),
        "emission_by_department": emission_by_department,
        "environmental_goals": [
            {
                "id": g.id, "title": g.title, "department_id": g.department_id,
                "target_metric": g.target_metric, "target_value": float(g.target_value),
                "current_value": float(g.current_value), "deadline": g.deadline.isoformat(),
                "status": g.status,
            }
            for g in goals
        ],
        "product_esg_profiles": [
            {
                "id": p.id, "product_sku": p.product_sku, "product_name": p.product_name,
                "carbon_footprint_per_unit": float(p.carbon_footprint_per_unit),
                "sustainability_rating": p.sustainability_rating,
            }
            for p in products
        ],
    }


@router.get("/social")
def social_report(db: Session = Depends(get_db), _: Employee = Depends(require_admin)):
    total_participation = db.query(func.count(EmployeeParticipation.id)).scalar() or 0
    approved = db.query(func.count(EmployeeParticipation.id)).filter(EmployeeParticipation.approval_status == "Approved").scalar() or 0
    under_review = db.query(func.count(EmployeeParticipation.id)).filter(EmployeeParticipation.approval_status == "Under Review").scalar() or 0
    rejected = db.query(func.count(EmployeeParticipation.id)).filter(EmployeeParticipation.approval_status == "Rejected").scalar() or 0

    diversity_metrics = db.query(DiversityMetric).all()
    activities = db.query(CsrActivity).all()

    return {
        "csr_participation_summary": {
            "total": total_participation, "approved": approved,
            "under_review": under_review, "rejected": rejected,
        },
        "diversity_metrics": [
            {
                "id": m.id, "department_id": m.department_id, "metric_name": m.metric_name,
                "metric_value": float(m.metric_value), "recorded_at": m.recorded_at.isoformat(),
            }
            for m in diversity_metrics
        ],
        "csr_activities": [
            {"id": a.id, "title": a.title, "status": a.status, "points_awarded": a.points_awarded}
            for a in activities
        ],
    }


@router.get("/governance")
def governance_report(db: Session = Depends(get_db), _: Employee = Depends(require_admin)):
    total_acks = db.query(func.count(PolicyAcknowledgement.id)).scalar() or 0
    total_policies = db.query(func.count(EsgPolicy.id)).filter(EsgPolicy.status == "Active").scalar() or 0
    total_employees = db.query(func.count(Employee.id)).filter(Employee.status == "Active").scalar() or 0
    applicable = total_policies * total_employees
    ack_rate = round((total_acks / applicable) * 100, 2) if applicable > 0 else 0.0

    total_issues = db.query(func.count(ComplianceIssue.id)).scalar() or 0
    open_issues = db.query(func.count(ComplianceIssue.id)).filter(ComplianceIssue.status == "Open").scalar() or 0
    resolved_issues = db.query(func.count(ComplianceIssue.id)).filter(ComplianceIssue.status == "Resolved").scalar() or 0
    overdue_issues = db.query(func.count(ComplianceIssue.id)).filter(ComplianceIssue.is_overdue.is_(True)).scalar() or 0

    audits = db.query(Audit).all()

    return {
        "policy_acknowledgement_rate": ack_rate,
        "compliance_issues_summary": {
            "total": total_issues, "open": open_issues,
            "resolved": resolved_issues, "overdue": overdue_issues,
        },
        "audits": [
            {"id": a.id, "title": a.title, "department_id": a.department_id, "status": a.status}
            for a in audits
        ],
    }


@router.get("/esg-summary")
def esg_summary_report(db: Session = Depends(get_db), _: Employee = Depends(require_admin)):
    department_names = {d.id: d.name for d in db.query(Department).all()}
    latest_scores = get_all_latest_scores(db)
    overall = get_overall_score(db)

    return {
        "overall_score": overall,
        "department_comparison": [
            {
                "department_id": s.department_id,
                "department_name": department_names.get(s.department_id, "Unknown"),
                "environmental_score": float(s.environmental_score),
                "social_score": float(s.social_score),
                "governance_score": float(s.governance_score),
                "total_score": float(s.total_score),
                "calculated_at": s.calculated_at.isoformat(),
            }
            for s in latest_scores
        ],
    }


# ---- Custom Report Builder -------------------------------------------------
MODULE_CHOICES = {"Environmental", "Social", "Governance", "Gamification"}


def _build_custom_rows(db: Session, filters: CustomReportFilter) -> list[dict]:
    module = filters.module or "Environmental"
    if module not in MODULE_CHOICES:
        raise bad_request(f"Invalid module '{module}'. Must be one of: {', '.join(sorted(MODULE_CHOICES))}.")

    rows: list[dict] = []

    if module == "Environmental":
        query = db.query(CarbonTransaction)
        if filters.department_id:
            query = query.filter(CarbonTransaction.department_id == filters.department_id)
        if filters.date_from:
            query = query.filter(CarbonTransaction.transaction_date >= filters.date_from)
        if filters.date_to:
            query = query.filter(CarbonTransaction.transaction_date <= filters.date_to)
        if filters.employee_id:
            query = query.filter(CarbonTransaction.logged_by == filters.employee_id)
        for t in query.order_by(CarbonTransaction.transaction_date.desc()).all():
            rows.append({
                "id": t.id, "department_id": t.department_id, "source_type": t.source_type,
                "operational_quantity": float(t.operational_quantity),
                "calculated_emission": float(t.calculated_emission),
                "logged_by": t.logged_by, "transaction_date": t.transaction_date.isoformat(),
            })

    elif module == "Social":
        query = db.query(EmployeeParticipation)
        if filters.employee_id:
            query = query.filter(EmployeeParticipation.employee_id == filters.employee_id)
        if filters.date_from:
            query = query.filter(EmployeeParticipation.created_at >= filters.date_from)
        if filters.date_to:
            query = query.filter(EmployeeParticipation.created_at <= filters.date_to)
        if filters.department_id:
            query = query.join(Employee, EmployeeParticipation.employee_id == Employee.id).filter(
                Employee.department_id == filters.department_id
            )
        for p in query.order_by(EmployeeParticipation.created_at.desc()).all():
            rows.append({
                "id": p.id, "employee_id": p.employee_id, "activity_id": p.activity_id,
                "approval_status": p.approval_status, "points_earned": p.points_earned,
                "created_at": p.created_at.isoformat(),
            })

    elif module == "Governance":
        query = db.query(ComplianceIssue)
        if filters.employee_id:
            query = query.filter(ComplianceIssue.owner_id == filters.employee_id)
        if filters.date_from:
            query = query.filter(ComplianceIssue.due_date >= filters.date_from)
        if filters.date_to:
            query = query.filter(ComplianceIssue.due_date <= filters.date_to)
        if filters.department_id:
            query = query.join(Audit, ComplianceIssue.audit_id == Audit.id).filter(
                Audit.department_id == filters.department_id
            )
        for i in query.order_by(ComplianceIssue.due_date).all():
            rows.append({
                "id": i.id, "audit_id": i.audit_id, "severity": i.severity,
                "owner_id": i.owner_id, "due_date": i.due_date.isoformat(),
                "status": i.status, "is_overdue": bool(i.is_overdue),
            })

    elif module == "Gamification":
        query = db.query(ChallengeParticipation)
        if filters.employee_id:
            query = query.filter(ChallengeParticipation.employee_id == filters.employee_id)
        if filters.challenge_id:
            query = query.filter(ChallengeParticipation.challenge_id == filters.challenge_id)
        if filters.date_from:
            query = query.filter(ChallengeParticipation.created_at >= filters.date_from)
        if filters.date_to:
            query = query.filter(ChallengeParticipation.created_at <= filters.date_to)
        for cp in query.order_by(ChallengeParticipation.created_at.desc()).all():
            rows.append({
                "id": cp.id, "challenge_id": cp.challenge_id, "employee_id": cp.employee_id,
                "progress": float(cp.progress), "approval_status": cp.approval_status,
                "xp_awarded": cp.xp_awarded, "created_at": cp.created_at.isoformat(),
            })

    return rows


@router.post("/custom", response_model=CustomReportResponse)
def custom_report(payload: CustomReportFilter, db: Session = Depends(get_db), _: Employee = Depends(require_admin)):
    rows = _build_custom_rows(db, payload)
    return CustomReportResponse(
        module=payload.module or "Environmental",
        filters_applied=payload.model_dump(exclude_none=True),
        row_count=len(rows),
        rows=rows,
    )


@router.get("/custom/export")
def custom_report_export(
    format: str = Query(default="csv"),
    module: Optional[str] = Query(default="Environmental"),
    department_id: Optional[int] = Query(default=None),
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None),
    employee_id: Optional[int] = Query(default=None),
    challenge_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    _: Employee = Depends(require_admin),
):
    """CSV export is mandatory (Section 17); PDF/Excel are stretch goals and
    intentionally not implemented in this build."""
    if format != "csv":
        raise bad_request(f"Unsupported export format '{format}'. Only 'csv' is supported in this build.")

    filters = CustomReportFilter(
        module=module, department_id=department_id, date_from=date_from,
        date_to=date_to, employee_id=employee_id, challenge_id=challenge_id,
    )
    rows = _build_custom_rows(db, filters)

    buffer = io.StringIO()
    if rows:
        writer = csv.DictWriter(buffer, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    else:
        buffer.write("No data matched the given filters.\n")
    buffer.seek(0)

    filename = f"ecosphere_{(module or 'report').lower()}_report_{datetime.now().strftime('%Y%m%d%H%M%S')}.csv"
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
