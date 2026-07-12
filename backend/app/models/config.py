from sqlalchemy import Column, Integer, Boolean, Numeric, CheckConstraint, TIMESTAMP, func

from app.database import Base


class EsgConfig(Base):
    """Single-row settings table (id is always 1). Holds the four business-
    rule toggles and the ESG scoring weights (default 40/30/30)."""

    __tablename__ = "esg_config"

    id = Column(Integer, primary_key=True)
    auto_emission_calculation = Column(Boolean, default=False)
    evidence_required_default = Column(Boolean, default=True)
    badge_auto_award = Column(Boolean, default=True)
    compliance_email_alerts = Column(Boolean, default=True)
    env_weight = Column(Numeric(4, 2), default=40)
    social_weight = Column(Numeric(4, 2), default=30)
    governance_weight = Column(Numeric(4, 2), default=30)
    updated_at = Column(TIMESTAMP, server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "env_weight + social_weight + governance_weight = 100.00",
            name="chk_weights_sum",
        ),
    )
