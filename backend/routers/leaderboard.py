from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Player, PlayerMatchStat, Match, BetEntry

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])


def _calc_stats(player: Player, stats: list) -> dict:
    total_kills = sum(s.kills for s in stats)
    total_deaths = sum(s.deaths for s in stats)
    total_hs = sum(s.headshot_kills for s in stats)
    total_damage = sum(s.damage for s in stats)
    total_rounds = sum(s.rounds_played for s in stats)
    matches_played = len(stats)
    wins = sum(1 for s in stats if s.won)
    return {
        "id": player.id,
        "steam_nickname": player.steam_nickname,
        "real_name": player.real_name,
        "team_name": player.team_name,
        "avatar_url": player.avatar_url,
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
        "damage": total_damage,
        "adr": round(total_damage / max(total_rounds, 1), 1),
        "mvps": sum(s.mvps for s in stats),
        "kills_2k": sum(s.kills_2k for s in stats),
        "kills_3k": sum(s.kills_3k for s in stats),
        "kills_4k": sum(s.kills_4k for s in stats),
        "kills_5k": sum(s.kills_5k for s in stats),
        "utility_damage": sum(s.utility_damage for s in stats),
        "entry_wins": sum(s.entry_wins for s in stats),
        "clutch_1v1_wins": sum(s.clutch_1v1_wins for s in stats),
    }


@router.get("")
def get_leaderboard(sort_by: str = "kd_ratio", db: Session = Depends(get_db)):
    players = db.query(Player).all()
    result = [_calc_stats(p, p.match_stats) for p in players]
    valid = {"kd_ratio", "kills", "adr", "hs_percent", "wins", "mvps", "win_rate"}
    result.sort(key=lambda x: x.get(sort_by if sort_by in valid else "kd_ratio", 0), reverse=True)
    return result


@router.get("/teams")
def get_team_leaderboard(db: Session = Depends(get_db)):
    matches = db.query(Match).all()
    team_stats: dict[str, dict] = {}

    for match in matches:
        t1_names: set[str] = set()
        t2_names: set[str] = set()
        for stat in match.player_stats:
            if stat.player and stat.player.team_name:
                (t1_names if stat.team == 1 else t2_names).add(stat.player.team_name)
        if len(t1_names) != 1 or len(t2_names) != 1:
            continue
        t1, t2 = t1_names.pop(), t2_names.pop()
        if t1 == t2:
            continue

        if match.team1_score > match.team2_score:
            t1_pts, t2_pts, t1r, t2r = 3, 0, "win", "loss"
        elif match.team2_score > match.team1_score:
            t1_pts, t2_pts, t1r, t2r = 0, 3, "loss", "win"
        else:
            t1_pts, t2_pts, t1r, t2r = 1, 1, "draw", "draw"

        for name in (t1, t2):
            if name not in team_stats:
                team_stats[name] = {"team_name": name, "matches_played": 0, "wins": 0, "draws": 0, "losses": 0, "points": 0, "rounds_for": 0, "rounds_against": 0}

        team_stats[t1]["matches_played"] += 1
        team_stats[t1]["points"] += t1_pts
        team_stats[t1]["rounds_for"] += match.team1_score
        team_stats[t1]["rounds_against"] += match.team2_score
        if t1r == "win": team_stats[t1]["wins"] += 1
        elif t1r == "draw": team_stats[t1]["draws"] += 1
        else: team_stats[t1]["losses"] += 1

        team_stats[t2]["matches_played"] += 1
        team_stats[t2]["points"] += t2_pts
        team_stats[t2]["rounds_for"] += match.team2_score
        team_stats[t2]["rounds_against"] += match.team1_score
        if t2r == "win": team_stats[t2]["wins"] += 1
        elif t2r == "draw": team_stats[t2]["draws"] += 1
        else: team_stats[t2]["losses"] += 1

    result = list(team_stats.values())
    for t in result:
        t["round_diff"] = t["rounds_for"] - t["rounds_against"]
    return sorted(result, key=lambda x: (x["points"], x["round_diff"]), reverse=True)


@router.get("/bets")
def get_bets_leaderboard(db: Session = Depends(get_db)):
    entries = db.query(BetEntry).order_by(BetEntry.points.desc()).all()
    return [
        {
            "id": e.id,
            "display_name": e.display_name,
            "points": e.points,
            "bets_total": e.bets_total,
            "bets_won": e.bets_won,
            "bets_draw": e.bets_draw,
            "bets_lost": e.bets_lost,
            "bets_pending": e.bets_pending,
        }
        for e in entries
    ]
