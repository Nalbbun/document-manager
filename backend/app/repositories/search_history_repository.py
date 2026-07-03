from __future__ import annotations

from app.core.config import settings
from app.repositories.json_store import JsonStore


def search_history_store() -> JsonStore:
    return JsonStore(settings.index_root / "search-history.json", {"items": []})


def read_search_history_items() -> list[dict]:
    return search_history_store().read().get("items", [])


def write_search_history_items(items: list[dict]) -> None:
    search_history_store().write({"items": items})
