from __future__ import annotations

from fastapi import APIRouter, Query

from app.services.search_service import clear_search_history, list_search_history, search_documents


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
    matchMode: str = Query("contains"),
    excludeKeyword: str | None = None,
    tag: str | None = None,
    favorite: bool | None = None,
    pinned: bool | None = None,
    sort: str = Query("relevance"),
) -> dict:
    return search_documents(
        keyword=keyword,
        scope=scope,
        folder_id=folderId,
        document_id=documentId,
        extension=extension,
        case_sensitive=caseSensitive,
        exact_match=exactMatch,
        match_mode=matchMode,
        exclude_keyword=excludeKeyword,
        tag=tag,
        favorite=favorite,
        pinned=pinned,
        sort=sort,
    )


@router.get("/history")
def get_search_history(limit: int = Query(30, ge=1, le=100)) -> dict:
    return {"items": list_search_history(limit)}


@router.delete("/history")
def delete_search_history() -> dict:
    result = clear_search_history()
    return {"success": True, "message": "검색 이력이 삭제되었습니다.", **result}
