"""
Citire live a fisierelor backup_roundXX.txt de pe serverul CS2.

Logica detectie meci:
- backup_round00.txt este primul fisier creat la fiecare meci nou
- mtime-ul lui backup_round00.txt = ID-ul sesiunii curente
- Un fisier apartine meciului curent doar daca mtime-ul lui >= mtime round00
- Cand round00 primeste un mtime nou → meci nou a inceput
"""

import asyncio
import re
import time
from pathlib import Path
from typing import Any

_live_state: dict[str, Any] = {
    "is_live": False,
    "session_mtime": None,   # mtime al backup_round00.txt — se schimba la meci nou
    "map_name": None,
    "rounds_played": 0,
    "team1_score": 0,
    "team2_score": 0,
    "players": [],
    "latest_file": None,
    "last_file_mtime": None,
    "last_updated": None,
    "error": None,
}

_backup_dir: Path | None = None
_poll_interval: int = 10
_session_active: bool = False
_session_started_at: float | None = None


def configure(backup_dir: str, poll_interval: int = 10) -> None:
    global _backup_dir, _poll_interval
    _backup_dir = Path(backup_dir)
    _poll_interval = poll_interval


def get_state() -> dict:
    return dict(_live_state)


def is_configured() -> bool:
    return _backup_dir is not None and _backup_dir.exists()


def is_session_active() -> bool:
    return _session_active


def start_session() -> None:
    global _session_active, _session_started_at
    _session_active = True
    _session_started_at = time.time()
    print("[LiveWatcher] Sesiune PORNITA — stats se salveaza")


def end_session() -> None:
    global _session_active, _session_started_at
    _session_active = False
    _session_started_at = None
    print("[LiveWatcher] Sesiune OPRITA — stats nu se mai salveaza")


def get_session_info() -> dict:
    return {
        "active": _session_active,
        "started_at": _session_started_at,
    }


def _get_sorted_backup_files() -> list[tuple[int, Path]]:
    """Returneaza fisierele backup_roundXX.txt sortate dupa numarul rundei."""
    if not _backup_dir or not _backup_dir.exists():
        print(f"[LiveWatcher] ⚠ Director inexistent sau neconfigurat: {_backup_dir}")
        return []
    result = []
    for f in _backup_dir.glob("backup_round*.txt"):
        m = re.search(r"backup_round(\d+)\.txt", f.name, re.IGNORECASE)
        if m:
            result.append((int(m.group(1)), f))
    print(f"[LiveWatcher] 📂 Director: {_backup_dir} | Fisiere gasite: {len(result)}")
    if result:
        names = [f.name for _, f in sorted(result)]
        print(f"[LiveWatcher]    Fisiere: {names}")
    return sorted(result)


async def poll_once() -> None:
    global _live_state

    if not is_configured():
        return

    print(f"[LiveWatcher] ── poll_once ──────────────────────────────")
    files = _get_sorted_backup_files()
    if not files:
        _live_state["is_live"] = False
        print(f"[LiveWatcher] ✗ Niciun fisier backup_round*.txt gasit → is_live=False")
        return

    round00 = _backup_dir / "backup_round00.txt"
    if not round00.exists():
        _live_state["is_live"] = False
        print(f"[LiveWatcher] ✗ backup_round00.txt lipseste → is_live=False")
        return

    try:
        round00_mtime = round00.stat().st_mtime
        round00_time_str = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(round00_mtime))
        print(f"[LiveWatcher] 📄 backup_round00.txt | mtime: {round00_time_str} ({round00_mtime:.0f})")
    except OSError as e:
        print(f"[LiveWatcher] ✗ Eroare citire stat round00: {e}")
        return

    # Daca round00 a fost modificat → meci nou
    if round00_mtime != _live_state["session_mtime"]:
        _live_state["session_mtime"] = round00_mtime
        _live_state["latest_file"] = None
        _live_state["last_file_mtime"] = None
        print(f"[LiveWatcher] 🆕 MECI NOU detectat | session_mtime={round00_time_str}")

    # Gaseste fisierele care apartin meciului curent (mtime >= round00 - 5s toleranta)
    # Criteriu selectie: fiecare fisier e comparat cu mtime-ul lui round00 (sesiunea)
    print(f"[LiveWatcher] 🔍 Scanare fisiere (threshold mtime >= {round00_time_str} - 5s):")
    current_match_files = []
    for round_num, f in files:
        try:
            f_mtime = f.stat().st_mtime
            f_time_str = time.strftime("%H:%M:%S", time.localtime(f_mtime))
            diff = f_mtime - round00_mtime
            in_session = f_mtime >= round00_mtime - 5
            marker = "✓" if in_session else "✗"
            print(f"[LiveWatcher]   {marker} {f.name} | mtime: {f_time_str} | diff vs round00: {diff:+.1f}s")
            if in_session:
                current_match_files.append((round_num, f, f_mtime))
        except OSError:
            continue

    print(f"[LiveWatcher] 🎯 In sesiunea curenta: {len(current_match_files)} / {len(files)} fisiere")

    if not current_match_files:
        _live_state["is_live"] = False
        print(f"[LiveWatcher] ✗ Niciun fisier apartine meciului curent → is_live=False")
        return

    # Alegem fisierul cu cel mai mare numar de runda = ultima runda incheiata
    _, latest_file, latest_mtime = current_match_files[-1]
    latest_time_str = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(latest_mtime))
    print(f"[LiveWatcher] 👉 Ales: {latest_file.name} (runda max={current_match_files[-1][0]}) | mtime: {latest_time_str}")

    # Skip daca fisierul nu s-a schimbat de la ultima verificare
    if (str(latest_file) == _live_state["latest_file"] and
            _live_state["last_file_mtime"] is not None and
            abs(latest_mtime - _live_state["last_file_mtime"]) < 1):
        print(f"[LiveWatcher] ⏭ Fisier neschimbat, skip parse")
        return

    # Citeste si parseaza fisierul
    encoding_used = "utf-8"
    try:
        content = latest_file.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        encoding_used = "latin-1"
        content = latest_file.read_text(encoding="latin-1")
    except OSError as e:
        print(f"[LiveWatcher] ✗ Eroare citire fisier: {e}")
        return

    print(f"[LiveWatcher] 📝 Citit {len(content)} chars cu encoding={encoding_used}")

    try:
        from parsers.backup_parser import parse_backup_file, extract_match_data
        parsed = parse_backup_file(content)
        data = extract_match_data(parsed)
    except Exception as e:
        _live_state["error"] = str(e)
        print(f"[LiveWatcher] ✗ Eroare parsare: {e}")
        return

    players = data["players"]
    t1 = [p["steam_nickname"] for p in players if p["team"] == 1]
    t2 = [p["steam_nickname"] for p in players if p["team"] == 2]
    print(f"[LiveWatcher] ✅ Parsed OK | Harta: {data['map_name']} | Scor: {data['team1_score']}-{data['team2_score']} | Runda: {data['rounds_played']}")
    print(f"[LiveWatcher]    Echipa 1 ({len(t1)}): {t1}")
    print(f"[LiveWatcher]    Echipa 2 ({len(t2)}): {t2}")

    _live_state.update({
        "is_live": True,
        "map_name": data["map_name"],
        "rounds_played": data["rounds_played"],
        "team1_score": data["team1_score"],
        "team2_score": data["team2_score"],
        "players": players,
        "latest_file": str(latest_file),
        "last_file_mtime": latest_mtime,
        "last_updated": time.time(),
        "error": None,
    })
    print(f"[LiveWatcher] 💾 State actualizat → is_live=True")

    if _session_active:
        from services.match_saver import upsert_live_match
        await upsert_live_match(str(_live_state["session_mtime"]), data)
    else:
        print(f"[LiveWatcher] Sesiune inactiva — stats ignorate ({latest_file.name})")


async def start_watcher() -> None:
    """Task background — ruleaza la infinit, polleaza directorul la fiecare N secunde."""
    print(f"[LiveWatcher] Pornit. Director: {_backup_dir} | Interval: {_poll_interval}s")
    while True:
        try:
            await poll_once()
        except Exception as e:
            _live_state["error"] = str(e)
            print(f"[LiveWatcher] Eroare: {e}")
        await asyncio.sleep(_poll_interval)
