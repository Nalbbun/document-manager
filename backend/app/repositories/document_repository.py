from __future__ import annotations

from app.core.config import settings
from app.repositories.json_store import JsonStore


def document_store() -> JsonStore:
    return JsonStore(settings.index_root / "document-index.json", {"documents": []})


def read_documents() -> list[dict]:
    return document_store().read().get("documents", [])


def write_documents(documents: list[dict]) -> None:
    document_store().write({"documents": documents})

