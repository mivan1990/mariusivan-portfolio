from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Player, PlayerMatchStat, Match

router = APIRouter(prefix="/api/players", tags=["players"])


@router.get("")
def list_players(db: Session = Depends(get_db)):
    players = db.query(Player).order_by(Player.real_name).all()
    return [
        {
            "id": p.id,
            "steam_nickname": p.steam_nickname,
            "real_name": p.real_name,
            "team_name": p.team_name,
            "avatar_url": p.avatar_url,
        }
        for p in players
    ]


@router.get("/{player_id}")
def get_player(player_id: int, db: Session = Depends(get_db)):
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Jucatorul nu a fost gasit")

    stats = player.match_stats
    match_history = []
    for stat in stats:
        match = db.query(Match).filter(Match.id == stat.match_id).first()
        if match:
            match_history.append({
                "match_id": match.id,
                "timestamp": match.timestamp.isoformat() if match.timestamp else None,
                "map_name": match.map_name,
                "team1_score": match.team1_score,
                "team2_score": match.team2_score,
                "player_team": stat.team,
                "won": stat.won,
                "kills": stat.kills,
                "deaths": stat.deaths,
                "assists": stat.assists,
                "headshot_kills": stat.headshot_kills,
                "hs_percent": round(stat.headshot_kills * 100 / max(stat.kills, 1), 1),
                "damage": stat.damage,
                "adr": round(stat.damage / max(stat.rounds_played, 1), 1),
                "kd_ratio": round(stat.kills / max(stat.deaths, 1), 2),
                "mvps": stat.mvps,
                "kills_2k": stat.kills_2k,
                "kills_3k": stat.kills_3k,
                "kills_4k": stat.kills_4k,
                "kills_5k": stat.kills_5k,
                "utility_damage": stat.utility_damage,
                "clutch_1v1_wins": stat.clutch_1v1_wins,
                "entry_wins": stat.entry_wins,
            })

    total_kills = sum(s.kills for s in stats)
    total_deaths = sum(s.deaths for s in stats)
    total_hs = sum(s.headshot_kills for s in stats)
    total_damage = sum(s.damage for s in stats)
    total_rounds = sum(s.rounds_played for s in stats)
    matches_played = len(stats)
    wins = sum(1 for s in stats if s.won)

    return {
        "id": player.id,
        "steam_account_id": player.steam_account_id,
        "steam_id64": player.steam_id64,
        "steam_nickname": player.steam_nickname,
        "real_name": player.real_name,
        "team_name": player.team_name,
        "avatar_url": player.avatar_url,
        "career": {
            "matches_played": matches_played,
            "wins": wins,
            "losses": matches_played - wins,
            "win_rate": round(wins * 100 / max(matches_played, 1), 1),
            "kills": total_kills,
            "deaths": total_deaths,
            "assists": sum(s.assists for s in stats),
            "kd_ratio": round(total_kills / max(total_deaths, 1), 2),
            "headshot_kills": total_hs,
            "hs_percent": round(total_hs * 100 / max(total_kills, 1), 1),
            "adr": round(total_damage / max(total_rounds, 1), 1),
            "mvps": sum(s.mvps for s in stats),
            "kills_2k": sum(s.kills_2k for s in stats),
            "kills_3k": sum(s.kills_3k for s in stats),
            "kills_4k": sum(s.kills_4k for s in stats),
            "kills_5k": sum(s.kills_5k for s in stats),
            "utility_damage": sum(s.utility_damage for s in stats),
            "clutch_1v1_wins": sum(s.clutch_1v1_wins for s in stats),
            "entry_wins": sum(s.entry_wins for s in stats),
        },
        "match_history": sorted(match_history, key=lambda x: x["timestamp"] or "", reverse=True),
    }
