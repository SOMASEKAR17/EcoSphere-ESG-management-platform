from sqlalchemy import (
    Column, Integer, String, ForeignKey, UniqueConstraint, CheckConstraint,
    TIMESTAMP, func,
)
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.enums import UserRole, CommonStatus, OauthProviderType


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    avatar_url = Column(String(500), nullable=True)

    oauth_provider = Column(OauthProviderType, nullable=False)
    oauth_provider_id = Column(String(255), nullable=False)

    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    role = Column(UserRole, nullable=False, default="Employee")
    status = Column(CommonStatus, default="Active")

    xp_balance = Column(Integer, default=0)
    points_balance = Column(Integer, default=0)

    created_at = Column(TIMESTAMP, server_default=func.now())
    last_login_at = Column(TIMESTAMP, nullable=True)

    department = relationship("Department", foreign_keys=[department_id])

    __table_args__ = (
        UniqueConstraint("oauth_provider", "oauth_provider_id", name="uq_oauth_identity"),
        CheckConstraint("xp_balance >= 0", name="chk_xp_balance"),
        CheckConstraint("points_balance >= 0", name="chk_points_balance"),
    )


class OauthSession(Base):
    __tablename__ = "oauth_sessions"

    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"))
    refresh_token_hash = Column(String(255), nullable=False)
    expires_at = Column(TIMESTAMP, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())