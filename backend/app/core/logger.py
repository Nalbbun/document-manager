from __future__ import annotations

import json
import logging
from datetime import datetime, timezone, timedelta
from logging.handlers import RotatingFileHandler
from typing import Any

from app.core.config import settings


KST = timezone(timedelta(hours=9))


def now_iso() -> str:
    return datetime.now(KST).isoformat(timespec="seconds")


def configure_logging() -> None:
    settings.log_root.mkdir(parents=True, exist_ok=True)
    logging.getLogger().handlers.clear()
    logging.getLogger().setLevel(logging.INFO)

    app_handler = RotatingFileHandler(
        settings.log_root / "app.log",
        maxBytes=1_000_000,
        backupCount=3,
        encoding="utf-8",
    )
    error_handler = RotatingFileHandler(
        settings.log_root / "error.log",
        maxBytes=1_000_000,
        backupCount=3,
        encoding="utf-8",
    )
    console_handler = logging.StreamHandler()

    formatter = logging.Formatter("%(asctime)s %(levelname)s [%(name)s] %(message)s")
    app_handler.setFormatter(formatter)
    error_handler.setFormatter(formatter)
    console_handler.setFormatter(formatter)
    error_handler.setLevel(logging.ERROR)

    root = logging.getLogger()
    root.addHandler(app_handler)
    root.addHandler(error_handler)
    root.addHandler(console_handler)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)


def write_audit(
    event_type: str,
    target_id: str | None,
    target_name: str | None,
    result: str,
    message: str,
    extra: dict[str, Any] | None = None,
) -> None:
    if not settings.runtime_config.get("enableAuditLog", True):
        return

    settings.log_root.mkdir(parents=True, exist_ok=True)
    payload: dict[str, Any] = {
        "eventTime": now_iso(),
        "eventType": event_type,
        "targetId": target_id,
        "targetName": target_name,
        "result": result,
        "message": message,
    }
    if extra:
        payload["extra"] = extra

    with (settings.log_root / "audit.log").open("a", encoding="utf-8") as file:
        file.write(json.dumps(payload, ensure_ascii=False) + "\n")

