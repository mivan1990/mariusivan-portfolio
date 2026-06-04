from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Match, PlayerMatchStat, Player

router = APIRouter(prefix="/api/matches", tags=["matches"])


def _team_name(players_by_team: dict, team_num: int) -> str | None:
    for p in players_by_team.get(team_num, []):
        if p.team_name:
            return p.team_name
    return None


def _player_summary(stat: PlayerMatchStat, player: Player) -> dict:
    return {
        "id": player.id,
        "name": player.real_name or player.steam_nickname,
        "steam_nickname": player.steam_nickname,
        "avatar_url": player.avatar_url,
        "team_name": player.team_name,
        "team": stat.team,
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
        "score": stat.score,
        "rounds_won": stat.rounds_won,
        "kills_2k": stat.kills_2k,
        "kills_3k": stat.kills_3k,
        "kills_4k": stat.kills_4k,
        "kills_5k": stat.kills_5k,
        "first_kills": stat.first_kills,
        "utility_damage": stat.utility_damage,
        "enemies_flashed": stat.enemies_flashed,
        "clutch_1v1_wins": stat.clutch_1v1_wins,
        "clutch_1v2_wins": stat.clutch_1v2_wins,
        "entry_wins": stat.entry_wins,
    }


@router.get("")
def list_matches(db: Session = Depends(get_db)):
    matches = db.query(Match).order_by(Match.timestamp.desc()).all()
    result = []
    for match in matches:
        players = []
        players_by_team: dict[int, list] = {1: [], 2: []}
        for stat in match.player_stats:
            player = db.query(Player).filter(Player.id == stat.player_id).first()
            if player:
                players.append({
                    "id": player.id,
                    "name": player.real_name or player.steam_nickname,
                    "avatar_url": player.avatar_url,
                    "team_name": player.team_name,
                    "team": stat.team,
                    "kills": stat.kills,
                    "deaths": stat.deaths,
                    "kd_ratio": round(stat.kills / max(stat.deaths, 1), 2),
                })
                players_by_team.setdefault(stat.team, []).append(player)
        result.append({
            "id": match.id,
            "timestamp": match.timestamp.isoformat() if match.timestamp else None,
            "map_name": match.map_name,
            "rounds_played": match.rounds_played,
            "team1_score": match.team1_score,
            "team2_score": match.team2_score,
            "team1_name": _team_name(players_by_team, 1),
            "team2_name": _team_name(players_by_team, 2),
            "players": players,
        })
    return result


@router.get("/{match_id}")
def get_match(match_id: int, db: Session = Depends(get_db)):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Meciul nu a fost gasit")

    players_detail = []
    players_by_team: dict[int, list] = {1: [], 2: []}
    for stat in match.player_stats:
        player = db.query(Player).filter(Player.id == stat.player_id).first()
        if player:
            players_detail.append(_player_summary(stat, player))
            players_by_team.setdefault(stat.team, []).append(player)

    return {
        "id": match.id,
        "timestamp": match.timestamp.isoformat() if match.timestamp else None,
        "map_name": match.map_name,
        "rounds_played": match.rounds_played,
        "team1_score": match.team1_score,
        "team2_score": match.team2_score,
        "team1_name": _team_name(players_by_team, 1),
        "team2_name": _team_name(players_by_team, 2),
        "first_half_team1": match.first_half_team1,
        "first_half_team2": match.first_half_team2,
        "second_half_team1": match.second_half_team1,
        "second_half_team2": match.second_half_team2,
        "players": players_detail,
    }
