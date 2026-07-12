from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_employee, require_admin
from app.models.employees import Employee
from app.models.governance import EsgPolicy, PolicyAcknowledgement, Audit, ComplianceIssue
from app.schemas.governance import (
    PolicyCreate, PolicyUpdate, PolicyOut, PolicyAcknowledgementOut,
    AuditCreate, AuditUpdate, AuditOut,
    ComplianceIssueCreate, ComplianceIssueUpdate, ComplianceIssueOut,
)
from app.services.scoring_engine import recalculate_department_score
from app.services.notification_service import create_notification
from app.utils.errors import not_found, bad_request, conflict

router = APIRouter(tags=["Governance"])


# ---- Policies -----------------------------------------------------------
@router.get("/policies", response_model=list[PolicyOut])
def list_policies(db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    return db.query(EsgPolicy).order_by(EsgPolicy.effective_date.desc()).all()


@router.post("/policies", response_model=PolicyOut, status_code=201)
def create_policy(payload: PolicyCreate, db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    policy = EsgPolicy(**payload.model_dump())
    db.add(policy)
    db.commit()
    db.refresh(policy)
    return policy


@router.put("/policies/{policy_id}", response_model=PolicyOut)
def update_policy(policy_id: int, payload: PolicyUpdate, db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    policy = db.get(EsgPolicy, policy_id)
    if not policy:
        raise not_found("Policy not found.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(policy, field, value)
    db.commit()
    db.refresh(policy)
    return policy


@router.delete("/policies/{policy_id}")
def delete_policy(policy_id: int, db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    policy = db.get(EsgPolicy, policy_id)
    if not policy:
        raise not_found("Policy not found.")
    policy.status = "Inactive"
    db.commit()
    return {"detail": "Policy deactivated."}


@router.post("/policies/{policy_id}/acknowledge", response_model=PolicyAcknowledgementOut, status_code=201)
def acknowledge_policy(policy_id: int, db: Session = Depends(get_db), current_employee: Employee = Depends(get_current_employee)):
    policy = db.get(EsgPolicy, policy_id)
    if not policy:
        raise not_found("Policy not found.")

    existing = (
        db.query(PolicyAcknowledgement)
        .filter(PolicyAcknowledgement.policy_id == policy_id, PolicyAcknowledgement.employee_id == current_employee.id)
        .first()
    )
    if existing:
        raise conflict("You have already acknowledged this policy.")

    ack = PolicyAcknowledgement(policy_id=policy_id, employee_id=current_employee.id)
    db.add(ack)
    db.flush()

    if current_employee.department_id:
        recalculate_department_score(db, current_employee.department_id, commit=False)

    db.commit()
    db.refresh(ack)
    return ack


@router.get("/policy-acknowledgements", response_model=list[PolicyAcknowledgementOut])
def list_policy_acknowledgements(db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    return db.query(PolicyAcknowledgement).all()


@router.get("/policy-acknowledgements/me", response_model=list[PolicyAcknowledgementOut])
def my_policy_acknowledgements(db: Session = Depends(get_db), current_employee: Employee = Depends(get_current_employee)):
    return db.query(PolicyAcknowledgement).filter(PolicyAcknowledgement.employee_id == current_employee.id).all()


# ---- Audits ---------------------------------------------------------------
@router.get("/audits", response_model=list[AuditOut])
def list_audits(db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    return db.query(Audit).order_by(Audit.conducted_at.desc()).all()


@router.post("/audits", response_model=AuditOut, status_code=201)
def create_audit(payload: AuditCreate, db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    audit = Audit(**payload.model_dump())
    db.add(audit)
    db.commit()
    db.refresh(audit)
    return audit


@router.get("/audits/{audit_id}", response_model=AuditOut)
def get_audit(audit_id: int, db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    audit = db.get(Audit, audit_id)
    if not audit:
        raise not_found("Audit not found.")
    return audit


@router.put("/audits/{audit_id}", response_model=AuditOut)
def update_audit(audit_id: int, payload: AuditUpdate, db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    audit = db.get(Audit, audit_id)
    if not audit:
        raise not_found("Audit not found.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(audit, field, value)
    db.commit()
    db.refresh(audit)
    return audit


# ---- Compliance Issues ------------------------------------------------
@router.get("/compliance-issues", response_model=list[ComplianceIssueOut])
def list_compliance_issues(db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    return db.query(ComplianceIssue).order_by(ComplianceIssue.due_date).all()


@router.get("/compliance-issues/mine", response_model=list[ComplianceIssueOut])
def my_compliance_issues(db: Session = Depends(get_db), current_employee: Employee = Depends(get_current_employee)):
    """Only issues where the current employee is the assigned owner —
    the general compliance issue list is Admin-only."""
    return db.query(ComplianceIssue).filter(ComplianceIssue.owner_id == current_employee.id).all()


@router.post("/compliance-issues", response_model=ComplianceIssueOut, status_code=201)
def create_compliance_issue(payload: ComplianceIssueCreate, db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    if payload.due_date < date.today():
        raise bad_request("Due date cannot be in the past.")

    audit = db.get(Audit, payload.audit_id)
    if not audit:
        raise not_found("Audit not found.")

    owner = db.get(Employee, payload.owner_id)
    if not owner:
        raise not_found("Owner employee not found.")

    issue = ComplianceIssue(**payload.model_dump())
    db.add(issue)
    db.flush()

    create_notification(
        db, employee_id=owner.id, type_="COMPLIANCE_ISSUE_RAISED",
        message=f"A new {issue.severity} compliance issue has been assigned to you, due {issue.due_date}.",
        commit=False,
    )

    if audit.department_id:
        recalculate_department_score(db, audit.department_id, commit=False)

    db.commit()
    db.refresh(issue)
    return issue


@router.put("/compliance-issues/{issue_id}", response_model=ComplianceIssueOut)
def update_compliance_issue(issue_id: int, payload: ComplianceIssueUpdate, db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    issue = db.get(ComplianceIssue, issue_id)
    if not issue:
        raise not_found("Compliance issue not found.")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(issue, field, value)
    db.flush()

    audit = db.get(Audit, issue.audit_id)
    if audit and audit.department_id:
        # Closing/resolving triggers Governance Score recalculation
        recalculate_department_score(db, audit.department_id, commit=False)

    db.commit()
    db.refresh(issue)
    return issue


@router.get("/compliance-issues/overdue", response_model=list[ComplianceIssueOut])
def overdue_compliance_issues(db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    return db.query(ComplianceIssue).filter(ComplianceIssue.is_overdue.is_(True)).all()