from __future__ import annotations

import shutil
from pathlib import Path

from fastapi.responses import FileResponse

from app.core.config import settings
from app.core.logger import now_iso
from app.utils.exceptions import AppError


LOG_FILES = {"app": "app.log", "error": "error.log", "audit": "audit.log"}


def read_log(
    log_type: str,
    lines: int = 200,
    q: str | None = None,
    level: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
) -> dict:
    log_path = _log_path(log_type)
    if not log_path.exists():
        return {"type": log_type, "lines": []}
    content = log_path.read_text(encoding="utf-8", errors="replace").splitlines()
    filtered = _filter_lines(content, q, level, start_date, end_date)
    return {"type": log_type, "lines": filtered[-lines:], "totalMatched": len(filtered)}


def get_log_file_response(log_type: str) -> FileResponse:
    log_path = _log_path(log_type)
    log_path.parent.mkdir(parents=True, exist_ok=True)
    if not log_path.exists():
        log_path.write_text("", encoding="utf-8")
    return FileResponse(path=log_path, filename=log_path.name, media_type="text/plain; charset=utf-8")


def archive_log(log_type: str) -> dict:
    log_path = _log_path(log_type)
    log_path.parent.mkdir(parents=True, exist_ok=True)
    archive_root = settings.log_root / "archive"
    archive_root.mkdir(parents=True, exist_ok=True)
    stamp = now_iso().replace("-", "").replace(":", "").replace("T", "-")
    archive_path = archive_root / f"{log_type}-{stamp}.log"
    if log_path.exists():
        shutil.copy2(log_path, archive_path)
        log_path.write_text("", encoding="utf-8")
    else:
        archive_path.write_text("", encoding="utf-8")
    return {
        "type": log_type,
        "archivePath": str(archive_path.relative_to(settings.project_root)),
        "fileSize": archive_path.stat().st_size,
        "archivedAt": now_iso(),
    }


def clear_log(log_type: str) -> dict:
    log_path = _log_path(log_type)
    deleted_size = log_path.stat().st_size if log_path.exists() else 0
    log_path.parent.mkdir(parents=True, exist_ok=True)
    log_path.write_text("", encoding="utf-8")
    return {"type": log_type, "deletedSize": deleted_size, "clearedAt": now_iso()}


def _log_path(log_type: str) -> Path:
    if log_type not in LOG_FILES:
        raise AppError("Unsupported log type.", status_code=404)
    return settings.log_root / LOG_FILES[log_type]


def _filter_lines(
    lines: list[str],
    q: str | None,
    level: str | None,
    start_date: str | None,
    end_date: str | None,
) -> list[str]:
    query = q.lower().strip() if q else ""
    normalized_level = level.upper().strip() if level else ""
    result: list[str] = []
    for line in lines:
        lowered = line.lower()
        if query and query not in lowered:
            continue
        if normalized_level and normalized_level not in line.upper():
            continue
        if start_date or end_date:
            timestamp = _line_timestamp(line)
            if start_date and timestamp and timestamp < start_date:
                continue
            if end_date and timestamp and timestamp > end_date:
                continue
        result.append(line)
    return result


def _line_timestamp(line: str) -> str | None:
    if len(line) >= 10 and line[4:5] == "-" and line[7:8] == "-":
        return line[:19].replace(" ", "T")
    marker = '"eventTime": "'
    if marker in line:
        return line.split(marker, 1)[1].split('"', 1)[0]
    return None
