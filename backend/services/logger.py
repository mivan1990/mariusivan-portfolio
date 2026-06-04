from sqlalchemy.orm import Session
from models import ActivityLog


def log_action(
    db: Session,
    action: str,
    detail: str | None = None,
    user_id: int | None = None,
    ip: str | None = None,
) -> None:
    db.add(ActivityLog(action=action, detail=detail, user_id=user_id, ip_address=ip))
    db.commit()
