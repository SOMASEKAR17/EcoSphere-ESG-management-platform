from typing import Optional
from fastapi import APIRouter, Depends, Query, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_employee, require_admin
from app.models.employees import Employee
from app.models.gamification import (
    Challenge, ChallengeParticipation, Badge, EmployeeBadge, Reward, RewardRedemption,
)
from app.schemas.gamification import (
    ChallengeCreate, ChallengeUpdate, ChallengeOut,
    ChallengeParticipationOut,
    BadgeCreate, BadgeUpdate, BadgeOut, EmployeeBadgeOut,
    RewardCreate, RewardUpdate, RewardOut, RedemptionOut, LeaderboardEntry,
)
from app.services.badge_engine import check_and_award_badges
from app.services.notification_service import create_notification
from app.utils.uploads import save_proof_file
from app.utils.errors import not_found, bad_request, conflict, forbidden

router = APIRouter(tags=["Gamification"])

VALID_TRANSITIONS = {
    "Draft": {"Active", "Archived"},
    "Active": {"Under Review", "Archived"},
    "Under Review": {"Completed", "Archived"},
    "Completed": {"Archived"},
    "Archived": set(),
}


# ---- Challenges -----------------------------------------------------------
@router.get("/challenges", response_model=list[ChallengeOut])
def list_challenges(status: Optional[str] = Query(default=None), db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    query = db.query(Challenge)
    if status:
        query = query.filter(Challenge.status == status)
    return query.order_by(Challenge.deadline).all()


@router.post("/challenges", response_model=ChallengeOut, status_code=201)
def create_challenge(payload: ChallengeCreate, db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    challenge = Challenge(**payload.model_dump())
    db.add(challenge)
    db.commit()
    db.refresh(challenge)
    return challenge


@router.get("/challenges/{challenge_id}", response_model=ChallengeOut)
def get_challenge(challenge_id: int, db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    challenge = db.get(Challenge, challenge_id)
    if not challenge:
        raise not_found("Challenge not found.")
    return challenge


@router.put("/challenges/{challenge_id}", response_model=ChallengeOut)
def update_challenge(challenge_id: int, payload: ChallengeUpdate, db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    challenge = db.get(Challenge, challenge_id)
    if not challenge:
        raise not_found("Challenge not found.")

    updates = payload.model_dump(exclude_unset=True)
    if "status" in updates and updates["status"] != challenge.status:
        new_status = updates["status"]
        allowed = VALID_TRANSITIONS.get(challenge.status, set())
        if new_status not in allowed:
            raise bad_request(
                f"Invalid status transition: '{challenge.status}' -> '{new_status}'. "
                f"Allowed: Draft->Active->Under Review->Completed, or ->Archived from any state."
            )

    for field, value in updates.items():
        setattr(challenge, field, value)
    db.commit()
    db.refresh(challenge)
    return challenge


@router.delete("/challenges/{challenge_id}")
def delete_challenge(challenge_id: int, db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    challenge = db.get(Challenge, challenge_id)
    if not challenge:
        raise not_found("Challenge not found.")
    challenge.status = "Archived"
    db.commit()
    return {"detail": "Challenge archived."}


# ---- Challenge Participation -----------------------------------------
@router.post("/challenges/{challenge_id}/join", response_model=ChallengeParticipationOut, status_code=201)
def join_challenge(challenge_id: int, db: Session = Depends(get_db), current_employee: Employee = Depends(get_current_employee)):
    challenge = db.get(Challenge, challenge_id)
    if not challenge:
        raise not_found("Challenge not found.")

    existing = (
        db.query(ChallengeParticipation)
        .filter(ChallengeParticipation.employee_id == current_employee.id, ChallengeParticipation.challenge_id == challenge_id)
        .first()
    )
    if existing:
        raise conflict("You have already joined this challenge.")

    participation = ChallengeParticipation(challenge_id=challenge_id, employee_id=current_employee.id)
    db.add(participation)
    db.commit()
    db.refresh(participation)
    return participation


@router.put("/challenge-participation/{participation_id}", response_model=ChallengeParticipationOut)
async def update_challenge_participation(
    participation_id: int,
    progress: Optional[float] = None,
    proof_file: Optional[UploadFile] = File(default=None),
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee),
):
    participation = db.get(ChallengeParticipation, participation_id)
    if not participation:
        raise not_found("Challenge participation record not found.")
    if participation.employee_id != current_employee.id:
        raise forbidden("You can only update your own challenge participation.")

    if progress is not None:
        if progress < 0 or progress > 100:
            raise bad_request("Progress must be between 0 and 100.")
        participation.progress = progress

    if proof_file is not None:
        participation.proof_file_path = await save_proof_file(
            proof_file, prefix=f"challenge{participation.challenge_id}_emp{current_employee.id}"
        )

    db.commit()
    db.refresh(participation)
    return participation


@router.get("/challenge-participation", response_model=list[ChallengeParticipationOut])
def list_challenge_participation(status: Optional[str] = Query(default=None), db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    query = db.query(ChallengeParticipation)
    if status:
        query = query.filter(ChallengeParticipation.approval_status == status)
    return query.order_by(ChallengeParticipation.created_at.desc()).all()


@router.get("/challenge-participation/me", response_model=list[ChallengeParticipationOut])
def my_challenge_participation(db: Session = Depends(get_db), current_employee: Employee = Depends(get_current_employee)):
    return db.query(ChallengeParticipation).filter(ChallengeParticipation.employee_id == current_employee.id).all()


@router.put("/challenge-participation/{participation_id}/approve", response_model=ChallengeParticipationOut)
def approve_challenge_participation(participation_id: int, db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    participation = db.get(ChallengeParticipation, participation_id)
    if not participation:
        raise not_found("Challenge participation record not found.")
    if participation.approval_status == "Approved":
        raise bad_request("This participation has already been approved.")

    challenge = db.get(Challenge, participation.challenge_id)
    if challenge.evidence_required and not participation.proof_file_path:
        raise bad_request("Proof file is required before approval.")

    employee = db.get(Employee, participation.employee_id)

    participation.approval_status = "Approved"
    participation.xp_awarded = challenge.xp_reward
    employee.xp_balance = (employee.xp_balance or 0) + challenge.xp_reward

    create_notification(
        db, employee_id=employee.id, type_="CHALLENGE_APPROVED",
        message=f"Your participation in '{challenge.title}' was approved. You earned {challenge.xp_reward} XP.",
        commit=False,
    )
    check_and_award_badges(db, employee.id)

    db.commit()
    db.refresh(participation)
    return participation


@router.put("/challenge-participation/{participation_id}/reject", response_model=ChallengeParticipationOut)
def reject_challenge_participation(participation_id: int, db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    participation = db.get(ChallengeParticipation, participation_id)
    if not participation:
        raise not_found("Challenge participation record not found.")

    participation.approval_status = "Rejected"
    create_notification(
        db, employee_id=participation.employee_id, type_="CHALLENGE_REJECTED",
        message="Your challenge participation was rejected.", commit=False,
    )
    db.commit()
    db.refresh(participation)
    return participation


# ---- Badges -----------------------------------------------------------
@router.get("/badges", response_model=list[BadgeOut])
def list_badges(db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    return db.query(Badge).all()


@router.post("/badges", response_model=BadgeOut, status_code=201)
def create_badge(payload: BadgeCreate, db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    badge = Badge(**payload.model_dump())
    db.add(badge)
    db.commit()
    db.refresh(badge)
    return badge


@router.put("/badges/{badge_id}", response_model=BadgeOut)
def update_badge(badge_id: int, payload: BadgeUpdate, db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    badge = db.get(Badge, badge_id)
    if not badge:
        raise not_found("Badge not found.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(badge, field, value)
    db.commit()
    db.refresh(badge)
    return badge


@router.get("/badges/employee/{employee_id}", response_model=list[EmployeeBadgeOut])
def get_employee_badges(employee_id: int, db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    """Anyone can view anyone's earned badges — badges are social/visible by design."""
    return db.query(EmployeeBadge).filter(EmployeeBadge.employee_id == employee_id).all()


@router.get("/badges/me", response_model=list[EmployeeBadgeOut])
def my_badges(db: Session = Depends(get_db), current_employee: Employee = Depends(get_current_employee)):
    return db.query(EmployeeBadge).filter(EmployeeBadge.employee_id == current_employee.id).all()


# ---- Rewards & Redemption --------------------------------------------------
@router.get("/rewards", response_model=list[RewardOut])
def list_rewards(db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    return db.query(Reward).all()


@router.post("/rewards", response_model=RewardOut, status_code=201)
def create_reward(payload: RewardCreate, db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    reward = Reward(**payload.model_dump())
    db.add(reward)
    db.commit()
    db.refresh(reward)
    return reward


@router.put("/rewards/{reward_id}", response_model=RewardOut)
def update_reward(reward_id: int, payload: RewardUpdate, db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    reward = db.get(Reward, reward_id)
    if not reward:
        raise not_found("Reward not found.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(reward, field, value)
    db.commit()
    db.refresh(reward)
    return reward


@router.post("/rewards/{reward_id}/redeem")
def redeem_reward(reward_id: int, db: Session = Depends(get_db), current_employee: Employee = Depends(get_current_employee)):
    """Section 12.1: atomic — stock and points are validated and updated
    together, or neither is. SQLAlchemy's unit-of-work + a single commit
    at the end gives us this: any failure before the commit leaves the DB
    untouched."""
    reward = db.get(Reward, reward_id)
    if not reward or reward.status != "Active":
        raise not_found("Reward not found.")

    if reward.stock_count <= 0:
        raise bad_request("This reward is currently out of stock.")

    if current_employee.points_balance < reward.points_required:
        raise bad_request(
            f"Insufficient points balance. Required: {reward.points_required}, "
            f"Available: {current_employee.points_balance}."
        )

    current_employee.points_balance -= reward.points_required
    reward.stock_count -= 1

    redemption = RewardRedemption(
        employee_id=current_employee.id,
        reward_id=reward.id,
        points_spent=reward.points_required,
    )
    db.add(redemption)
    db.commit()
    db.refresh(redemption)
    db.refresh(current_employee)
    db.refresh(reward)

    return {
        "id": redemption.id,
        "employee_id": redemption.employee_id,
        "reward_id": redemption.reward_id,
        "points_spent": redemption.points_spent,
        "redeemed_at": redemption.redeemed_at,
        "remaining_points_balance": current_employee.points_balance,
        "remaining_stock": reward.stock_count,
    }


@router.get("/rewards/redemptions/me", response_model=list[RedemptionOut])
def my_redemptions(db: Session = Depends(get_db), current_employee: Employee = Depends(get_current_employee)):
    return db.query(RewardRedemption).filter(RewardRedemption.employee_id == current_employee.id).all()


# ---- Leaderboard --------------------------------------------------------
@router.get("/leaderboard", response_model=list[LeaderboardEntry])
def leaderboard(db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    employees = (
        db.query(Employee)
        .filter(Employee.status == "Active")
        .order_by(Employee.xp_balance.desc())
        .all()
    )
    return [
        LeaderboardEntry(
            employee_id=e.id, first_name=e.first_name, last_name=e.last_name,
            department_id=e.department_id, xp_balance=e.xp_balance, rank=i + 1,
        )
        for i, e in enumerate(employees)
    ]