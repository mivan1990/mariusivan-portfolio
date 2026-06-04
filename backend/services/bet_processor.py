"""
Auto-procesare pariuri la finalul unui meci live (GSI gameover).

Fluxul:
1. try_auto_link  — leaga Match-ul de ScheduledMatch-ul potrivit din aceeasi zi
2. process_bets   — determina castigatorul din scoruri si acorda puncte
"""
from datetime import datetime, timedelta

from sqlalchemy.orm import Session
from sqlalchemy import func

from models import Bet, Match, Player, PlayerBet, PlayerMatchStat, ScheduledMatch, User, WorldCupBet


def calculate_user_points(user_id: int, db: Session) -> int:
    """Calculate user's total points from all earned bets (not stored value)"""
    team_pts = db.query(func.sum(Bet.points_earned)).filter(
        Bet.user_id == user_id,
        Bet.points_earned.isnot(None)
    ).scalar() or 0

    player_pts = db.query(func.sum(PlayerBet.points_earned)).filter(
        PlayerBet.user_id == user_id,
        PlayerBet.points_earned.isnot(None)
    ).scalar() or 0

    wc_pts = db.query(func.sum(WorldCupBet.points_earned)).filter(
        WorldCupBet.user_id == user_id,
        WorldCupBet.points_earned.isnot(None)
    ).scalar() or 0

    return int(team_pts + player_pts + wc_pts)


def _team_sides(db: Session, match: Match) -> tuple[set[str], set[str]]:
    """Returneaza (team1_names, team2_names) din PlayerMatchStat (deja salvat in DB)."""
    team1: set[str] = set()
    team2: set[str] = set()
    stats = db.query(PlayerMatchStat).filter(PlayerMatchStat.match_id == match.id).all()
    for stat in stats:
        player = db.query(Player).filter(Player.id == stat.player_id).first()
        if player and player.team_name:
            (team1 if stat.team == 1 else team2).add(player.team_name)
    return team1, team2


def try_auto_link(db: Session, match: Match, match_data: dict) -> "ScheduledMatch | None":
    """Incearca sa lege match-ul de un ScheduledMatch programat azi fara meci legat."""
    team1_names, team2_names = _team_sides(db, match)
    if not team1_names or not team2_names:
        print(f"[BetProcessor] Nu pot deduce echipele — jucatorii nu au team_name setat")
        return None

    match_date = match.timestamp or datetime.utcnow()
    day_start = match_date.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = day_start + timedelta(days=1)

    candidates = (
        db.query(ScheduledMatch)
        .filter(
            ScheduledMatch.scheduled_at >= day_start,
            ScheduledMatch.scheduled_at < day_end,
            ScheduledMatch.match_id.is_(None),
        )
        .all()
    )

    for sm in candidates:
        ta, tb = sm.team_a, sm.team_b
        if (ta in team1_names and tb in team2_names) or (ta in team2_names and tb in team1_names):
            sm.match_id = match.id
            db.commit()
            print(f"[BetProcessor] Meci #{match.id} legat de programat #{sm.id} ({ta} vs {tb})")
            return sm

    print(f"[BetProcessor] Niciun meci programat gasit pt echipele {team1_names} vs {team2_names}")
    return None


def process_bets(db: Session, sm: ScheduledMatch, match: Match, match_data: dict) -> dict:
    """Determina castigatorul si acorda puncte pentru pariuri echipa + top fragger."""
    if sm.bets_processed:
        print(f"[BetProcessor] Pariuri deja procesate pt programat #{sm.id}")
        return {"skipped": True}

    team1_score = match_data["team1_score"]
    team2_score = match_data["team2_score"]

    if team1_score == team2_score:
        print(f"[BetProcessor] Scor egal {team1_score}-{team2_score} — nu procesez automat")
        return {"skipped": True, "reason": "draw"}

    team1_names, team2_names = _team_sides(db, match)
    winner_names = team1_names if team1_score > team2_score else team2_names

    if sm.team_a in winner_names:
        winner = "team_a"
    elif sm.team_b in winner_names:
        winner = "team_b"
    else:
        print(
            f"[BetProcessor] Nu pot determina winner: "
            f"winner_names={winner_names}, team_a={sm.team_a}, team_b={sm.team_b}"
        )
        return {"skipped": True, "reason": "cannot_determine_winner"}

    sm.winner = winner
    sm.bets_processed = True

    # Pariuri echipa
    bets = db.query(Bet).filter(Bet.scheduled_match_id == sm.id).all()
    for bet in bets:
        pts = 3 if bet.predicted_winner == winner else 0
        bet.points_earned = pts
        user = db.query(User).filter(User.id == bet.user_id).first()
        if user:
            user.points += pts

    # Top fragger — cel mai multe kills
    top_stat = (
        db.query(PlayerMatchStat)
        .filter(PlayerMatchStat.match_id == match.id)
        .order_by(PlayerMatchStat.kills.desc())
        .first()
    )
    top_fragger_id = top_stat.player_id if top_stat else None

    player_bets = db.query(PlayerBet).filter(PlayerBet.scheduled_match_id == sm.id).all()
    for pb in player_bets:
        if top_fragger_id is not None:
            pts = 3 if pb.predicted_player_id == top_fragger_id else 0
            pb.points_earned = pts
            user = db.query(User).filter(User.id == pb.user_id).first()
            if user:
                user.points += pts

    db.commit()
    print(
        f"[BetProcessor] ✅ Procesate: winner={winner}, "
        f"{len(bets)} pariuri echipa, {len(player_bets)} pariuri top fragger, "
        f"top_fragger_id={top_fragger_id}"
    )
    return {
        "winner": winner,
        "team_bets_processed": len(bets),
        "player_bets_processed": len(player_bets),
        "top_fragger_id": top_fragger_id,
    }
