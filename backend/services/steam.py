"""
Integrare cu Steam Web API pentru avatare si profil.
API key gratuit: https://store.steampowered.com/dev/apikey
"""
import os
import httpx

STEAM_API_KEY = os.getenv("STEAM_API_KEY", "")
STEAM_API_BASE = "https://api.steampowered.com"
STEAM_ID64_BASE = 76561197960265728


def account_id_to_steam64(account_id: str | int) -> str:
    return str(STEAM_ID64_BASE + int(account_id))


async def fetch_player_summary(steam_id64: str) -> dict | None:
    if not STEAM_API_KEY:
        return None
    url = f"{STEAM_API_BASE}/ISteamUser/GetPlayerSummaries/v0002/"
    params = {"key": STEAM_API_KEY, "steamids": steam_id64}
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url, params=params, timeout=5.0)
            resp.raise_for_status()
            players = resp.json().get("response", {}).get("players", [])
            return players[0] if players else None
        except Exception:
            return None


async def fetch_avatar_url(account_id: str) -> str | None:
    steam64 = account_id_to_steam64(account_id)
    summary = await fetch_player_summary(steam64)
    if summary:
        # avatarfull = 184x184, avatarmedium = 64x64, avatar = 32x32
        return summary.get("avatarmedium") or summary.get("avatar")
    return None
