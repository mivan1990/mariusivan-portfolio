import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from dotenv import load_dotenv
import os

load_dotenv()

from database import engine, Base
from routers import auth, worldcup


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)

    from services.worldcup_sync import background_sync_loop
    task = asyncio.create_task(background_sync_loop())

    yield

    task.cancel()


app = FastAPI(
    title="Portofoliu Marius Ivan — API",
    version="1.0.0",
    lifespan=lifespan,
)

BLOCKED_EXTENSIONS = {".php", ".asp", ".aspx", ".jsp", ".cgi", ".env", ".git", ".xml", ".bak", ".sql"}
BLOCKED_PATTERNS = {"phpunit", "wp-admin", "wp-login", "eval-stdin", "xmlrpc", "shell", "passwd"}

@app.middleware("http")
async def block_scanners(request: Request, call_next):
    path = request.url.path.lower()
    if any(path.endswith(ext) for ext in BLOCKED_EXTENSIONS):
        return Response(status_code=404)
    if any(pattern in path for pattern in BLOCKED_PATTERNS):
        return Response(status_code=404)
    return await call_next(request)

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,https://mariusivan.ro,https://www.mariusivan.ro").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in cors_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(worldcup.router)


@app.get("/api/health")
def health():
    return {"status": "healthy"}
