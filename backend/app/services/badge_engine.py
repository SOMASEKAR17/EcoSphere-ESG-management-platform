"""
Badge auto-award logic. Badges are never manually granted by an Admin —
they're checked automatically any time XP or challenge-completion count
changes, gated by the `badge_auto_award` toggle in esg_config.

unlock_rule JSON shapes supported:
  {"type": "xp", "threshold": 500}
  {"type": "challenge_count", "threshold": 3}
  {"type": "csr_count", "threshold": 5}
"""
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.gamification import Badge, EmployeeBadge, ChallengeParticipation
from app.models.social import EmployeeParticipation
from app.models.employees import Employee
from app.models.config import EsgConfig
from app.services.notification_service import create_notification


def _employee_challenge_count(db: Session, employee_id: int) -> int:
    return (
        db.query(func.count(ChallengeParticipation.id))
        .filter(
            ChallengeParticipation.employee_id == employee_id,
            ChallengeParticipation.approval_status == "Approved",
        )
        .scalar()
    ) or 0


def _employee_csr_count(db: Session, employee_id: int) -> int:
    return (
        db.query(func.count(EmployeeParticipation.id))
        .filter(
            EmployeeParticipation.employee_id == employee_id,
            EmployeeParticipation.approval_status == "Approved",
        )
        .scalar()
    ) or 0


def check_and_award_badges(db: Session, employee_id: int) -> list[Badge]:
    """Checks every active badge's unlock_rule against the employee's
    current stats and awards any newly-unlocked badges. Returns the list of
    badges newly awarded in this call (empty if none, or if the
    badge_auto_award toggle is off)."""
    config = db.get(EsgConfig, 1)
    if config is not None and not config.badge_auto_award:
        return []

    employee = db.get(Employee, employee_id)
    if employee is None:
        return []

    already_earned_ids = {
        row.badge_id
        for row in db.query(EmployeeBadge.badge_id).filter(EmployeeBadge.employee_id == employee_id).all()
    }

    candidate_badges = db.query(Badge).filter(Badge.status == "Active").all()
    newly_awarded = []

    challenge_count = None
    csr_count = None

    for badge in candidate_badges:
        if badge.id in already_earned_ids:
            continue

        rule = badge.unlock_rule or {}
        rule_type = rule.get("type")
        threshold = rule.get("threshold", 0)

        unlocked = False
        if rule_type == "xp":
            unlocked = employee.xp_balance >= threshold
        elif rule_type == "challenge_count":
            if challenge_count is None:
                challenge_count = _employee_challenge_count(db, employee_id)
            unlocked = challenge_count >= threshold
        elif rule_type == "csr_count":
            if csr_count is None:
                csr_count = _employee_csr_count(db, employee_id)
            unlocked = csr_count >= threshold

        if unlocked:
            db.add(EmployeeBadge(employee_id=employee_id, badge_id=badge.id))
            newly_awarded.append(badge)

    if newly_awarded:
        db.flush()
        for badge in newly_awarded:
            create_notification(
                db,
                employee_id=employee_id,
                type_="BADGE_UNLOCKED",
                message=f"You unlocked the '{badge.name}' badge!",
                commit=False,
            )
        db.flush()

    return newly_awarded