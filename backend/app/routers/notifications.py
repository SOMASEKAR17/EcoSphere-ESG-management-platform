from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_employee
from app.models.employees import Employee
from app.models.notifications import Notification
from app.schemas.notifications import NotificationOut
from app.utils.errors import not_found, forbidden

router = APIRouter(tags=["Notifications"])


@router.get("/notifications", response_model=list[NotificationOut])
def list_notifications(db: Session = Depends(get_db), current_employee: Employee = Depends(get_current_employee)):
    """Own notifications only, unread-first ordering."""
    return (
        db.query(Notification)
        .filter(Notification.employee_id == current_employee.id)
        .order_by(Notification.is_read.asc(), Notification.created_at.desc())
        .all()
    )


@router.put("/notifications/{notification_id}/read", response_model=NotificationOut)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee),
):
    notification = db.get(Notification, notification_id)
    if not notification:
        raise not_found("Notification not found.")
    if notification.employee_id != current_employee.id:
        raise forbidden("You can only mark your own notifications as read.")

    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification


@router.put("/notifications/read-all")
def mark_all_notifications_read(db: Session = Depends(get_db), current_employee: Employee = Depends(get_current_employee)):
    updated = (
        db.query(Notification)
        .filter(Notification.employee_id == current_employee.id, Notification.is_read.is_(False))
        .update({"is_read": True})
    )
    db.commit()
    return {"detail": f"{updated} notification(s) marked as read."}
