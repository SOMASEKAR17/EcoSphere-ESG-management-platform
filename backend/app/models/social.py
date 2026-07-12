from sqlalchemy import (
    Column, Integer, String, Text, Numeric, Boolean, ForeignKey,
    UniqueConstraint, CheckConstraint, TIMESTAMP, func,
)

from app.database import Base
from app.models.enums import CsrActivityStatus, ApprovalStatus


class CsrActivity(Base):
    __tablename__ = "csr_activities"

    id = Column(Integer, primary_key=True)
    title = Column(String(255), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    description = Column(Text, nullable=False)
    points_awarded = Column(Integer, nullable=False)
    evidence_required = Column(Boolean, default=True)
    activity_date = Column(TIMESTAMP, nullable=False)
    status = Column(CsrActivityStatus, default="Scheduled")

    __table_args__ = (CheckConstraint("points_awarded >= 0", name="chk_points_awarded"),)


class EmployeeParticipation(Base):
    __tablename__ = "employee_participation"

    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"))
    activity_id = Column(Integer, ForeignKey("csr_activities.id", ondelete="CASCADE"))
    proof_file_path = Column(String(500), nullable=True)
    approval_status = Column(ApprovalStatus, default="Under Review")
    points_earned = Column(Integer, default=0)
    completion_date = Column(TIMESTAMP, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("employee_id", "activity_id", name="uq_emp_activity"),
        CheckConstraint("points_earned >= 0", name="chk_points_earned"),
    )


class DiversityMetric(Base):
    __tablename__ = "diversity_metrics"

    id = Column(Integer, primary_key=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"))
    metric_name = Column(String(100), nullable=False)
    metric_value = Column(Numeric(6, 2), nullable=False)
    recorded_at = Column(TIMESTAMP, server_default=func.now())