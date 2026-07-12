from sqlalchemy import Column, Integer, String, ForeignKey, CheckConstraint, TIMESTAMP, func
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.enums import DepartmentStatus, CategoryType, CommonStatus


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    parent_department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    head_employee_id = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    employee_count = Column(Integer, default=0)
    status = Column(DepartmentStatus, default="Active")
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now())

    __table_args__ = (CheckConstraint("employee_count >= 0", name="chk_dept_employee_count"),)

    head_employee = relationship("Employee", foreign_keys=[head_employee_id])


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    type = Column(CategoryType, nullable=False)
    status = Column(CommonStatus, default="Active")