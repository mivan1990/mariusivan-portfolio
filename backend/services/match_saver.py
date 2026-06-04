"""
Salveaza / actualizeaza un meci live in baza de date dupa fiecare runda.
Folosit de live_watcher — upsert bazat pe session_id (mtime-ul backup_round00.txt).
"""
from datetime import datetime

from database import SessionLocal
from models import Match, Player, PlayerMatchStat
from services.steam import fetch_avatar_url, account_id_to_steam64


async def upsert_live_match(session_id: str, match_data: dict, is_gameover: bool = False) -> None:
    if match_data.get("rounds_played", 0) == 0:
        return

    db = SessionLocal()
    try:
        team1_score = match_data["team1_score"]
        team2_score = match_data["team2_score"]

        match = db.query(Match).filter(Match.session_id == session_id).first()
        if match is None:
            match = Match(
                session_id=session_id,
                timestamp=match_data.get("timestamp") or datetime.utcnow(),
                map_name=match_data["map_name"],
                rounds_played=match_data["rounds_played"],
                team1_score=team1_score,
                team2_score=team2_score,
                first_half_team1=match_data.get("first_half_team1", 0),
                first_half_team2=match_data.get("first_half_team2", 0),
                second_half_team1=match_data.get("second_half_team1", 0),
                second_half_team2=match_data.get("second_half_team2", 0),
                file_name="live",
            )
            db.add(match)
            db.flush()
        else:
            match.rounds_played = match_data["rounds_played"]
            match.team1_score = team1_score
            match.team2_score = team2_score
            match.first_half_team1 = match_data.get("first_half_team1", 0)
            match.first_half_team2 = match_data.get("first_half_team2", 0)
            match.second_half_team1 = match_data.get("second_half_team1", 0)
            match.second_half_team2 = match_data.get("second_half_team2", 0)

        # Index nume → jucator (alias, real_name, steam_nickname)
        name_index: dict[str, Player] = {}
        for candidate in db.query(Player).all():
            for raw in [*(candidate.aliases or "").split(","), candidate.steam_nickname or ""]:
                key = raw.strip().lower()
                if key:
                    name_index[key] = candidate

        for pdata in match_data["players"]:
            account_id = pdata["steam_account_id"]
            nick = pdata["steam_nickname"]
            team = pdata["team"]
            won = (
                (team == 1 and team1_score > team2_score)
                or (team == 2 and team2_score > team1_score)
            )

            # Match dupa nickname (alias/real_name/steam_nickname), fallback la steam_account_id
            player = name_index.get(nick.strip().lower())
            if player is None:
                player = db.query(Player).filter(Player.steam_account_id == account_id).first()
            if player is None:
                avatar_url = await fetch_avatar_url(account_id)
                player = Player(
                    steam_account_id=account_id,
                    steam_id64=account_id_to_steam64(account_id),
                    steam_nickname=nick,
                    avatar_url=avatar_url,
                )
                db.add(player)
                db.flush()
                name_index[nick.strip().lower()] = player
                print(f"[MatchSaver] Jucator nou creat: {nick}")
            else:
                player.steam_nickname = nick

            stat = db.query(PlayerMatchStat).filter(
                PlayerMatchStat.match_id == match.id,
                PlayerMatchStat.player_id == player.id,
            ).first()
            if stat is None:
                stat = PlayerMatchStat(match_id=match.id, player_id=player.id)
                db.add(stat)

            stat.team = team
            stat.won = won
            stat.rounds_played = match_data["rounds_played"]
            stat.kills = pdata["kills"]
            stat.deaths = pdata["deaths"]
            stat.assists = pdata["assists"]
            stat.headshot_kills = pdata["headshot_kills"]
            stat.damage = pdata["damage"]
            stat.mvps = pdata["mvps"]
            stat.score = pdata["score"]
            stat.rounds_won = pdata["rounds_won"]
            stat.kills_2k = pdata["kills_2k"]
            stat.kills_3k = pdata["kills_3k"]
            stat.kills_4k = pdata["kills_4k"]
            stat.kills_5k = pdata["kills_5k"]
            stat.first_kills = pdata["first_kills"]
            stat.clutch_kills = pdata["clutch_kills"]
            stat.kills_pistol = pdata["kills_pistol"]
            stat.kills_sniper = pdata["kills_sniper"]
            stat.kills_knife = pdata["kills_knife"]
            stat.kills_taser = pdata["kills_taser"]
            stat.utility_damage = pdata["utility_damage"]
            stat.enemies_flashed = pdata["enemies_flashed"]
            stat.flash_count = pdata["flash_count"]
            stat.clutch_1v1_count = pdata["clutch_1v1_count"]
            stat.clutch_1v1_wins = pdata["clutch_1v1_wins"]
            stat.clutch_1v2_count = pdata["clutch_1v2_count"]
            stat.clutch_1v2_wins = pdata["clutch_1v2_wins"]
            stat.entry_count = pdata["entry_count"]
            stat.entry_wins = pdata["entry_wins"]

        db.commit()
        print(f"[MatchSaver] Salvat: {match_data['map_name']} R{match_data['rounds_played']} | {team1_score}-{team2_score}")

        if is_gameover:
            from routers.admin import _save_match_backup
            _save_match_backup(match.id, match_data, source="live")
            from services.bet_processor import try_auto_link, process_bets
            sm = try_auto_link(db, match, match_data)
            if sm:
                process_bets(db, sm, match, match_data)
    except Exception as e:
        db.rollback()
        print(f"[MatchSaver] Eroare la salvare: {e}")
    finally:
        db.close()
