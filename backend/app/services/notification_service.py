"""
Notifications are always created as a side effect of business logic
elsewhere in the app — there is no public POST /notifications endpoint.
"""
from sqlalchemy.orm import Session

from app.models.notifications import Notification


def create_notification(db: Session, employee_id: int, type_: str, message: str, commit: bool = True) -> Notification:
    notification = Notification(employee_id=employee_id, type=type_, message=message)
    db.add(notification)
    db.flush()
    if commit:
        db.commit()
        db.refresh(notification)
    return notification