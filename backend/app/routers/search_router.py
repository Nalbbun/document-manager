from __future__ import annotations

from fastapi import APIRouter, Query

from app.services.search_service import search_documents


router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("")
def search(
    keyword: str = Query(..., min_length=1),
    scope: str = Query("all"),
    folderId: str | None = None,
    documentId: str | None = None,
    extension: str | None = None,
    caseSensitive: bool = False,
    exactMatch: bool = False,
) -> dict:
    return search_documents(
        keyword=keyword,
        scope=scope,
        folder_id=folderId,
        document_id=documentId,
        extension=extension,
        case_sensitive=caseSensitive,
        exact_match=exactMatch,
    )

