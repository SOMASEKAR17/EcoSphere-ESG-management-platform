from sqlalchemy import (
    Column, Integer, String, Text, Date, Boolean, ForeignKey,
    UniqueConstraint, TIMESTAMP, func, Computed,
)

from app.database import Base
from app.models.enums import CommonStatus, AuditStatus, IssueSeverity, IssueStatus


class EsgPolicy(Base):
    __tablename__ = "esg_policies"

    id = Column(Integer, primary_key=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    effective_date = Column(Date, nullable=False)
    status = Column(CommonStatus, default="Active")


class PolicyAcknowledgement(Base):
    __tablename__ = "policy_acknowledgements"

    id = Column(Integer, primary_key=True)
    policy_id = Column(Integer, ForeignKey("esg_policies.id", ondelete="CASCADE"))
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"))
    acknowledged_at = Column(TIMESTAMP, server_default=func.now())

    __table_args__ = (UniqueConstraint("policy_id", "employee_id", name="uq_policy_emp"),)


class Audit(Base):
    __tablename__ = "audits"

    id = Column(Integer, primary_key=True)
    title = Column(String(255), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    conducted_at = Column(TIMESTAMP, server_default=func.now())
    auditor_id = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    status = Column(AuditStatus, default="Open")


class ComplianceIssue(Base):
    __tablename__ = "compliance_issues"

    id = Column(Integer, primary_key=True)
    audit_id = Column(Integer, ForeignKey("audits.id", ondelete="CASCADE"))
    severity = Column(IssueSeverity, nullable=False)
    description = Column(Text, nullable=False)
    owner_id = Column(Integer, ForeignKey("employees.id", ondelete="RESTRICT"), nullable=False)
    due_date = Column(Date, nullable=False)
    status = Column(IssueStatus, default="Open")
    # Generated column — DB computes this; SQLAlchemy just reads it back (server_default/Computed marks it read-only-ish)
    is_overdue = Column(Boolean, Computed("(status = 'Open' AND due_date < CURRENT_DATE)"), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())