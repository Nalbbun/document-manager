from __future__ import annotations

from app.core.config import settings
from app.utils.exceptions import AppError


LOG_FILES = {"app": "app.log", "error": "error.log", "audit": "audit.log"}


def read_log(log_type: str, lines: int = 200) -> dict:
    if log_type not in LOG_FILES:
        raise AppError("지원하지 않는 로그 유형입니다.", status_code=404)
    log_path = settings.log_root / LOG_FILES[log_type]
    if not log_path.exists():
        return {"type": log_type, "lines": []}
    content = log_path.read_text(encoding="utf-8", errors="replace").splitlines()
    return {"type": log_type, "lines": content[-lines:]}

