import asyncio
import os
import time
from fastapi import APIRouter, Request, HTTPException
from services import live_watcher

router = APIRouter(prefix="/api/gsi", tags=["gsi"])

GSI_TOKEN = os.getenv("GSI_TOKEN", "")

_hs_accum: dict[str, int] = {}
_dmg_accum: dict[str, int] = {}
_last_round_processed: int = -1
_current_map: str = ""
_match_session_id: str = ""
_gameover_saved: bool = False


def _reset_accum() -> None:
    global _hs_accum, _dmg_accum, _last_round_processed, _match_session_id, _gameover_saved
    _hs_accum = {}
    _dmg_accum = {}
    _last_round_processed = -1
    _match_session_id = f"gsi_{int(time.time())}"
    _gameover_saved = False


def _build_match_data(map_name: str, round_num: int, team_ct_score: int, team_t_score: int, allplayers: dict) -> dict:
    # rounds_played = suma scorurilor (fiecare runda e castigata de exact o echipa)
    # Nu folosim round_num din webhook — acela include warmup si se poate acumula gresit
    rounds_played = team_ct_score + team_t_score

    players = []
    for steamid, pdata in allplayers.items():
        team_str = pdata.get("team", "CT")
        stats = pdata.get("match_stats", {})
        players.append({
            "steam_account_id": steamid,
            "steam_nickname":   pdata.get("name", "Unknown"),
            "team":             1 if team_str == "CT" else 2,
            "kills":            int(stats.get("kills",   0)),
            "deaths":           int(stats.get("deaths",  0)),
            "assists":          int(stats.get("assists", 0)),
            "headshot_kills":   _hs_accum.get(steamid,  0),
            "damage":           _dmg_accum.get(steamid, 0),
            "mvps":             int(stats.get("mvps",   0)),
            "score":            int(stats.get("score",  0)),
            "rounds_won":       team_ct_score if team_str == "CT" else team_t_score,
            # Campuri nedisponibile prin GSI — zero
            "kills_2k": 0, "kills_3k": 0, "kills_4k": 0, "kills_5k": 0,
            "first_kills": 0, "clutch_kills": 0,
            "kills_pistol": 0, "kills_sniper": 0, "kills_knife": 0, "kills_taser": 0,
            "utility_damage": 0, "enemies_flashed": 0, "flash_count": 0,
            "clutch_1v1_count": 0, "clutch_1v1_wins": 0,
            "clutch_1v2_count": 0, "clutch_1v2_wins": 0,
            "entry_count": 0, "entry_wins": 0,
        })
    return {
        "map_name":          map_name,
        "rounds_played":     rounds_played,
        "team1_score":       team_ct_score,
        "team2_score":       team_t_score,
        "first_half_team1":  0,
        "first_half_team2":  0,
        "second_half_team1": 0,
        "second_half_team2": 0,
        "players":           players,
    }


@router.post("")
async def receive_gsi(request: Request):
    global _current_map, _last_round_processed, _gameover_saved

    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="JSON invalid")

    token = data.get("auth", {}).get("token", "")
    if GSI_TOKEN and token != GSI_TOKEN:
        print(f"[GSI] ⚠ Token invalid: '{token[:12]}...'")
        raise HTTPException(status_code=403, detail="Token invalid")

    map_data      = data.get("map", {})
    round_data    = data.get("round", {})
    allplayers    = data.get("allplayers", {})
    map_name      = map_data.get("name", "unknown")
    map_phase     = map_data.get("phase", "")
    round_phase   = round_data.get("phase", "")
    round_num     = int(map_data.get("round", 0))
    team_ct_score = int(map_data.get("team_ct", {}).get("score", 0))
    team_t_score  = int(map_data.get("team_t",  {}).get("score", 0))

    # Sesiune inactiva → ignora
    if not live_watcher.is_session_active():
        live_watcher._live_state["is_live"] = False
        print(f"[GSI] ⏸ Sesiune inactiva — date ignorate")
        return {"status": "ok"}

    # Harta noua → reset acumulatori si session_id nou
    if map_name != _current_map:
        print(f"[GSI] 🆕 Harta noua: {map_name} (era: {_current_map}) — reset stats")
        _current_map = map_name
        _reset_accum()

    # Warmup / intermission → nu e meci live
    if map_phase not in ("live", "gameover") or not allplayers:
        live_watcher._live_state["is_live"] = False
        print(f"[GSI] 💓 Heartbeat | map_phase={map_phase} | round_phase={round_phase}")
        return {"status": "ok"}

    # GAMEOVER → salvare finala in DB, o singura data
    if map_phase == "gameover":
        live_watcher._live_state["is_live"] = False
        if not _gameover_saved:
            _gameover_saved = True
            from services.match_saver import upsert_live_match
            match_data = _build_match_data(map_name, round_num, team_ct_score, team_t_score, allplayers)
            asyncio.create_task(upsert_live_match(_match_session_id, match_data, is_gameover=True))
            print(f"[GSI] 🏁 GAMEOVER | {map_name} | CT {team_ct_score} - T {team_t_score} | Salvare finala + procesare pariuri")
        return {"status": "ok"}

    # Runda incheiata → acumuleaza HS + damage si salveaza in DB
    if round_phase == "over" and round_num > _last_round_processed:
        _last_round_processed = round_num
        for steamid, pdata in allplayers.items():
            state = pdata.get("state", {})
            _hs_accum[steamid]  = _hs_accum.get(steamid, 0)  + int(state.get("round_killhs",   0))
            _dmg_accum[steamid] = _dmg_accum.get(steamid, 0) + int(state.get("round_totaldmg", 0))

        from services.match_saver import upsert_live_match
        match_data = _build_match_data(map_name, round_num, team_ct_score, team_t_score, allplayers)
        asyncio.create_task(upsert_live_match(_match_session_id, match_data))
        print(f"[GSI] 💾 R{round_num} terminata — salvare DB | CT {team_ct_score}-{team_t_score}")

    # Actualizeaza live view
    players = []
    for steamid, pdata in allplayers.items():
        team_str = pdata.get("team", "CT")
        stats    = pdata.get("match_stats", {})
        players.append({
            "steam_account_id": steamid,
            "steam_nickname":   pdata.get("name", "Unknown"),
            "team":             1 if team_str == "CT" else 2,
            "kills":            int(stats.get("kills",   0)),
            "deaths":           int(stats.get("deaths",  0)),
            "assists":          int(stats.get("assists", 0)),
            "mvps":             int(stats.get("mvps",    0)),
            "headshot_kills":   _hs_accum.get(steamid,  0),
            "damage":           _dmg_accum.get(steamid, 0),
            "rounds_played":    round_num,
        })

    live_watcher._live_state.update({
        "is_live":       True,
        "map_name":      map_name,
        "rounds_played": round_num,
        "team1_score":   team_ct_score,
        "team2_score":   team_t_score,
        "players":       players,
        "last_updated":  time.time(),
        "error":         None,
    })

    t1 = [p["steam_nickname"] for p in players if p["team"] == 1]
    t2 = [p["steam_nickname"] for p in players if p["team"] == 2]
    print(f"[GSI] ✅ {map_name} | CT {team_ct_score}-{team_t_score} | R{round_num} | {round_phase}")
    print(f"[GSI]    CT ({len(t1)}): {t1}")
    print(f"[GSI]    T  ({len(t2)}): {t2}")

    return {"status": "ok"}
