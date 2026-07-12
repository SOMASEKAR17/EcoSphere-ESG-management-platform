import hashlib
import secrets

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

    password_hash = Column(String(255), nullable=True)  # For email/password auth

    oauth_provider = Column(OauthProviderType, nullable=True)  # Nullable for email/password users
    oauth_provider_id = Column(String(255), nullable=True)  # Nullable for email/password users

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

    def set_password(self, raw_password: str) -> None:
        """Hash a password with a random salt using SHA-256."""
        salt = secrets.token_hex(16)
        hashed = hashlib.sha256(f"{salt}${raw_password}".encode()).hexdigest()
        self.password_hash = f"{salt}${hashed}"

    def verify_password(self, raw_password: str) -> bool:
        """Verify a password against the stored hash."""
        if not self.password_hash:
            return False
        salt, stored_hash = self.password_hash.split("$", 1)
        computed = hashlib.sha256(f"{salt}${raw_password}".encode()).hexdigest()
        return secrets.compare_digest(computed, stored_hash)


class OauthSession(Base):
    __tablename__ = "oauth_sessions"

    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"))
    refresh_token_hash = Column(String(255), nullable=False)
    expires_at = Column(TIMESTAMP, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())