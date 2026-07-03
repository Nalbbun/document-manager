from __future__ import annotations

from app.core.config import settings
from app.repositories.json_store import JsonStore


def backup_store() -> JsonStore:
    return JsonStore(settings.backup_root / "backup-index.json", {"items": []})


def read_backup_items() -> list[dict]:
    return backup_store().read().get("items", [])


def write_backup_items(items: list[dict]) -> None:
    backup_store().write({"items": items})
