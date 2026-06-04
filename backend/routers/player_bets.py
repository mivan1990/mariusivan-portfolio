from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel

from database import get_db
from models import PlayerBet, Player, ScheduledMatch, User
from routers.auth import get_current_user
from services.logger import log_action

router = APIRouter(prefix="/api/bets/player", tags=["player-bets"])


class PlayerBetCreate(BaseModel):
    scheduled_match_id: int
    predicted_player_id: int


class PlayerBetUpdate(BaseModel):
    predicted_player_id: int


def _fmt(pb: PlayerBet) -> dict:
    sm = pb.scheduled_match
    p = pb.predicted_player
    return {
        "id": pb.id,
        "scheduled_match_id": pb.scheduled_match_id,
        "predicted_player_id": pb.predicted_player_id,
        "predicted_player_name": p.real_name or p.steam_nickname if p else None,
        "predicted_player_nickname": p.steam_nickname if p else None,
        "points_earned": pb.points_earned,
        "created_at": pb.created_at.isoformat(),
        "updated_at": pb.updated_at.isoformat(),
        "match": {
            "team_a": sm.team_a,
            "team_b": sm.team_b,
            "scheduled_at": sm.scheduled_at.isoformat() if sm.scheduled_at else None,
            "winner": sm.winner,
            "bets_processed": sm.bets_processed,
        } if sm else None,
    }


@router.get("/my")
def my_player_bets(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    bets = (
        db.query(PlayerBet)
        .filter(PlayerBet.user_id == current_user.id)
        .order_by(PlayerBet.created_at.desc())
        .all()
    )
    return [_fmt(b) for b in bets]


@router.post("", status_code=201)
def place_player_bet(
    data: PlayerBetCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sm = db.query(ScheduledMatch).filter(ScheduledMatch.id == data.scheduled_match_id).first()
    if not sm:
        raise HTTPException(status_code=404, detail="Meciul programat nu a fost gasit")
    if sm.scheduled_at <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="Meciul a inceput deja, nu mai poti paria")
    if sm.winner is not None:
        raise HTTPException(status_code=400, detail="Meciul are deja un rezultat")

    player = db.query(Player).filter(Player.id == data.predicted_player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Jucatorul nu a fost gasit")

    existing = db.query(PlayerBet).filter(
        PlayerBet.user_id == current_user.id,
        PlayerBet.scheduled_match_id == data.scheduled_match_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ai pariat deja pe un jucator pentru acest meci.")

    pb = PlayerBet(
        user_id=current_user.id,
        scheduled_match_id=data.scheduled_match_id,
        predicted_player_id=data.predicted_player_id,
    )
    db.add(pb)
    db.commit()
    db.refresh(pb)
    log_action(
        db, "player_bet_placed",
        f"{current_user.display_name or current_user.email} → top fragger: {player.real_name or player.steam_nickname} pe {sm.team_a} vs {sm.team_b}",
        current_user.id,
        request.client.host if request.client else None,
    )
    return _fmt(pb)


@router.delete("/{bet_id}", status_code=204)
def delete_player_bet(
    bet_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pb = db.query(PlayerBet).filter(PlayerBet.id == bet_id, PlayerBet.user_id == current_user.id).first()
    if not pb:
        raise HTTPException(status_code=404, detail="Pariul nu a fost gasit")

    sm = pb.scheduled_match
    if sm.scheduled_at <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="Meciul a inceput deja, nu mai poti sterge pariul")

    log_action(
        db, "player_bet_deleted",
        f"{current_user.display_name or current_user.email} sters pariul top fragger pe {sm.team_a} vs {sm.team_b}",
        current_user.id,
        request.client.host if request.client else None,
    )
    db.delete(pb)
    db.commit()


@router.put("/{bet_id}")
def change_player_bet(
    bet_id: int,
    data: PlayerBetUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pb = db.query(PlayerBet).filter(PlayerBet.id == bet_id, PlayerBet.user_id == current_user.id).first()
    if not pb:
        raise HTTPException(status_code=404, detail="Pariul nu a fost gasit")

    sm = pb.scheduled_match
    if sm.scheduled_at <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="Meciul a inceput deja, nu mai poti schimba pariul")

    player = db.query(Player).filter(Player.id == data.predicted_player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Jucatorul nu a fost gasit")

    pb.predicted_player_id = data.predicted_player_id
    pb.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(pb)
    log_action(
        db, "player_bet_changed",
        f"{current_user.display_name or current_user.email} schimbat la {player.real_name or player.steam_nickname} pe {sm.team_a} vs {sm.team_b}",
        current_user.id,
        request.client.host if request.client else None,
    )
    return _fmt(pb)
