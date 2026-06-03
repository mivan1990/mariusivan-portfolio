from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from database import get_db
from models import User, WorldCupBet, WorldCupMatch
from routers.auth import get_current_user, JWT_SECRET, JWT_ALGORITHM

_security = HTTPBearer(auto_error=False)


def _optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_security),
    db: Session = Depends(get_db),
) -> User | None:
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email = payload.get("sub")
        if not email or payload.get("type") != "user":
            return None
        return db.query(User).filter(User.email == email).first()
    except JWTError:
        return None

router = APIRouter(prefix="/api/worldcup", tags=["worldcup"])

VALID_OUTCOMES = ("home_win", "away_win", "draw")


def _fmt_match(m: WorldCupMatch, my_bet: WorldCupBet | None = None) -> dict:
    d = {
        "id": m.id,
        "external_id": m.external_id,
        "home_team": m.home_team,
        "away_team": m.away_team,
        "home_team_code": m.home_team_code,
        "away_team_code": m.away_team_code,
        "scheduled_at": m.scheduled_at.isoformat(),
        "stage": m.stage,
        "group": m.group,
        "status": m.status,
        "home_score": m.home_score,
        "away_score": m.away_score,
        "result": m.result,
        "bets_processed": m.bets_processed,
        "my_bet": None,
    }
    if my_bet:
        d["my_bet"] = {
            "id": my_bet.id,
            "predicted_outcome": my_bet.predicted_outcome,
            "points_earned": my_bet.points_earned,
        }
    return d


def _is_locked(match: WorldCupMatch) -> bool:
    return match.scheduled_at <= datetime.utcnow() or match.status not in ("SCHEDULED", "TIMED")


@router.get("/matches")
def list_matches(
    db: Session = Depends(get_db),
    current_user: User | None = Depends(_optional_user),
):
    matches = db.query(WorldCupMatch).order_by(WorldCupMatch.scheduled_at.asc()).all()
    result = []
    for m in matches:
        my_bet = None
        if current_user:
            my_bet = db.query(WorldCupBet).filter(
                WorldCupBet.match_id == m.id,
                WorldCupBet.user_id == current_user.id,
            ).first()
        result.append(_fmt_match(m, my_bet))
    return result


class BetCreate(BaseModel):
    match_id: int
    predicted_outcome: str


class BetUpdate(BaseModel):
    predicted_outcome: str


@router.post("/bets", status_code=201)
def place_bet(
    data: BetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.predicted_outcome not in VALID_OUTCOMES:
        raise HTTPException(400, f"predicted_outcome invalid. Valori acceptate: {VALID_OUTCOMES}")

    match = db.query(WorldCupMatch).filter(WorldCupMatch.id == data.match_id).first()
    if not match:
        raise HTTPException(404, "Meciul nu a fost gasit")
    if _is_locked(match):
        raise HTTPException(400, "Meciul a inceput deja — nu mai poti paria")

    existing = db.query(WorldCupBet).filter(
        WorldCupBet.user_id == current_user.id,
        WorldCupBet.match_id == data.match_id,
    ).first()
    if existing:
        raise HTTPException(400, "Ai pariat deja pe acest meci")

    bet = WorldCupBet(
        user_id=current_user.id,
        match_id=data.match_id,
        predicted_outcome=data.predicted_outcome,
    )
    db.add(bet)
    db.commit()
    db.refresh(bet)
    return _fmt_match(match, bet)


@router.put("/bets/{bet_id}")
def update_bet(
    bet_id: int,
    data: BetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.predicted_outcome not in VALID_OUTCOMES:
        raise HTTPException(400, f"predicted_outcome invalid. Valori acceptate: {VALID_OUTCOMES}")

    bet = db.query(WorldCupBet).filter(
        WorldCupBet.id == bet_id,
        WorldCupBet.user_id == current_user.id,
    ).first()
    if not bet:
        raise HTTPException(404, "Pariul nu a fost gasit")
    if _is_locked(bet.match):
        raise HTTPException(400, "Meciul a inceput deja — nu mai poti modifica")

    bet.predicted_outcome = data.predicted_outcome
    bet.updated_at = datetime.utcnow()
    db.commit()
    return _fmt_match(bet.match, bet)


@router.delete("/bets/{bet_id}", status_code=204)
def delete_bet(
    bet_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bet = db.query(WorldCupBet).filter(
        WorldCupBet.id == bet_id,
        WorldCupBet.user_id == current_user.id,
    ).first()
    if not bet:
        raise HTTPException(404, "Pariul nu a fost gasit")
    if _is_locked(bet.match):
        raise HTTPException(400, "Meciul a inceput deja — nu mai poti sterge pariul")

    db.delete(bet)
    db.commit()


@router.get("/bets/my")
def my_bets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bets = db.query(WorldCupBet).filter(WorldCupBet.user_id == current_user.id).all()
    return [
        {
            "id": b.id,
            "predicted_outcome": b.predicted_outcome,
            "points_earned": b.points_earned,
            "match": _fmt_match(b.match),
        }
        for b in bets
    ]


@router.post("/sync")
async def trigger_sync(db: Session = Depends(get_db)):
    """Trigger manual sync (nu necesita auth — poate fi securizat ulterior)."""
    from services.worldcup_sync import sync_matches
    count = await sync_matches()
    return {"synced": count}
