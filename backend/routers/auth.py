from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel
from jose import JWTError, jwt
from slowapi import Limiter
from slowapi.util import get_remote_address
import bcrypt
import os

from database import get_db
from models import User, ActivityLog, AdminUser

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/api/auth", tags=["auth"])

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-this-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_DAYS = 30

security = HTTPBearer(auto_error=False)


class RegisterRequest(BaseModel):
    email: str
    password: str
    display_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


def _hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _verify(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def _create_token(email: str) -> str:
    expire = datetime.utcnow() + timedelta(days=JWT_EXPIRE_DAYS)
    return jwt.encode({"sub": email, "type": "user", "exp": expire}, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _log(db: Session, action: str, user_id: Optional[int] = None, detail: Optional[str] = None, ip: Optional[str] = None):
    db.add(ActivityLog(user_id=user_id, action=action, detail=detail, ip_address=ip))


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=401, detail="Autentificare necesara")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email = payload.get("sub")
        token_type = payload.get("type")
        if not email or token_type != "user":
            raise HTTPException(status_code=401, detail="Token invalid")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalid sau expirat")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="User inexistent")
    return user


def _user_response(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "display_name": user.display_name,
        "points": user.points,
        "is_admin": bool(user.is_admin),
    }


# @router.post("/register", status_code=201)
# def register(...): disabled in portfolio — use /demo instead


def _create_admin_token(username: str) -> str:
    expire = datetime.utcnow() + timedelta(days=30)
    return jwt.encode({"sub": username, "exp": expire}, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _ensure_admin_user(db: Session, email: str) -> None:
    if not db.query(AdminUser).filter(AdminUser.username == email).first():
        db.add(AdminUser(username=email, password_hash=""))
        db.commit()


# @router.post("/login")
# def login(...): disabled in portfolio — use /demo instead


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        **_user_response(current_user),
        "created_at": current_user.created_at.isoformat(),
    }


@router.get("/admin-token")
def get_admin_token(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Nu esti admin")
    _ensure_admin_user(db, current_user.email)
    return {"admin_token": _create_admin_token(current_user.email)}


@router.post("/demo")
def demo_login(db: Session = Depends(get_db)):
    """Auto-login ca DEMO admin — portfolio only."""
    user = db.query(User).filter(User.email == "demo@portfolio.ro").first()
    if not user:
        user = User(email="demo@portfolio.ro", password_hash="", display_name="DEMO", is_admin=True, points=9999)
        db.add(user)
        db.flush()
    _ensure_admin_user(db, user.email)
    db.commit()
    return {
        "access_token": _create_token(user.email),
        "admin_token": _create_admin_token(user.email),
        "token_type": "bearer",
        "user": _user_response(user),
    }
