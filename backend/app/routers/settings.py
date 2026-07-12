from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_employee, require_admin
from app.models.employees import Employee
from app.models.config import EsgConfig
from app.schemas.settings import (
    EsgConfigOut, EsgConfigUpdate, NotificationPreferencesOut, NotificationPreferencesUpdate,
)
from app.services.scoring_engine import recalculate_all_departments

router = APIRouter(tags=["Settings"])

# NOTE: the provided schema (ecosphere_schema.sql) does not include a
# dedicated notification-preferences table. Rather than alter the
# already-provisioned database schema, per-employee notification
# preferences are held in-process here (reset on restart). If persistence
# across restarts is needed, add a `notification_preferences` table to the
# schema and swap this dict-based store for real queries — the router
# surface (GET/PUT /settings/notification-preferences) will not need to
# change.
_notification_preferences_store: dict[int, dict] = {}


def _get_prefs(employee_id: int) -> dict:
    return _notification_preferences_store.setdefault(
        employee_id,
        {
            "csr_notifications": True,
            "challenge_notifications": True,
            "policy_reminders": True,
            "compliance_alerts": True,
            "badge_notifications": True,
        },
    )


@router.get("/settings/config", response_model=EsgConfigOut)
def get_config(db: Session = Depends(get_db), _: Employee = Depends(get_current_employee)):
    """Readable by anyone — frontend logic depends on knowing e.g. whether
    evidence is required before showing the upload field."""
    return db.get(EsgConfig, 1)


@router.put("/settings/config", response_model=EsgConfigOut)
def update_config(payload: EsgConfigUpdate, db: Session = Depends(get_db), _: Employee = Depends(require_admin)):
    config = db.get(EsgConfig, 1)
    updates = payload.model_dump(exclude_unset=True)

    if any(k in updates for k in ("env_weight", "social_weight", "governance_weight")):
        env_w = updates.get("env_weight", config.env_weight)
        social_w = updates.get("social_weight", config.social_weight)
        gov_w = updates.get("governance_weight", config.governance_weight)
        if env_w + social_w + gov_w != 100:
            from app.utils.errors import bad_request
            raise bad_request(
                f"Environmental, Social, and Governance weights must sum to 100. Received: {env_w + social_w + gov_w}."
            )

    for field, value in updates.items():
        setattr(config, field, value)
    config.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(config)

    if any(k in updates for k in ("env_weight", "social_weight", "governance_weight")):
        recalculate_all_departments(db)

    return config


@router.get("/settings/notification-preferences", response_model=NotificationPreferencesOut)
def get_notification_preferences(current_employee: Employee = Depends(get_current_employee)):
    prefs = _get_prefs(current_employee.id)
    return NotificationPreferencesOut(employee_id=current_employee.id, **prefs)


@router.put("/settings/notification-preferences", response_model=NotificationPreferencesOut)
def update_notification_preferences(payload: NotificationPreferencesUpdate, current_employee: Employee = Depends(get_current_employee)):
    prefs = _get_prefs(current_employee.id)
    prefs.update(payload.model_dump(exclude_unset=True))
    return NotificationPreferencesOut(employee_id=current_employee.id, **prefs)