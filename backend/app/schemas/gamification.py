from datetime import datetime
from decimal import Decimal
from typing import Any, Optional
from pydantic import BaseModel, ConfigDict, Field


# ---- Challenges -------------------------------------------------------------
class ChallengeCreate(BaseModel):
    title: str
    category_id: Optional[int] = None
    description: str
    xp_reward: int = Field(gt=0)
    difficulty: str
    evidence_required: bool = True
    deadline: datetime


class ChallengeUpdate(BaseModel):
    title: Optional[str] = None
    category_id: Optional[int] = None
    description: Optional[str] = None
    xp_reward: Optional[int] = Field(default=None, gt=0)
    difficulty: Optional[str] = None
    evidence_required: Optional[bool] = None
    deadline: Optional[datetime] = None
    status: Optional[str] = None


class ChallengeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    category_id: Optional[int] = None
    description: str
    xp_reward: int
    difficulty: str
    evidence_required: bool
    deadline: datetime
    status: str


# ---- Challenge Participation ------------------------------------------------
class ChallengeParticipationUpdate(BaseModel):
    progress: Optional[Decimal] = Field(default=None, ge=0, le=100)


class ChallengeParticipationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    challenge_id: int
    employee_id: int
    progress: Decimal
    proof_file_path: Optional[str] = None
    approval_status: str
    xp_awarded: int
    created_at: datetime


# ---- Badges -------------------------------------------------------------
class BadgeCreate(BaseModel):
    name: str
    description: str
    unlock_rule: dict[str, Any]
    icon_url: Optional[str] = None


class BadgeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    unlock_rule: Optional[dict[str, Any]] = None
    icon_url: Optional[str] = None
    status: Optional[str] = None


class BadgeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: str
    unlock_rule: dict[str, Any]
    icon_url: Optional[str] = None
    status: str


class EmployeeBadgeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    employee_id: int
    badge_id: int
    awarded_at: datetime


# ---- Rewards & Redemption ---------------------------------------------------
class RewardCreate(BaseModel):
    name: str
    description: str
    points_required: int = Field(gt=0)
    stock_count: int = Field(ge=0)


class RewardUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    points_required: Optional[int] = Field(default=None, gt=0)
    stock_count: Optional[int] = Field(default=None, ge=0)
    status: Optional[str] = None


class RewardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: str
    points_required: int
    stock_count: int
    status: str


class RedemptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    employee_id: int
    reward_id: int
    points_spent: int
    redeemed_at: datetime


# ---- Leaderboard -----------------------------------------------------------
class LeaderboardEntry(BaseModel):
    employee_id: int
    first_name: str
    last_name: str
    department_id: Optional[int] = None
    xp_balance: int
    rank: int
