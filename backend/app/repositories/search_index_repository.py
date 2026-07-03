from __future__ import annotations

from app.core.config import settings
from app.repositories.json_store import JsonStore


def search_index_store() -> JsonStore:
    return JsonStore(settings.index_root / "search-index.json", {"items": []})


def read_items() -> list[dict]:
    return search_index_store().read().get("items", [])


def write_items(items: list[dict]) -> None:
    search_index_store().write({"items": items})

