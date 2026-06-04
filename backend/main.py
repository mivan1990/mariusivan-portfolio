import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import bcrypt
from dotenv import load_dotenv
from pathlib import Path
import os

load_dotenv()

from database import engine, Base, SessionLocal
from models import AdminUser, Team, Setting
from routers import leaderboard, players, matches, admin, live, scheduled, auth, bets, gsi, player_bets, worldcup


def _migrate():
    from sqlalchemy import text
    with engine.connect() as conn:
        def cols_of(table):
            return [r[1] for r in conn.execute(text(f"PRAGMA table_info({table})"))]

        m = cols_of("matches")
        if "session_id" not in m:
            conn.execute(text("ALTER TABLE matches ADD COLUMN session_id TEXT"))
            conn.commit()
            print("✅ Migrare: session_id -> matches")

        sm = cols_of("scheduled_matches")
        if "winner" not in sm:
            conn.execute(text("ALTER TABLE scheduled_matches ADD COLUMN winner TEXT"))
            conn.commit()
            print("✅ Migrare: winner -> scheduled_matches")
        if "bets_processed" not in sm:
            conn.execute(text("ALTER TABLE scheduled_matches ADD COLUMN bets_processed INTEGER DEFAULT 0"))
            conn.commit()
            print("✅ Migrare: bets_processed -> scheduled_matches")

        # Creeaza tabelul teams daca nu exista
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS teams (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.commit()

        pl = cols_of("players")
        if "aliases" not in pl:
            conn.execute(text("ALTER TABLE players ADD COLUMN aliases TEXT"))
            conn.commit()
            print("✅ Migrare: aliases -> players")

        u = cols_of("users")
        if "is_admin" not in u:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0"))
            conn.commit()
            print("✅ Migrare: is_admin -> users")

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS player_bets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id),
                scheduled_match_id INTEGER NOT NULL REFERENCES scheduled_matches(id),
                predicted_player_id INTEGER NOT NULL REFERENCES players(id),
                points_earned INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, scheduled_match_id)
            )
        """))
        conn.commit()

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT UNIQUE NOT NULL,
                value TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.commit()

        # Seteaza admini
        for admin_email in ("ivan.marius@feg.eu", "gontaru.marian@feg.eu"):
            conn.execute(text(f"UPDATE users SET is_admin = 1 WHERE email = '{admin_email}'"))
        conn.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _migrate()
    _create_default_admin()

    from seed import seed
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()

    from services.worldcup_sync import background_sync_loop
    task = asyncio.create_task(background_sync_loop())

    yield

    task.cancel()


def _create_default_admin():
    db = SessionLocal()
    try:
        if db.query(AdminUser).first():
            return
        username = os.getenv("ADMIN_USERNAME", "admin")
        password = os.getenv("ADMIN_PASSWORD", "admin123")
        hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        db.add(AdminUser(username=username, password_hash=hashed))
        db.commit()
        print(f"\n✅ Admin creat automat: {username} / {password}")
        print("⚠️  Schimba parola din panoul de admin dupa primul login!\n")
    finally:
        db.close()


limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="CS2 Leaderboard API",
    version="1.0.0",
    description="API pentru leaderboard-ul competitiei 2v2 CS2",
    lifespan=lifespan,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

BLOCKED_EXTENSIONS = {".php", ".asp", ".aspx", ".jsp", ".cgi", ".env", ".git", ".xml", ".bak", ".sql"}
BLOCKED_PATTERNS = {"phpunit", "wp-admin", "wp-login", "eval-stdin", ".well-known/acme", "xmlrpc", "shell", "passwd"}

@app.middleware("http")
async def block_scanners(request: Request, call_next):
    path = request.url.path.lower()
    if any(path.endswith(ext) for ext in BLOCKED_EXTENSIONS):
        return Response(status_code=404)
    if any(pattern in path for pattern in BLOCKED_PATTERNS):
        return Response(status_code=404)
    return await call_next(request)

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:5174,http://localhost:3000,https://mariusivan.ro,https://www.mariusivan.ro").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in cors_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(leaderboard.router)
app.include_router(players.router)
app.include_router(matches.router)
app.include_router(admin.router)
app.include_router(live.router)
app.include_router(scheduled.router)
app.include_router(auth.router)
app.include_router(bets.router)
app.include_router(player_bets.router)
app.include_router(gsi.router)
app.include_router(worldcup.router)


@app.get("/api/health")
def health():
    return {"status": "healthy"}


# Serveste React build — trebuie sa fie dupa toate rutele /api
FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    def _html_response():
        return FileResponse(
            str(FRONTEND_DIST / "index.html"),
            headers={"Cache-Control": "no-store, no-cache, must-revalidate"},
        )

    @app.get("/")
    def serve_root():
        return _html_response()

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        file_path = FRONTEND_DIST / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return _html_response()
