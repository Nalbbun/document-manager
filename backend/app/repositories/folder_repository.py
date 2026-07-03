from __future__ import annotations

from app.core.config import settings
from app.repositories.json_store import JsonStore


def folder_store() -> JsonStore:
    return JsonStore(settings.index_root / "folder-index.json", {"folders": []})


def read_folders() -> list[dict]:
    return folder_store().read().get("folders", [])


def write_folders(folders: list[dict]) -> None:
    folder_store().write({"folders": folders})

