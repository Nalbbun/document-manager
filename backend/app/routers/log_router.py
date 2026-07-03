from __future__ import annotations

from fastapi import APIRouter, Query

from app.services.log_service import read_log


router = APIRouter(prefix="/api/logs", tags=["logs"])


@router.get("/{log_type}")
def get_log(log_type: str, lines: int = Query(200, ge=1, le=1000)) -> dict:
    return read_log(log_type, lines)

