"""
Sincronizare meciuri FIFA World Cup 2026 din football-data.org.
Ruleaza in background: sync la pornire + la fiecare 5 minute.
"""
import asyncio
import os
import httpx
from datetime import datetime, timezone

from database import SessionLocal
from models import WorldCupMatch, WorldCupBet, User

API_KEY = os.getenv("FOOTBALL_DATA_API_KEY", "")
API_BASE = "https://api.football-data.org/v4"
COMPETITION = "WC"

STAGE_LABELS = {
    "GROUP_STAGE": "Grupe",
    "ROUND_OF_16": "Optimi",
    "QUARTER_FINALS": "Sferturi",
    "SEMI_FINALS": "Semifinale",
    "THIRD_PLACE": "Locul 3",
    "FINAL": "Finala",
}


def _parse_result(winner: str | None) -> str | None:
    if winner == "HOME_TEAM":
        return "home_win"
    if winner == "AWAY_TEAM":
        return "away_win"
    if winner == "DRAW":
        return "draw"
    return None


async def sync_matches() -> int:
    """Preia meciurile WC din API si le upsert-uieste in DB. Returneaza nr. upsert-uri."""
    if not API_KEY:
        print("[WC] FOOTBALL_DATA_API_KEY lipseste — sync dezactivat")
        return 0

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{API_BASE}/competitions/{COMPETITION}/matches",
                headers={"X-Auth-Token": API_KEY},
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        print(f"[WC] Eroare la fetch meciuri: {e}")
        return 0

    db = SessionLocal()
    count = 0
    try:
        for m in data.get("matches", []):
            ext_id = m["id"]
            scheduled_raw = m.get("utcDate", "")
            try:
                scheduled_at = datetime.fromisoformat(scheduled_raw.replace("Z", "+00:00")).replace(tzinfo=None)
            except Exception:
                continue

            home = m.get("homeTeam", {})
            away = m.get("awayTeam", {})
            score = m.get("score", {})
            full_time = score.get("fullTime", {})
            winner_raw = score.get("winner")
            status = m.get("status", "SCHEDULED")

            existing = db.query(WorldCupMatch).filter(WorldCupMatch.external_id == ext_id).first()
            if existing is None:
                existing = WorldCupMatch(external_id=ext_id)
                db.add(existing)

            existing.home_team = home.get("name") or home.get("shortName") or "TBD"
            existing.away_team = away.get("name") or away.get("shortName") or "TBD"
            existing.home_team_code = home.get("tla")
            existing.away_team_code = away.get("tla")
            existing.scheduled_at = scheduled_at
            existing.stage = m.get("stage")
            existing.group = m.get("group")
            existing.status = status
            existing.home_score = full_time.get("home")
            existing.away_score = full_time.get("away")

            if status == "FINISHED" and existing.result is None:
                existing.result = _parse_result(winner_raw)

            count += 1

        db.commit()
        print(f"[WC] Sync complet: {count} meciuri upsert-uite")

        # Proceseaza pariurile pentru meciurile terminate neprocesate
        await _process_finished(db)
    except Exception as e:
        db.rollback()
        print(f"[WC] Eroare la salvare: {e}")
    finally:
        db.close()

    return count


async def _process_finished(db) -> None:
    """Acorda puncte pentru meciurile terminate cu pariuri neprocesate."""
    unprocessed = (
        db.query(WorldCupMatch)
        .filter(
            WorldCupMatch.status == "FINISHED",
            WorldCupMatch.result.isnot(None),
            WorldCupMatch.bets_processed == False,
        )
        .all()
    )

    for match in unprocessed:
        bets = db.query(WorldCupBet).filter(WorldCupBet.match_id == match.id).all()
        for bet in bets:
            pts = 3 if bet.predicted_outcome == match.result else 0
            bet.points_earned = pts
            user = db.query(User).filter(User.id == bet.user_id).first()
            if user:
                user.points += pts
        match.bets_processed = True
        print(f"[WC] Procesate {len(bets)} pariuri pt {match.home_team} vs {match.away_team} (result={match.result})")

    if unprocessed:
        db.commit()


async def background_sync_loop() -> None:
    """Loop care sync-uieste meciurile la fiecare 5 minute."""
    await asyncio.sleep(5)  # mic delay la startup
    while True:
        await sync_matches()
        await asyncio.sleep(300)  # 5 minute
