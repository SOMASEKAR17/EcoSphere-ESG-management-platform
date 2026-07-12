from sqlalchemy import (
    Column, Integer, String, Numeric, Date, ForeignKey, CheckConstraint,
    TIMESTAMP, func,
)

from app.database import Base
from app.models.enums import ErpSourceType, CommonStatus, GoalStatus


class EmissionFactor(Base):
    __tablename__ = "emission_factors"

    id = Column(Integer, primary_key=True)
    activity_type = Column(ErpSourceType, nullable=False)
    factor_name = Column(String(255), nullable=False)
    factor_value = Column(Numeric(12, 6), nullable=False)
    unit = Column(String(50), nullable=False)
    status = Column(CommonStatus, default="Active")

    __table_args__ = (CheckConstraint("factor_value >= 0", name="chk_factor_value"),)


class ProductEsgProfile(Base):
    __tablename__ = "product_esg_profiles"

    id = Column(Integer, primary_key=True)
    product_sku = Column(String(100), unique=True, nullable=False)
    product_name = Column(String(255), nullable=False)
    carbon_footprint_per_unit = Column(Numeric(10, 4), nullable=False)
    sustainability_rating = Column(String(10), nullable=True)
    status = Column(CommonStatus, default="Active")

    __table_args__ = (CheckConstraint("carbon_footprint_per_unit >= 0", name="chk_carbon_footprint"),)


class EnvironmentalGoal(Base):
    __tablename__ = "environmental_goals"

    id = Column(Integer, primary_key=True)
    title = Column(String(255), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"))
    target_metric = Column(String(100), nullable=False)
    target_value = Column(Numeric(12, 2), nullable=False)
    current_value = Column(Numeric(12, 2), default=0)
    deadline = Column(Date, nullable=False)
    status = Column(GoalStatus, default="In Progress")


class CarbonTransaction(Base):
    __tablename__ = "carbon_transactions"

    id = Column(Integer, primary_key=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="RESTRICT"))
    source_type = Column(ErpSourceType, nullable=False)
    source_record_id = Column(Integer, nullable=True)  # intentionally no FK — polymorphic, out of scope
    emission_factor_id = Column(Integer, ForeignKey("emission_factors.id"))
    operational_quantity = Column(Numeric(12, 2), nullable=False)
    calculated_emission = Column(Numeric(12, 4), nullable=False)
    logged_by = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    transaction_date = Column(TIMESTAMP, server_default=func.now())

    __table_args__ = (
        CheckConstraint("operational_quantity >= 0", name="chk_operational_quantity"),
        CheckConstraint("calculated_emission >= 0", name="chk_calculated_emission"),
    )