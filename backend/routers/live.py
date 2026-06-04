import time
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from services.live_watcher import get_state, poll_once, is_session_active
from models import AdminUser, Player
from routers.admin import _verify_token
from database import get_db

router = APIRouter(prefix="/api/live", tags=["live"])


def _enrich_players(players: list[dict], db: Session) -> tuple[list[dict], str, str]:
    all_players = db.query(Player).all()
    name_index: dict[str, Player] = {}
    for p in all_players:
        for raw in [*(p.aliases or "").split(","), p.real_name or "", p.steam_nickname or ""]:
            key = raw.strip().lower()
            if key:
                name_index[key] = p

    enriched = []
    team1_counts: dict[str, int] = {}
    team2_counts: dict[str, int] = {}

    for p in players:
        nick = p.get("steam_nickname", "")
        db_player = name_index.get(nick.strip().lower())
        team_name = db_player.team_name if db_player and db_player.team_name else None
        real_name = db_player.real_name if db_player else None
        enriched.append({**p, "team_name": team_name, "real_name": real_name})
        if team_name:
            bucket = team1_counts if p.get("team") == 1 else team2_counts
            bucket[team_name] = bucket.get(team_name, 0) + 1

    team1_name = max(team1_counts, key=team1_counts.get) if team1_counts else "Echipa 1"
    team2_name = max(team2_counts, key=team2_counts.get) if team2_counts else "Echipa 2"
    return enriched, team1_name, team2_name


@router.get("")
def get_live_match(db: Session = Depends(get_db)):
    """Starea curenta a meciului live. Polleaza la fiecare 10 secunde."""
    if not is_session_active():
        return {"is_live": False}

    state = get_state()

    if not state["is_live"]:
        return {"is_live": False}

    last_updated = state.get("last_updated")
    seconds_ago = int(time.time() - last_updated) if last_updated else None

    players = state["players"] or []
    enriched, team1_name, team2_name = _enrich_players(players, db)

    return {
        "is_live": True,
        "map_name": state["map_name"],
        "rounds_played": state["rounds_played"],
        "team1_score": state["team1_score"],
        "team2_score": state["team2_score"],
        "team1_name": team1_name,
        "team2_name": team2_name,
        "players": enriched,
        "seconds_ago": seconds_ago,
    }


@router.post("/refresh")
async def force_refresh(_: AdminUser = Depends(_verify_token)):
    """Forteaza o citire imediata (admin only)."""
    await poll_once()
    return get_live_match()
