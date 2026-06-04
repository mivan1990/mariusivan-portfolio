from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import ScheduledMatch

router = APIRouter(prefix="/api/scheduled", tags=["scheduled"])


def _fmt(sm: ScheduledMatch) -> dict:
    entry: dict = {
        "id": sm.id,
        "team_a": sm.team_a,
        "team_b": sm.team_b,
        "scheduled_at": sm.scheduled_at.isoformat() if sm.scheduled_at else None,
        "match_id": sm.match_id,
        "winner": sm.winner,
        "bracket_round": sm.bracket_round,
        "bracket_position": sm.bracket_position,
    }
    if sm.match_id and sm.match:
        entry["result"] = {
            "team1_score": sm.match.team1_score,
            "team2_score": sm.match.team2_score,
            "rounds_played": sm.match.rounds_played,
            "map_name": sm.match.map_name,
        }
    return entry


@router.get("")
def list_scheduled(db: Session = Depends(get_db)):
    items = db.query(ScheduledMatch).order_by(ScheduledMatch.created_at.asc()).all()
    return [_fmt(sm) for sm in items]
