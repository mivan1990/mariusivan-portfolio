from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel
from jose import JWTError, jwt
import bcrypt
import json
import os
import shutil

from database import get_db, DB_PATH, engine
from models import Player, Match, PlayerMatchStat, AdminUser, ScheduledMatch, Bet, User, ActivityLog, Team, Setting, PlayerBet
from services.logger import log_action
from services.bet_processor import calculate_user_points
from parsers.backup_parser import parse_backup_file, extract_match_data
from services.steam import fetch_avatar_url, account_id_to_steam64

router = APIRouter(prefix="/api/admin", tags=["admin"])

MATCH_BACKUP_DIR = os.path.join(os.path.dirname(__file__), "..", "match_backups")


def _save_match_backup(match_id: int, match_data: dict, source: str = "upload") -> str:
    os.makedirs(MATCH_BACKUP_DIR, exist_ok=True)
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"match_{match_id}_{ts}_{source}.json"
    path = os.path.join(MATCH_BACKUP_DIR, filename)
    payload = {"saved_at": datetime.utcnow().isoformat(), "match_id": match_id, "source": source, **match_data}
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2, default=str)
    return filename


JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-this-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24

security = HTTPBearer()


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


# --- Pydantic schemas ---

class LoginRequest(BaseModel):
    username: str
    password: str


class PlayerCreate(BaseModel):
    steam_nickname: str
    steam_account_id: str | None = None
    real_name: str | None = None
    team_name: str | None = None


class PlayerUpdate(BaseModel):
    steam_nickname: str | None = None
    real_name: str | None = None
    team_name: str | None = None
    aliases: str | None = None  # nicknames separate prin virgula


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


# --- Auth helpers ---

def _create_token(username: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS)
    return jwt.encode({"sub": username, "exp": expire}, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> AdminUser:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        username = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Token invalid")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalid sau expirat")
    user = db.query(AdminUser).filter(AdminUser.username == username).first()
    if not user:
        raise HTTPException(status_code=401, detail="User inexistent")
    return user


# --- Auth routes ---

def _create_user_token(email: str) -> str:
    from datetime import timedelta
    expire = datetime.utcnow() + timedelta(days=30)
    return jwt.encode({"sub": email, "type": "user", "exp": expire}, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _ensure_admin_user(db: Session, username: str) -> User:
    email = f"{username}@admin.local"
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, password_hash="", display_name=f"{username} (admin)", points=0)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


@router.post("/login")
def login(data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    admin = db.query(AdminUser).filter(AdminUser.username == data.username).first()
    if not admin or not _verify_password(data.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Username sau parola incorecta")
    log_action(db, "admin_login", f"Admin '{data.username}' s-a autentificat", ip=request.client.host if request.client else None)
    user = _ensure_admin_user(db, data.username)
    return {
        "access_token": _create_token(admin.username),
        "user_token": _create_user_token(user.email),
        "token_type": "bearer",
    }


@router.get("/me")
def get_me(current_user: AdminUser = Depends(_verify_token)):
    return {"username": current_user.username, "id": current_user.id}


@router.put("/password")
def change_password(
    data: PasswordChange,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(_verify_token),
):
    if not _verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Parola curenta este incorecta")
    current_user.password_hash = _hash_password(data.new_password)
    db.commit()
    return {"message": "Parola a fost schimbata cu succes"}


# --- Player management ---

@router.get("/players")
def list_players(db: Session = Depends(get_db), _=Depends(_verify_token)):
    players = db.query(Player).order_by(Player.created_at.desc()).all()
    return [
        {
            "id": p.id,
            "steam_account_id": p.steam_account_id,
            "steam_id64": p.steam_id64,
            "steam_nickname": p.steam_nickname,
            "real_name": p.real_name,
            "team_name": p.team_name,
            "avatar_url": p.avatar_url,
            "aliases": p.aliases or "",
            "matches_played": len(p.match_stats),
        }
        for p in players
    ]


@router.post("/players", status_code=201)
async def create_player(
    data: PlayerCreate,
    db: Session = Depends(get_db),
    _=Depends(_verify_token),
):
    if not data.steam_nickname.strip():
        raise HTTPException(status_code=400, detail="Nickname-ul este obligatoriu")

    existing_nick = db.query(Player).filter(Player.steam_nickname == data.steam_nickname.strip()).first()
    if existing_nick:
        raise HTTPException(status_code=400, detail="Exista deja un jucator cu acest nickname")

    import uuid as _uuid
    account_id = data.steam_account_id.strip() if data.steam_account_id else f"manual_{_uuid.uuid4().hex[:12]}"

    if data.steam_account_id:
        existing_id = db.query(Player).filter(Player.steam_account_id == account_id).first()
        if existing_id:
            raise HTTPException(status_code=400, detail="Exista deja un jucator cu acest Steam ID")

    steam_id64 = None
    avatar_url = None
    if data.steam_account_id and account_id.isdigit():
        steam_id64 = account_id_to_steam64(account_id)
        avatar_url = await fetch_avatar_url(account_id)

    player = Player(
        steam_account_id=account_id,
        steam_id64=steam_id64,
        steam_nickname=data.steam_nickname.strip(),
        real_name=data.real_name,
        team_name=data.team_name,
        avatar_url=avatar_url,
    )
    db.add(player)
    db.commit()
    db.refresh(player)
    return {
        "id": player.id,
        "steam_account_id": player.steam_account_id,
        "steam_id64": player.steam_id64,
        "steam_nickname": player.steam_nickname,
        "real_name": player.real_name,
        "team_name": player.team_name,
        "avatar_url": player.avatar_url,
        "aliases": player.aliases or "",
        "matches_played": 0,
    }


@router.put("/players/{player_id}")
def update_player(
    player_id: int,
    data: PlayerUpdate,
    db: Session = Depends(get_db),
    _=Depends(_verify_token),
):
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Jucatorul nu a fost gasit")

    if data.steam_nickname is not None:
        player.steam_nickname = data.steam_nickname
    if data.real_name is not None:
        player.real_name = data.real_name
    if data.team_name is not None:
        player.team_name = data.team_name
    if data.aliases is not None:
        player.aliases = data.aliases.strip() or None

    player.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(player)
    return {
        "id": player.id,
        "steam_nickname": player.steam_nickname,
        "real_name": player.real_name,
        "team_name": player.team_name,
        "avatar_url": player.avatar_url,
    }


@router.delete("/players/{player_id}")
def delete_player(
    player_id: int,
    db: Session = Depends(get_db),
    _=Depends(_verify_token),
):
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Jucatorul nu a fost gasit")
    db.delete(player)
    db.commit()
    return {"message": f"Jucatorul '{player.steam_nickname}' a fost sters"}


# --- Match management ---

@router.post("/upload")
async def upload_match(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(_verify_token),
):
    if not file.filename or not file.filename.endswith(".txt"):
        raise HTTPException(status_code=400, detail="Fisierul trebuie sa fie .txt (backup_roundXX.txt)")

    content = await file.read()
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    try:
        parsed = parse_backup_file(text)
        match_data = extract_match_data(parsed)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Eroare la parsarea fisierului: {str(e)}")

    if match_data["rounds_played"] == 0:
        raise HTTPException(status_code=400, detail="Fisierul nu contine runde jucate")

    match = Match(
        timestamp=match_data["timestamp"],
        map_name=match_data["map_name"],
        rounds_played=match_data["rounds_played"],
        team1_score=match_data["team1_score"],
        team2_score=match_data["team2_score"],
        first_half_team1=match_data["first_half_team1"],
        first_half_team2=match_data["first_half_team2"],
        second_half_team1=match_data["second_half_team1"],
        second_half_team2=match_data["second_half_team2"],
        file_name=file.filename,
    )
    db.add(match)
    db.flush()

    new_players: list[str] = []
    updated_players: list[str] = []

    # construieste index nume->jucator o singura data (alias, real_name, steam_nickname)
    name_index: dict[str, Player] = {}
    for candidate in db.query(Player).all():
        for raw in [
            *(candidate.aliases or "").split(","),
            candidate.real_name or "",
            candidate.steam_nickname or "",
        ]:
            key = raw.strip().lower()
            if key:
                name_index[key] = candidate

    for pdata in match_data["players"]:
        account_id = pdata["steam_account_id"]
        nick = pdata["steam_nickname"]
        team = pdata["team"]
        won = (
            (team == 1 and match_data["team1_score"] > match_data["team2_score"])
            or (team == 2 and match_data["team2_score"] > match_data["team1_score"])
        )

        # matching exclusiv dupa nume (alias > real_name > steam_nickname)
        player = name_index.get(nick.strip().lower())

        if not player:
            avatar_url = await fetch_avatar_url(account_id)
            player = Player(
                steam_account_id=account_id,
                steam_id64=account_id_to_steam64(account_id),
                steam_nickname=nick,
                avatar_url=avatar_url,
            )
            db.add(player)
            db.flush()
            # adauga noul jucator in index ca sa nu fie duplicat daca apare de doua ori
            name_index[nick.strip().lower()] = player
            new_players.append(nick)
        else:
            player.steam_nickname = nick
            updated_players.append(nick)

        stat = PlayerMatchStat(
            player_id=player.id,
            match_id=match.id,
            team=team,
            won=won,
            rounds_played=match_data["rounds_played"],
            kills=pdata["kills"],
            deaths=pdata["deaths"],
            assists=pdata["assists"],
            headshot_kills=pdata["headshot_kills"],
            damage=pdata["damage"],
            mvps=pdata["mvps"],
            score=pdata["score"],
            rounds_won=pdata["rounds_won"],
            kills_2k=pdata["kills_2k"],
            kills_3k=pdata["kills_3k"],
            kills_4k=pdata["kills_4k"],
            kills_5k=pdata["kills_5k"],
            first_kills=pdata["first_kills"],
            clutch_kills=pdata["clutch_kills"],
            kills_pistol=pdata["kills_pistol"],
            kills_sniper=pdata["kills_sniper"],
            kills_knife=pdata["kills_knife"],
            kills_taser=pdata["kills_taser"],
            utility_damage=pdata["utility_damage"],
            enemies_flashed=pdata["enemies_flashed"],
            flash_count=pdata["flash_count"],
            clutch_1v1_count=pdata["clutch_1v1_count"],
            clutch_1v1_wins=pdata["clutch_1v1_wins"],
            clutch_1v2_count=pdata["clutch_1v2_count"],
            clutch_1v2_wins=pdata["clutch_1v2_wins"],
            entry_count=pdata["entry_count"],
            entry_wins=pdata["entry_wins"],
        )
        db.add(stat)

    db.commit()

    from services.bet_processor import try_auto_link as _svc_auto_link
    auto_linked = _svc_auto_link(db, match, match_data) is not None

    _save_match_backup(match.id, match_data, source="upload")

    log_action(
        db, "match_uploaded",
        f"Admin '{current_admin.username}' a incarcat {file.filename} ({match.map_name} {match.team1_score}-{match.team2_score})",
        ip=request.client.host if request.client else None,
    )

    return {
        "message": "Meciul a fost importat cu succes!",
        "match_id": match.id,
        "map": match.map_name,
        "score": f"Team1 {match.team1_score} - {match.team2_score} Team2",
        "rounds_played": match.rounds_played,
        "new_players_added": new_players,
        "existing_players_updated": updated_players,
        "auto_linked": auto_linked,
        "tip": "Jucatorii noi nu au Nume Real si Echipa. Mergi la Jucatori pentru a completa datele.",
    }


@router.get("/matches")
def list_matches_admin(db: Session = Depends(get_db), _=Depends(_verify_token)):
    matches = db.query(Match).order_by(Match.created_at.desc()).all()
    return [
        {
            "id": m.id,
            "timestamp": m.timestamp.isoformat() if m.timestamp else None,
            "map_name": m.map_name,
            "rounds_played": m.rounds_played,
            "team1_score": m.team1_score,
            "team2_score": m.team2_score,
            "file_name": m.file_name,
            "players_count": len(m.player_stats),
            "created_at": m.created_at.isoformat(),
        }
        for m in matches
    ]


@router.delete("/matches/{match_id}")
def delete_match(
    match_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(_verify_token),
):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Meciul nu a fost gasit")
    map_name = match.map_name
    db.delete(match)
    db.commit()
    log_action(db, "match_deleted", f"Admin '{current_admin.username}' a sters meciul #{match_id} ({map_name})", ip=request.client.host if request.client else None)
    return {"message": f"Meciul #{match_id} ({map_name}) a fost sters"}


# --- Scheduled matches ---

class ScheduledMatchCreate(BaseModel):
    team_a: str
    team_b: str
    scheduled_at: Optional[datetime] = None
    bracket_round: Optional[int] = None
    bracket_position: Optional[int] = None


class ScheduledMatchUpdate(BaseModel):
    team_a: Optional[str] = None
    team_b: Optional[str] = None
    scheduled_at: Optional[datetime] = None


def _fmt_scheduled(sm: ScheduledMatch) -> dict:
    return {
        "id": sm.id,
        "team_a": sm.team_a,
        "team_b": sm.team_b,
        "scheduled_at": sm.scheduled_at.isoformat() if sm.scheduled_at else None,
        "match_id": sm.match_id,
        "winner": sm.winner,
        "bets_processed": sm.bets_processed,
        "created_at": sm.created_at.isoformat(),
        "bracket_round": sm.bracket_round,
        "bracket_position": sm.bracket_position,
    }


@router.get("/teams")
def list_teams(db: Session = Depends(get_db), _=Depends(_verify_token)):
    from_table = {t.name for t in db.query(Team).all()}
    from_players = {r.team_name for r in db.query(Player.team_name).filter(Player.team_name.isnot(None)).distinct().all() if r.team_name}
    return sorted(from_table | from_players)


class TeamCreate(BaseModel):
    name: str


@router.post("/teams", status_code=201)
def create_team(data: TeamCreate, db: Session = Depends(get_db), _=Depends(_verify_token)):
    name = data.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Numele echipei este obligatoriu")
    if db.query(Team).filter(Team.name == name).first():
        raise HTTPException(status_code=400, detail="Echipa exista deja")
    team = Team(name=name)
    db.add(team)
    db.commit()
    return {"name": team.name}


@router.delete("/teams/{name}")
def delete_team(name: str, db: Session = Depends(get_db), _=Depends(_verify_token)):
    team = db.query(Team).filter(Team.name == name).first()
    if not team:
        raise HTTPException(status_code=404, detail="Echipa nu exista in tabel")
    db.delete(team)
    db.commit()
    return {"message": f"Echipa '{name}' stearsa"}


@router.get("/scheduled")
def list_scheduled_admin(db: Session = Depends(get_db), _=Depends(_verify_token)):
    items = db.query(ScheduledMatch).order_by(ScheduledMatch.created_at.desc()).all()
    return [_fmt_scheduled(sm) for sm in items]


@router.post("/scheduled", status_code=201)
def create_scheduled(
    data: ScheduledMatchCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(_verify_token),
):
    sm = ScheduledMatch(
        team_a=data.team_a,
        team_b=data.team_b,
        scheduled_at=data.scheduled_at,
        bracket_round=data.bracket_round,
        bracket_position=data.bracket_position,
    )
    db.add(sm)
    db.commit()
    db.refresh(sm)
    log_action(db, "scheduled_created", f"Admin '{current_admin.username}' a programat {data.team_a} vs {data.team_b} la {data.scheduled_at}", ip=request.client.host if request.client else None)
    return _fmt_scheduled(sm)


@router.put("/scheduled/{sm_id}")
def update_scheduled(
    sm_id: int,
    data: ScheduledMatchUpdate,
    db: Session = Depends(get_db),
    _=Depends(_verify_token),
):
    sm = db.query(ScheduledMatch).filter(ScheduledMatch.id == sm_id).first()
    if not sm:
        raise HTTPException(status_code=404, detail="Meciul programat nu a fost gasit")
    if data.team_a is not None:
        sm.team_a = data.team_a
    if data.team_b is not None:
        sm.team_b = data.team_b
    if data.scheduled_at is not None:
        sm.scheduled_at = data.scheduled_at
    db.commit()
    db.refresh(sm)
    return _fmt_scheduled(sm)


@router.delete("/scheduled/{sm_id}")
def delete_scheduled(
    sm_id: int,
    db: Session = Depends(get_db),
    _=Depends(_verify_token),
):
    sm = db.query(ScheduledMatch).filter(ScheduledMatch.id == sm_id).first()
    if not sm:
        raise HTTPException(status_code=404, detail="Meciul programat nu a fost gasit")
    db.delete(sm)
    db.commit()
    return {"message": "Meciul programat a fost sters"}


@router.put("/scheduled/{sm_id}/link/{match_id}")
def link_scheduled(
    sm_id: int,
    match_id: int,
    db: Session = Depends(get_db),
    _=Depends(_verify_token),
):
    sm = db.query(ScheduledMatch).filter(ScheduledMatch.id == sm_id).first()
    if not sm:
        raise HTTPException(status_code=404, detail="Meciul programat nu a fost gasit")
    if not db.query(Match).filter(Match.id == match_id).first():
        raise HTTPException(status_code=404, detail="Meciul jucat nu a fost gasit")
    sm.match_id = match_id
    db.commit()
    return _fmt_scheduled(sm)


@router.put("/scheduled/{sm_id}/champion")
def set_champion(
    sm_id: int,
    body: dict,
    db: Session = Depends(get_db),
    _=Depends(_verify_token),
):
    champion = body.get("champion")
    if champion not in ("team_a", "team_b"):
        raise HTTPException(status_code=400, detail="Champion must be 'team_a' or 'team_b'")
    sm = db.query(ScheduledMatch).filter(ScheduledMatch.id == sm_id).first()
    if not sm:
        raise HTTPException(status_code=404, detail="Meciul programat nu a fost gasit")
    sm.winner = champion
    db.commit()
    db.refresh(sm)
    return _fmt_scheduled(sm)


class ResultRequest(BaseModel):
    winner: str                      # 'team_a' sau 'team_b'
    top_fragger_id: int | None = None  # optional: override auto-detectie


@router.post("/scheduled/{sm_id}/result")
def set_result(
    sm_id: int,
    data: ResultRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(_verify_token),
):
    from models import PlayerBet, PlayerMatchStat

    if data.winner not in ("team_a", "team_b"):
        raise HTTPException(status_code=400, detail="winner trebuie sa fie 'team_a' sau 'team_b'")

    sm = db.query(ScheduledMatch).filter(ScheduledMatch.id == sm_id).first()
    if not sm:
        raise HTTPException(status_code=404, detail="Meciul programat nu a fost gasit")
    if sm.bets_processed:
        raise HTTPException(status_code=400, detail="Rezultatul a fost deja procesat")

    sm.winner = data.winner
    sm.bets_processed = True

    # ── Procesare pariuri echipa ──────────────────────────
    bets = db.query(Bet).filter(Bet.scheduled_match_id == sm_id).all()
    for bet in bets:
        pts = 3 if bet.predicted_winner == data.winner else 0
        bet.points_earned = pts
        user = db.query(User).filter(User.id == bet.user_id).first()
        if user:
            user.points += pts

    # ── Procesare pariuri top fragger ────────────────────
    # Auto-detectie: cel mai multe kills din meciul linkat
    top_fragger_id = data.top_fragger_id
    if top_fragger_id is None and sm.match_id:
        top_stat = (
            db.query(PlayerMatchStat)
            .filter(PlayerMatchStat.match_id == sm.match_id)
            .order_by(PlayerMatchStat.kills.desc())
            .first()
        )
        if top_stat:
            top_fragger_id = top_stat.player_id

    player_bets = db.query(PlayerBet).filter(PlayerBet.scheduled_match_id == sm_id).all()
    player_bets_processed = 0
    for pb in player_bets:
        if top_fragger_id is not None:
            pts = 3 if pb.predicted_player_id == top_fragger_id else 0
            pb.points_earned = pts
            user = db.query(User).filter(User.id == pb.user_id).first()
            if user:
                user.points += pts
            player_bets_processed += 1

    db.commit()

    # ── Auto-advance bracket ──────────────────────────────
    if sm.bracket_round is not None and sm.bracket_position is not None:
        sibling_pos = sm.bracket_position ^ 1
        sibling = db.query(ScheduledMatch).filter(
            ScheduledMatch.bracket_round == sm.bracket_round,
            ScheduledMatch.bracket_position == sibling_pos,
        ).first()
        if sibling and sibling.winner:
            next_round = sm.bracket_round + 1
            next_pos = sm.bracket_position >> 1
            existing_next = db.query(ScheduledMatch).filter(
                ScheduledMatch.bracket_round == next_round,
                ScheduledMatch.bracket_position == next_pos,
            ).first()
            lower = sm if sm.bracket_position < sibling.bracket_position else sibling
            higher = sibling if sm.bracket_position < sibling.bracket_position else sm
            team_a = lower.team_a if lower.winner == 'team_a' else lower.team_b
            team_b = higher.team_a if higher.winner == 'team_a' else higher.team_b
            if not existing_next:
                new_sm = ScheduledMatch(
                    team_a=team_a,
                    team_b=team_b,
                    bracket_round=next_round,
                    bracket_position=next_pos,
                )
                db.add(new_sm)
                db.commit()
            elif not existing_next.winner:
                existing_next.team_a = team_a
                existing_next.team_b = team_b
                db.commit()

    log_action(
        db, "result_set",
        f"Admin '{current_admin.username}' a setat rezultat '{data.winner}' pe {sm.team_a} vs {sm.team_b} "
        f"({len(bets)} pariuri echipa, {player_bets_processed} pariuri top fragger, fragger_id={top_fragger_id})",
        ip=request.client.host if request.client else None,
    )
    return {
        "message": f"Rezultat setat: {data.winner}. {len(bets)} pariuri echipa + {player_bets_processed} pariuri top fragger procesate.",
        "winner": data.winner,
        "top_fragger_id": top_fragger_id,
        "team_bets_processed": len(bets),
        "player_bets_processed": player_bets_processed,
    }


@router.delete("/scheduled/{sm_id}/link")
def unlink_scheduled(
    sm_id: int,
    db: Session = Depends(get_db),
    _=Depends(_verify_token),
):
    sm = db.query(ScheduledMatch).filter(ScheduledMatch.id == sm_id).first()
    if not sm:
        raise HTTPException(status_code=404, detail="Meciul programat nu a fost gasit")
    sm.match_id = None
    db.commit()
    return _fmt_scheduled(sm)


# --- User management ---

@router.get("/users")
def list_users(db: Session = Depends(get_db), _=Depends(_verify_token)):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "display_name": u.display_name,
            "points": u.points,
            "is_admin": u.is_admin,
            "created_at": u.created_at.isoformat(),
        }
        for u in users
    ]


class SetUserPasswordRequest(BaseModel):
    password: str


@router.put("/users/{user_id}/password")
def set_user_password(
    user_id: int,
    data: SetUserPasswordRequest,
    db: Session = Depends(get_db),
    _=Depends(_verify_token),
):
    if len(data.password) < 4:
        raise HTTPException(status_code=400, detail="Parola trebuie sa aiba cel putin 4 caractere")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Userul nu a fost gasit")
    user.password_hash = _hash_password(data.password)
    db.commit()
    return {"ok": True}


@router.post("/users/{user_id}/toggle-admin")
def toggle_admin(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(_verify_token),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Userul nu a fost gasit")
    user.is_admin = not user.is_admin
    if user.is_admin:
        if not db.query(AdminUser).filter(AdminUser.username == user.email).first():
            db.add(AdminUser(username=user.email, password_hash=""))
    else:
        db.query(AdminUser).filter(AdminUser.username == user.email).delete()
    db.commit()
    log_action(db, "toggle_admin", f"Admin '{current_admin.username}' a {'promovat' if user.is_admin else 'revocat'} adminul pentru {user.email}")
    return {"id": user.id, "email": user.email, "is_admin": user.is_admin}


# --- Session control ---

@router.get("/session")
def get_session(_=Depends(_verify_token)):
    from services.live_watcher import get_session_info
    info = get_session_info()
    return {
        "active": info["active"],
        "started_at": info["started_at"],
    }


@router.post("/session/start")
def session_start(db: Session = Depends(get_db), current_admin: AdminUser = Depends(_verify_token)):
    from services.live_watcher import start_session, get_session_info
    start_session()
    log_action(db, "session_start", f"Admin '{current_admin.username}' a pornit sesiunea de stats")
    return get_session_info()


@router.post("/session/end")
def session_end(db: Session = Depends(get_db), current_admin: AdminUser = Depends(_verify_token)):
    from services.live_watcher import end_session, get_session_info
    end_session()
    log_action(db, "session_end", f"Admin '{current_admin.username}' a oprit sesiunea de stats")
    return get_session_info()


# --- Activity logs ---

@router.get("/logs")
def get_logs(
    action: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_db),
    _=Depends(_verify_token),
):
    query = db.query(ActivityLog)
    if action:
        query = query.filter(ActivityLog.action == action)
    total = query.count()
    logs = query.order_by(ActivityLog.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "logs": [
            {
                "id": log.id,
                "action": log.action,
                "detail": log.detail,
                "user_id": log.user_id,
                "ip_address": log.ip_address,
                "created_at": log.created_at.isoformat(),
            }
            for log in logs
        ],
    }


# --- Match backups ---

@router.get("/backups")
def list_backups(_=Depends(_verify_token)):
    os.makedirs(MATCH_BACKUP_DIR, exist_ok=True)
    files = sorted(
        [f for f in os.listdir(MATCH_BACKUP_DIR) if f.endswith(".json")],
        reverse=True,
    )
    result = []
    for fname in files:
        path = os.path.join(MATCH_BACKUP_DIR, fname)
        stat = os.stat(path)
        result.append({
            "filename": fname,
            "size_kb": round(stat.st_size / 1024, 1),
            "created_at": datetime.utcfromtimestamp(stat.st_mtime).isoformat(),
        })
    return result


@router.get("/backups/{filename}")
def download_backup(filename: str, _=Depends(_verify_token)):
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Nume fisier invalid")
    path = os.path.join(MATCH_BACKUP_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Backup negasit")
    return FileResponse(path, media_type="application/json", filename=filename)


@router.post("/backups/{filename}/reimport")
def reimport_backup(filename: str, db: Session = Depends(get_db), _=Depends(_verify_token)):
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Nume fisier invalid")
    path = os.path.join(MATCH_BACKUP_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Backup negasit")

    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    match_id     = data.get("match_id")
    team1_score  = data.get("team1_score", 0)
    team2_score  = data.get("team2_score", 0)
    rounds_played = team1_score + team2_score

    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail=f"Meciul #{match_id} nu exista in DB")

    match.team1_score   = team1_score
    match.team2_score   = team2_score
    match.rounds_played = rounds_played

    updated, skipped = [], []
    for pdata in data.get("players", []):
        account_id = pdata.get("steam_account_id")
        player = db.query(Player).filter(Player.steam_account_id == account_id).first()
        if not player:
            skipped.append(pdata.get("steam_nickname", account_id))
            continue

        if (pdata.get("kills", 0) == 0 and pdata.get("deaths", 0) == 0
                and pdata.get("score", 0) == 0):
            skipped.append(pdata.get("steam_nickname", account_id) + " (spectator)")
            continue

        stat = db.query(PlayerMatchStat).filter(
            PlayerMatchStat.match_id == match_id,
            PlayerMatchStat.player_id == player.id,
        ).first()
        if not stat:
            skipped.append(pdata.get("steam_nickname", account_id))
            continue

        team                = pdata.get("team", stat.team)
        stat.team           = team
        stat.kills          = pdata.get("kills", 0)
        stat.deaths         = pdata.get("deaths", 0)
        stat.assists        = pdata.get("assists", 0)
        stat.headshot_kills = pdata.get("headshot_kills", 0)
        stat.damage         = pdata.get("damage", 0)
        stat.mvps           = pdata.get("mvps", 0)
        stat.score          = pdata.get("score", 0)
        stat.rounds_played  = rounds_played
        stat.rounds_won     = team1_score if team == 1 else team2_score
        stat.won            = (team == 1 and team1_score > team2_score) or \
                              (team == 2 and team2_score > team1_score)
        updated.append(pdata.get("steam_nickname", account_id))

    db.commit()
    return {
        "match_id": match_id,
        "score": f"{team1_score}-{team2_score}",
        "rounds_played": rounds_played,
        "updated": updated,
        "skipped": skipped,
    }



@router.delete("/reset-stats")
def reset_all_stats(db: Session = Depends(get_db), _=Depends(_verify_token)):
    deleted_stats = db.query(PlayerMatchStat).delete()
    deleted_matches = db.query(Match).delete()
    db.commit()
    print(f"[Admin] ⚠ RESET STATS: {deleted_stats} stats si {deleted_matches} meciuri sterse")
    return {"deleted_stats": deleted_stats, "deleted_matches": deleted_matches}


DB_BACKUP_DIR = DB_PATH.parent / "db_backups"


@router.get("/db/backups")
def list_db_backups(_=Depends(_verify_token)):
    DB_BACKUP_DIR.mkdir(exist_ok=True)
    backups = sorted(DB_BACKUP_DIR.glob("*.db"), reverse=True)
    return [
        {
            "filename": b.name,
            "size_kb": round(b.stat().st_size / 1024, 1),
            "created_at": datetime.fromtimestamp(b.stat().st_mtime).isoformat(),
        }
        for b in backups
    ]


@router.post("/db/backup")
def create_db_backup(_=Depends(_verify_token)):
    DB_BACKUP_DIR.mkdir(exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = DB_BACKUP_DIR / f"cs2leaderboard_{ts}.db"
    shutil.copy2(DB_PATH, backup_path)
    return {
        "filename": backup_path.name,
        "size_kb": round(backup_path.stat().st_size / 1024, 1),
        "created_at": datetime.now().isoformat(),
    }


@router.post("/db/restore/{filename}")
def restore_db_backup(filename: str, _=Depends(_verify_token)):
    if "/" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Nume fisier invalid")
    backup_path = DB_BACKUP_DIR / filename
    if not backup_path.exists():
        raise HTTPException(status_code=404, detail="Backup-ul nu exista")
    engine.dispose()
    shutil.copy2(backup_path, DB_PATH)
    return {"message": f"Restaurat din {filename}"}


@router.put("/youtube-link")
def set_youtube_link(body: dict, db: Session = Depends(get_db), _=Depends(_verify_token)):
    link = body.get("link", "").strip()
    setting = db.query(Setting).filter(Setting.key == "youtube_link").first()
    if setting:
        setting.value = link
    else:
        setting = Setting(key="youtube_link", value=link)
        db.add(setting)
    db.commit()
    return {"youtube_link": link}


@router.get("/youtube-link")
def get_youtube_link(db: Session = Depends(get_db)):
    setting = db.query(Setting).filter(Setting.key == "youtube_link").first()
    return {"youtube_link": setting.value if setting else None}


@router.put("/general-message")
def set_general_message(body: dict, db: Session = Depends(get_db), _=Depends(_verify_token)):
    message = body.get("message", "").strip()
    setting = db.query(Setting).filter(Setting.key == "general_message").first()
    if setting:
        setting.value = message
    else:
        setting = Setting(key="general_message", value=message)
        db.add(setting)
    db.commit()
    return {"general_message": message}


@router.get("/general-message")
def get_general_message(db: Session = Depends(get_db)):
    setting = db.query(Setting).filter(Setting.key == "general_message").first()
    return {"general_message": setting.value if setting else None}


@router.get("/users", dependencies=[Depends(_verify_token)])
def get_all_users(db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.email).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "display_name": u.display_name or u.email,
            "points": calculate_user_points(u.id, db)
        }
        for u in users
    ]


@router.get("/users/{user_id}/bets", dependencies=[Depends(_verify_token)])
def get_user_bets(user_id: int, db: Session = Depends(get_db)):
    team_bets = db.query(Bet).filter(Bet.user_id == user_id).order_by(Bet.created_at.desc()).all()
    player_bets = db.query(PlayerBet).filter(PlayerBet.user_id == user_id).order_by(PlayerBet.created_at.desc()).all()

    result = []

    for bet in team_bets:
        match = db.query(ScheduledMatch).filter(ScheduledMatch.id == bet.scheduled_match_id).first()
        result.append({
            "id": bet.id,
            "type": "team",
            "match": {
                "id": match.id if match else None,
                "team_a": match.team_a if match else None,
                "team_b": match.team_b if match else None,
                "scheduled_at": match.scheduled_at.isoformat() if match and match.scheduled_at else None,
            },
            "prediction": bet.predicted_winner,
            "status": "processed" if bet.points_earned is not None else "pending",
            "points_earned": bet.points_earned,
            "created_at": bet.created_at.isoformat(),
        })

    for pbet in player_bets:
        match = db.query(ScheduledMatch).filter(ScheduledMatch.id == pbet.scheduled_match_id).first()
        player = db.query(Player).filter(Player.id == pbet.predicted_player_id).first()
        result.append({
            "id": pbet.id,
            "type": "player",
            "match": {
                "id": match.id if match else None,
                "team_a": match.team_a if match else None,
                "team_b": match.team_b if match else None,
                "scheduled_at": match.scheduled_at.isoformat() if match and match.scheduled_at else None,
            },
            "prediction": player.steam_nickname if player else None,
            "player": {
                "id": player.id if player else None,
                "steam_nickname": player.steam_nickname if player else None,
            } if player else None,
            "status": "processed" if pbet.points_earned is not None else "pending",
            "points_earned": pbet.points_earned,
            "created_at": pbet.created_at.isoformat(),
        })

    return sorted(result, key=lambda x: x["created_at"], reverse=True)


@router.get("/matches-history", dependencies=[Depends(_verify_token)])
def get_matches_history(db: Session = Depends(get_db)):
    scheduled_matches = db.query(ScheduledMatch).order_by(ScheduledMatch.scheduled_at.desc()).all()

    result = []
    for sm in scheduled_matches:
        match_data = None
        if sm.match_id:
            m = db.query(Match).filter(Match.id == sm.match_id).first()
            if m:
                match_data = {
                    "id": m.id,
                    "map": m.map_name,
                    "rounds_played": m.rounds_played,
                    "team1_score": m.team1_score,
                    "team2_score": m.team2_score,
                    "timestamp": m.timestamp.isoformat() if m.timestamp else None,
                }

        result.append({
            "id": sm.id,
            "team_a": sm.team_a,
            "team_b": sm.team_b,
            "scheduled_at": sm.scheduled_at.isoformat() if sm.scheduled_at else None,
            "status": "played" if sm.match_id else "scheduled",
            "winner": sm.winner,
            "bets_processed": sm.bets_processed,
            "match": match_data,
            "created_at": sm.created_at.isoformat(),
        })

    return result
