from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from database import get_db
from models import Bet, ScheduledMatch, User
from routers.auth import get_current_user
from services.logger import log_action

router = APIRouter(prefix="/api/bets", tags=["bets"])


class BetCreate(BaseModel):
    scheduled_match_id: int
    predicted_winner: str  # 'team_a' sau 'team_b'


class BetUpdate(BaseModel):
    predicted_winner: str


def _fmt(bet: Bet) -> dict:
    sm = bet.scheduled_match
    return {
        "id": bet.id,
        "scheduled_match_id": bet.scheduled_match_id,
        "predicted_winner": bet.predicted_winner,
        "points_earned": bet.points_earned,
        "created_at": bet.created_at.isoformat(),
        "updated_at": bet.updated_at.isoformat(),
        "match": {
            "team_a": sm.team_a,
            "team_b": sm.team_b,
            "scheduled_at": sm.scheduled_at.isoformat() if sm.scheduled_at else None,
            "winner": sm.winner,
            "bets_processed": sm.bets_processed,
        } if sm else None,
    }


@router.get("/my")
def my_bets(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    bets = (
        db.query(Bet)
        .filter(Bet.user_id == current_user.id)
        .order_by(Bet.created_at.desc())
        .all()
    )
    return [_fmt(b) for b in bets]


@router.get("/match/{sm_id}/stats")
def match_stats(sm_id: int, db: Session = Depends(get_db)):
    bets = db.query(Bet).filter(Bet.scheduled_match_id == sm_id).all()
    return {
        "team_a": sum(1 for b in bets if b.predicted_winner == "team_a"),
        "team_b": sum(1 for b in bets if b.predicted_winner == "team_b"),
        "total": len(bets),
    }


@router.post("", status_code=201)
def place_bet(
    data: BetCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.predicted_winner not in ("team_a", "team_b"):
        raise HTTPException(status_code=400, detail="predicted_winner trebuie sa fie 'team_a' sau 'team_b'")

    sm = db.query(ScheduledMatch).filter(ScheduledMatch.id == data.scheduled_match_id).first()
    if not sm:
        raise HTTPException(status_code=404, detail="Meciul programat nu a fost gasit")
    if sm.scheduled_at <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="Meciul a inceput deja, nu mai poti paria")
    if sm.winner is not None:
        raise HTTPException(status_code=400, detail="Meciul are deja un rezultat")

    existing = db.query(Bet).filter(
        Bet.user_id == current_user.id,
        Bet.scheduled_match_id == data.scheduled_match_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ai pariat deja pe acest meci. Foloseste modificare pentru a schimba.")

    bet = Bet(
        user_id=current_user.id,
        scheduled_match_id=data.scheduled_match_id,
        predicted_winner=data.predicted_winner,
    )
    db.add(bet)
    db.commit()
    db.refresh(bet)
    log_action(
        db, "bet_placed",
        f"{current_user.display_name or current_user.email} → {data.predicted_winner} pe {sm.team_a} vs {sm.team_b}",
        current_user.id,
        request.client.host if request.client else None,
    )
    return _fmt(bet)


@router.delete("/{bet_id}", status_code=204)
def delete_bet(
    bet_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bet = db.query(Bet).filter(Bet.id == bet_id, Bet.user_id == current_user.id).first()
    if not bet:
        raise HTTPException(status_code=404, detail="Pariul nu a fost gasit")

    sm = bet.scheduled_match
    if sm.scheduled_at <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="Meciul a inceput deja, nu mai poti sterge pariul")

    log_action(
        db, "bet_deleted",
        f"{current_user.display_name or current_user.email} sters pariul pe {sm.team_a} vs {sm.team_b}",
        current_user.id,
        request.client.host if request.client else None,
    )
    db.delete(bet)
    db.commit()


@router.put("/{bet_id}")
def change_bet(
    bet_id: int,
    data: BetUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.predicted_winner not in ("team_a", "team_b"):
        raise HTTPException(status_code=400, detail="predicted_winner trebuie sa fie 'team_a' sau 'team_b'")

    bet = db.query(Bet).filter(Bet.id == bet_id, Bet.user_id == current_user.id).first()
    if not bet:
        raise HTTPException(status_code=404, detail="Pariul nu a fost gasit")

    sm = bet.scheduled_match
    if sm.scheduled_at <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="Meciul a inceput deja, nu mai poti schimba pariul")

    bet.predicted_winner = data.predicted_winner
    bet.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(bet)
    log_action(
        db, "bet_changed",
        f"{current_user.display_name or current_user.email} schimbat la {data.predicted_winner} pe {sm.team_a} vs {sm.team_b}",
        current_user.id,
        request.client.host if request.client else None,
    )
    return _fmt(bet)
