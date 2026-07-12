from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict


class EsgConfigOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    auto_emission_calculation: bool
    evidence_required_default: bool
    badge_auto_award: bool
    compliance_email_alerts: bool
    env_weight: Decimal
    social_weight: Decimal
    governance_weight: Decimal
    updated_at: datetime


class EsgConfigUpdate(BaseModel):
    auto_emission_calculation: Optional[bool] = None
    evidence_required_default: Optional[bool] = None
    badge_auto_award: Optional[bool] = None
    compliance_email_alerts: Optional[bool] = None
    env_weight: Optional[Decimal] = None
    social_weight: Optional[Decimal] = None
    governance_weight: Optional[Decimal] = None


class WeightsUpdate(BaseModel):
    env_weight: Decimal
    social_weight: Decimal
    governance_weight: Decimal


class NotificationPreferencesOut(BaseModel):
    employee_id: int
    csr_notifications: bool = True
    challenge_notifications: bool = True
    policy_reminders: bool = True
    compliance_alerts: bool = True
    badge_notifications: bool = True


class NotificationPreferencesUpdate(BaseModel):
    csr_notifications: Optional[bool] = None
    challenge_notifications: Optional[bool] = None
    policy_reminders: Optional[bool] = None
    compliance_alerts: Optional[bool] = None
    badge_notifications: Optional[bool] = None