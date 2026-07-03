from __future__ import annotations

from app.core.config import settings
from app.repositories.json_store import JsonStore


DOCUMENT_DEFAULTS = {
    "fileHash": "",
    "tags": [],
    "favorite": False,
    "pinned": False,
    "memo": "",
}


def document_store() -> JsonStore:
    return JsonStore(settings.index_root / "document-index.json", {"documents": []})


def read_documents() -> list[dict]:
    documents = document_store().read().get("documents", [])
    for document in documents:
        for key, value in DOCUMENT_DEFAULTS.items():
            if key not in document:
                document[key] = list(value) if isinstance(value, list) else value
    return documents


def write_documents(documents: list[dict]) -> None:
    document_store().write({"documents": documents})
