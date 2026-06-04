from fastapi import APIRouter

router = APIRouter(prefix="/api/live", tags=["live"])


@router.get("")
def get_live_match():
    return {"is_live": False, "reason": "Niciun meci live in acest moment."}
