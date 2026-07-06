from __future__ import annotations

from fastapi import APIRouter, Query
from fastapi.responses import FileResponse

from app.services.log_service import archive_log, clear_log, get_log_file_response, read_log


router = APIRouter(prefix="/api/logs", tags=["logs"])


@router.get("/{log_type}")
def get_log(
    log_type: str,
    lines: int = Query(200, ge=1, le=5000),
    q: str | None = None,
    level: str | None = None,
    startDate: str | None = None,
    endDate: str | None = None,
) -> dict:
    return read_log(log_type, lines, q=q, level=level, start_date=startDate, end_date=endDate)


@router.get("/{log_type}/download")
def download_log(log_type: str) -> FileResponse:
    return get_log_file_response(log_type)


@router.post("/{log_type}/archive")
def archive_log_file(log_type: str) -> dict:
    return {"success": True, "archive": archive_log(log_type)}


@router.delete("/{log_type}")
def delete_log_file(log_type: str) -> dict:
    return {"success": True, "log": clear_log(log_type)}
