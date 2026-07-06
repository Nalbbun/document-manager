from __future__ import annotations

import csv
import io

from fastapi import APIRouter, Query
from fastapi.responses import Response

from app.services.search_service import clear_search_history, list_search_history, search_documents


router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("/export")
def export_search(
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
    format: str = Query("csv"),
) -> Response:
    payload = search_documents(
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
    if format == "markdown":
        content = _markdown_export(payload["results"])
        media_type = "text/markdown; charset=utf-8"
        file_name = "search-results.md"
    else:
        content = _csv_export(payload["results"])
        media_type = "text/csv; charset=utf-8"
        file_name = "search-results.csv"
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{file_name}"'},
    )


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
def get_search_history(limit: int = Query(30, ge=1, le=1000)) -> dict:
    return {"items": list_search_history(limit)}


def _csv_export(results: list[dict]) -> str:
    buffer = io.StringIO()
    writer = csv.DictWriter(
        buffer,
        fieldnames=[
            "displayName",
            "folderName",
            "extension",
            "locationType",
            "pageNumber",
            "lineNumber",
            "snippet",
            "tags",
            "filePath",
            "score",
        ],
    )
    writer.writeheader()
    for result in results:
        writer.writerow(
            {
                "displayName": result.get("displayName", ""),
                "folderName": result.get("folderName", ""),
                "extension": result.get("extension", ""),
                "locationType": result.get("locationType", ""),
                "pageNumber": result.get("pageNumber") or "",
                "lineNumber": result.get("lineNumber") or "",
                "snippet": result.get("snippet", ""),
                "tags": ", ".join(result.get("tags", [])),
                "filePath": result.get("filePath", ""),
                "score": result.get("score", 0),
            }
        )
    return "\ufeff" + buffer.getvalue()


def _markdown_export(results: list[dict]) -> str:
    lines = [
        "# Search Results",
        "",
        "| Document | Folder | Location | Snippet |",
        "| --- | --- | --- | --- |",
    ]
    for result in results:
        location = result.get("locationType", "")
        if result.get("pageNumber"):
            location = f"page {result['pageNumber']}"
        elif result.get("lineNumber"):
            location = f"line {result['lineNumber']}"
        lines.append(
            "| "
            + " | ".join(
                [
                    _escape_markdown_cell(str(result.get("displayName", ""))),
                    _escape_markdown_cell(str(result.get("folderName", ""))),
                    _escape_markdown_cell(str(location)),
                    _escape_markdown_cell(str(result.get("snippet", ""))),
                ]
            )
            + " |"
        )
    lines.append("")
    return "\n".join(lines)


def _escape_markdown_cell(value: str) -> str:
    return value.replace("|", "\\|").replace("\n", " ")


@router.delete("/history")
def delete_search_history() -> dict:
    result = clear_search_history()
    return {"success": True, "message": "검색 이력이 삭제되었습니다.", **result}
