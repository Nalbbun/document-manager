from __future__ import annotations

import re

from app.core.logger import write_audit
from app.repositories.document_repository import read_documents
from app.repositories.search_index_repository import read_items
from app.utils.exceptions import AppError


def search_documents(
    keyword: str,
    scope: str = "all",
    folder_id: str | None = None,
    document_id: str | None = None,
    extension: str | None = None,
    case_sensitive: bool = False,
    exact_match: bool = False,
) -> dict:
    query = keyword.strip()
    if not query:
        raise AppError("검색어를 입력하세요.")

    documents_by_id = {document["documentId"]: document for document in read_documents()}
    results: list[dict] = []
    needle = query if case_sensitive else query.lower()

    for item in read_items():
        document = documents_by_id.get(item["documentId"])
        if not document or not document.get("searchable") or document.get("indexStatus") != "INDEXED":
            continue
        if scope == "folder" and item["folderId"] != folder_id:
            continue
        if scope == "document" and item["documentId"] != document_id:
            continue
        if extension and item["extension"] != extension.lower():
            continue

        for location in item.get("locations", []):
            text = location.get("text", "")
            haystack = text if case_sensitive else text.lower()
            if _matches(haystack, needle, exact_match):
                results.append(
                    {
                        "documentId": item["documentId"],
                        "folderId": item["folderId"],
                        "folderName": document["folderName"],
                        "fileName": item["fileName"],
                        "displayName": document["displayName"],
                        "extension": item["extension"],
                        "locationType": location["locationType"],
                        "pageNumber": location.get("pageNumber"),
                        "lineNumber": location.get("lineNumber"),
                        "snippet": _snippet(text, query, case_sensitive),
                        "filePath": document["filePath"],
                        "viewerUrl": _viewer_url(item["documentId"], location, query),
                    }
                )

    write_audit(
        "DOCUMENT_SEARCH",
        None,
        query,
        "SUCCESS",
        "문서 검색 완료",
        {"scope": scope, "resultCount": len(results)},
    )
    return {"success": True, "keyword": query, "resultCount": len(results), "results": results[:500]}


def _matches(haystack: str, needle: str, exact_match: bool) -> bool:
    if not exact_match:
        return needle in haystack
    return bool(re.search(rf"(?<!\w){re.escape(needle)}(?!\w)", haystack))


def _snippet(text: str, keyword: str, case_sensitive: bool) -> str:
    source = text
    compare_source = source if case_sensitive else source.lower()
    compare_keyword = keyword if case_sensitive else keyword.lower()
    index = compare_source.find(compare_keyword)
    if index < 0:
        return source[:220]
    start = max(index - 80, 0)
    end = min(index + len(keyword) + 120, len(source))
    prefix = "..." if start > 0 else ""
    suffix = "..." if end < len(source) else ""
    return f"{prefix}{source[start:end]}{suffix}"


def _viewer_url(document_id: str, location: dict, keyword: str) -> str:
    params = [f"documentId={document_id}", f"keyword={keyword}"]
    if location.get("pageNumber"):
        params.append(f"page={location['pageNumber']}")
    if location.get("lineNumber"):
        params.append(f"line={location['lineNumber']}")
    return "/viewer?" + "&".join(params)

