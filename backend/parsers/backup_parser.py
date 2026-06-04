"""
Parser pentru fisierele backup_roundXX.txt generate de serverul CS2.
Format: Valve KeyValues (arbore de chei-valori cu acolade).
"""
from datetime import datetime
from typing import Any


def _tokenize(content: str) -> list[str]:
    tokens = []
    i = 0
    n = len(content)
    while i < n:
        c = content[i]
        if c == '"':
            j = i + 1
            while j < n:
                if content[j] == '\\':
                    j += 2
                    continue
                if content[j] == '"':
                    break
                j += 1
            tokens.append(content[i + 1:j])
            i = j + 1
        elif c in '{}':
            tokens.append(c)
            i += 1
        elif c == '/' and i + 1 < n and content[i + 1] == '/':
            while i < n and content[i] != '\n':
                i += 1
        else:
            i += 1
    return tokens


def _parse(tokens: list[str], pos: int) -> tuple[dict[str, Any], int]:
    result: dict[str, Any] = {}
    while pos < len(tokens):
        tok = tokens[pos]
        if tok == '}':
            return result, pos + 1
        key = tok
        pos += 1
        if pos >= len(tokens):
            break
        nxt = tokens[pos]
        if nxt == '{':
            value, pos = _parse(tokens, pos + 1)
        else:
            value = nxt
            pos += 1
        # Chei duplicate → lista (ex: "item" repetat)
        if key in result:
            existing = result[key]
            if isinstance(existing, list):
                existing.append(value)
            else:
                result[key] = [existing, value]
        else:
            result[key] = value
    return result, pos


def parse_backup_file(content: str) -> dict:
    tokens = _tokenize(content)
    if len(tokens) < 2 or tokens[1] != '{':
        raise ValueError("Format invalid: fisierul nu e KeyValues valid")
    root_key = tokens[0]
    data, _ = _parse(tokens, 2)
    return {root_key: data}


def extract_match_data(parsed: dict) -> dict:
    save = parsed.get("SaveFile", {})

    ts_str = save.get("timestamp", "")
    try:
        timestamp = datetime.strptime(ts_str, "%Y-%m-%d %H:%M:%S")
    except ValueError:
        timestamp = None

    first_half = save.get("FirstHalfScore", {})
    second_half = save.get("SecondHalfScore", {})
    fh_t1 = int(first_half.get("team1", 0))
    fh_t2 = int(first_half.get("team2", 0))
    sh_t1 = int(second_half.get("team1", 0))
    sh_t2 = int(second_half.get("team2", 0))

    # OvertimeScore poate aparea cand meciul merge in overtime
    ot_t1, ot_t2 = 0, 0
    overtime = save.get("OvertimeScore", {})
    if isinstance(overtime, dict):
        ot_t1 = int(overtime.get("team1", 0))
        ot_t2 = int(overtime.get("team2", 0))
    elif isinstance(overtime, list):
        # multiple overtime periods
        for ot in overtime:
            if isinstance(ot, dict):
                ot_t1 += int(ot.get("team1", 0))
                ot_t2 += int(ot.get("team2", 0))

    rounds_played = fh_t1 + fh_t2 + sh_t1 + sh_t2 + ot_t1 + ot_t2
    team1_score = fh_t1 + sh_t1 + ot_t1
    team2_score = fh_t2 + sh_t2 + ot_t2

    players = []
    for account_id, pdata in save.get("PlayersOnTeam1", {}).items():
        if isinstance(pdata, dict):
            players.append(_extract_player(account_id, pdata, team=1, rounds_played=rounds_played))
    for account_id, pdata in save.get("PlayersOnTeam2", {}).items():
        if isinstance(pdata, dict):
            players.append(_extract_player(account_id, pdata, team=2, rounds_played=rounds_played))

    return {
        "timestamp": timestamp,
        "map_name": save.get("map", "unknown"),
        "rounds_played": rounds_played,
        "team1_score": team1_score,
        "team2_score": team2_score,
        "first_half_team1": fh_t1,
        "first_half_team2": fh_t2,
        "second_half_team1": sh_t1,
        "second_half_team2": sh_t2,
        "players": players,
    }


def _extract_player(account_id: str, data: dict, team: int, rounds_played: int) -> dict:
    totals = data.get("MatchStats", {}).get("Totals", {})

    def i(key: str, src: dict = data) -> int:
        return int(src.get(key, 0) or 0)

    def it(key: str) -> int:
        return int(totals.get(key, 0) or 0)

    return {
        "steam_account_id": account_id,
        "steam_nickname": data.get("name", "Unknown"),
        "team": team,
        "rounds_played": rounds_played,
        "kills": i("kills"),
        "deaths": i("deaths"),
        "assists": i("assists"),
        "mvps": i("mvps"),
        "score": i("score"),
        "rounds_won": i("roundsWon"),
        "headshot_kills": i("enemyHSs"),
        "kills_2k": i("enemy2Ks"),
        "kills_3k": i("enemy3Ks"),
        "kills_4k": i("enemy4Ks"),
        "kills_5k": i("enemy5Ks"),
        "first_kills": i("firstKs"),
        "clutch_kills": i("clutchKs"),
        "kills_pistol": i("kills_weapon_pistol"),
        "kills_sniper": i("kills_weapon_sniper"),
        "kills_knife": i("kills_knife"),
        "kills_taser": i("kills_taser"),
        "damage": it("Damage"),
        "utility_damage": it("UtilityDamage"),
        "enemies_flashed": it("EnemiesFlashed"),
        "flash_count": it("FlashCount"),
        "clutch_1v1_count": it("1v1Count"),
        "clutch_1v1_wins": it("1v1Wins"),
        "clutch_1v2_count": it("1v2Count"),
        "clutch_1v2_wins": it("1v2Wins"),
        "entry_count": it("EntryCount"),
        "entry_wins": it("EntryWins"),
    }
