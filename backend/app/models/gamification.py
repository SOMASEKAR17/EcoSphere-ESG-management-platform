from sqlalchemy import (
    Column, Integer, String, Text, Numeric, Boolean, ForeignKey,
    UniqueConstraint, CheckConstraint, TIMESTAMP, func,
)
from sqlalchemy.dialects.postgresql import JSONB

from app.database import Base
from app.models.enums import ChallengeStatus, ApprovalStatus, CommonStatus


class Challenge(Base):
    __tablename__ = "challenges"

    id = Column(Integer, primary_key=True)
    title = Column(String(255), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    description = Column(Text, nullable=False)
    xp_reward = Column(Integer, nullable=False)
    difficulty = Column(String(50), nullable=False)
    evidence_required = Column(Boolean, default=True)
    deadline = Column(TIMESTAMP, nullable=False)
    status = Column(ChallengeStatus, default="Draft")

    __table_args__ = (CheckConstraint("xp_reward > 0", name="chk_xp_reward"),)


class ChallengeParticipation(Base):
    __tablename__ = "challenge_participation"

    id = Column(Integer, primary_key=True)
    challenge_id = Column(Integer, ForeignKey("challenges.id", ondelete="CASCADE"))
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"))
    progress = Column(Numeric(5, 2), default=0)
    proof_file_path = Column(String(500), nullable=True)
    approval_status = Column(ApprovalStatus, default="Under Review")
    xp_awarded = Column(Integer, default=0)
    created_at = Column(TIMESTAMP, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("employee_id", "challenge_id", name="uq_emp_challenge"),
        CheckConstraint("progress >= 0 AND progress <= 100", name="chk_progress_range"),
        CheckConstraint("xp_awarded >= 0", name="chk_xp_awarded"),
    )


class Badge(Base):
    __tablename__ = "badges"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text, nullable=False)
    unlock_rule = Column(JSONB, nullable=False)  # e.g. {"type": "xp", "threshold": 500}
    icon_url = Column(String(500), nullable=True)
    status = Column(CommonStatus, default="Active")


class EmployeeBadge(Base):
    __tablename__ = "employee_badges"

    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"))
    badge_id = Column(Integer, ForeignKey("badges.id", ondelete="CASCADE"))
    awarded_at = Column(TIMESTAMP, server_default=func.now())

    __table_args__ = (UniqueConstraint("employee_id", "badge_id", name="uq_emp_badge"),)


class Reward(Base):
    __tablename__ = "rewards"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text, nullable=False)
    points_required = Column(Integer, nullable=False)
    stock_count = Column(Integer, nullable=False)
    status = Column(CommonStatus, default="Active")

    __table_args__ = (
        CheckConstraint("points_required > 0", name="chk_points_required"),
        CheckConstraint("stock_count >= 0", name="chk_stock_count"),
    )


class RewardRedemption(Base):
    __tablename__ = "reward_redemptions"

    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="RESTRICT"))
    reward_id = Column(Integer, ForeignKey("rewards.id", ondelete="RESTRICT"))
    points_spent = Column(Integer, nullable=False)
    redeemed_at = Column(TIMESTAMP, server_default=func.now())

    __table_args__ = (CheckConstraint("points_spent > 0", name="chk_points_spent"),)