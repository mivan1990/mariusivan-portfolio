from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel
from jose import JWTError, jwt
import os

from database import get_db
from models import User

router = APIRouter(prefix="/api/auth", tags=["auth"])

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-this-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_DAYS = 365

security = HTTPBearer(auto_error=False)


def _create_token(email: str) -> str:
    expire = datetime.utcnow() + timedelta(days=JWT_EXPIRE_DAYS)
    return jwt.encode({"sub": email, "type": "user", "exp": expire}, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=401, detail="Autentificare necesara")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email = payload.get("sub")
        if not email or payload.get("type") != "user":
            raise HTTPException(status_code=401, detail="Token invalid")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalid sau expirat")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="User inexistent")
    return user


class GuestRequest(BaseModel):
    guest_id: str


@router.post("/guest")
def guest_login(data: GuestRequest, db: Session = Depends(get_db)):
    """Auto-creeaza sau logeaza un user guest bazat pe UUID din localStorage."""
    if len(data.guest_id) < 8 or len(data.guest_id) > 64:
        raise HTTPException(status_code=400, detail="guest_id invalid")

    email = f"guest_{data.guest_id}@portfolio"
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            password_hash="",
            display_name=f"Guest #{data.guest_id[:6]}",
            points=100,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return {
        "access_token": _create_token(email),
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "display_name": user.display_name,
            "points": user.points,
        },
    }


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "display_name": current_user.display_name,
        "points": current_user.points,
    }
