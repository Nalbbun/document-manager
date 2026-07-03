from __future__ import annotations

from app.core.config import settings
from app.repositories.json_store import JsonStore


def trash_store() -> JsonStore:
    return JsonStore(settings.trash_root / "trash-index.json", {"items": []})


def read_trash_items() -> list[dict]:
    return trash_store().read().get("items", [])


def write_trash_items(items: list[dict]) -> None:
    trash_store().write({"items": items})
