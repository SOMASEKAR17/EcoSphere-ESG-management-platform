from sqlalchemy import Column, Integer, Numeric, ForeignKey, TIMESTAMP, func

from app.database import Base


class DepartmentScore(Base):
    __tablename__ = "department_scores"

    id = Column(Integer, primary_key=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"))
    environmental_score = Column(Numeric(5, 2), default=0)
    social_score = Column(Numeric(5, 2), default=0)
    governance_score = Column(Numeric(5, 2), default=0)
    total_score = Column(Numeric(5, 2), default=0)
    calculated_at = Column(TIMESTAMP, server_default=func.now())