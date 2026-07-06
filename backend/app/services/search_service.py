from __future__ import annotations

import re
from urllib.parse import quote

from app.core.config import settings
from app.core.logger import now_iso, write_audit
from app.repositories.document_repository import read_documents
from app.repositories.search_history_repository import read_search_history_items, write_search_history_items
from app.repositories.search_index_repository import read_items
from app.utils.exceptions import AppError


VALID_MATCH_MODES = {"contains", "and", "or", "phrase"}
VALID_SORTS = {"relevance", "createdAt", "fileName"}


def search_documents(
    keyword: str,
    scope: str = "all",
    folder_id: str | None = None,
    document_id: str | None = None,
    extension: str | None = None,
    case_sensitive: bool = False,
    exact_match: bool = False,
    match_mode: str = "contains",
    exclude_keyword: str | None = None,
    tag: str | None = None,
    favorite: bool | None = None,
    pinned: bool | None = None,
    sort: str = "relevance",
) -> dict:
    query = keyword.strip()
    if not query:
        raise AppError("寃?됱뼱瑜??낅젰?섏꽭??")

    match_mode = match_mode if match_mode in VALID_MATCH_MODES else "contains"
    sort = sort if sort in VALID_SORTS else "relevance"
    documents_by_id = {document["documentId"]: document for document in read_documents()}
    results: list[dict] = []

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
        if tag and not _document_has_tag(document, tag):
            continue
        if favorite is not None and bool(document.get("favorite")) != favorite:
            continue
        if pinned is not None and bool(document.get("pinned")) != pinned:
            continue

        document_text = _document_metadata_text(document)
        metadata_match = _matches_query(document_text, query, case_sensitive, exact_match, match_mode)
        metadata_excluded = _matches_any(document_text, exclude_keyword, case_sensitive)
        matched_text = False

        for location in item.get("locations", []):
            text = location.get("text", "")
            if not _matches_query(text, query, case_sensitive, exact_match, match_mode):
                continue
            if _matches_any(text, exclude_keyword, case_sensitive) or metadata_excluded:
                continue
            matched_text = True
            score = _score_text(text, query, case_sensitive) + (4 if metadata_match else 0)
            results.append(_result(item, document, location, text, query, case_sensitive, score))

        if metadata_match and not metadata_excluded and not matched_text:
            score = _score_text(document_text, query, case_sensitive) + 2
            results.append(
                _result(
                    item,
                    document,
                    {"locationType": "META", "pageNumber": None, "lineNumber": None},
                    document_text,
                    query,
                    case_sensitive,
                    score,
                )
            )

    _sort_results(results, sort)
    filters = {
        "scope": scope,
        "folderId": folder_id,
        "documentId": document_id,
        "extension": extension,
        "caseSensitive": case_sensitive,
        "exactMatch": exact_match,
        "matchMode": match_mode,
        "excludeKeyword": exclude_keyword,
        "tag": tag,
        "favorite": favorite,
        "pinned": pinned,
        "sort": sort,
    }
    _record_search_history(query, filters, len(results))
    write_audit(
        "DOCUMENT_SEARCH",
        None,
        query,
        "SUCCESS",
        "臾몄꽌 寃???꾨즺",
        {"scope": scope, "resultCount": len(results), "matchMode": match_mode, "tag": tag},
    )
    return {"success": True, "keyword": query, "resultCount": len(results), "results": results[:500]}


def list_search_history(limit: int = 30) -> list[dict]:
    items = read_search_history_items()
    items.sort(key=lambda item: item.get("searchedAt") or "", reverse=True)
    configured_limit = int(settings.runtime_config.get("searchHistoryLimit", 100))
    return items[: max(1, min(limit, configured_limit))]


def clear_search_history() -> dict:
    deleted_count = len(read_search_history_items())
    write_search_history_items([])
    write_audit("SEARCH_HISTORY_CLEAR", None, None, "SUCCESS", "검색 이력이 삭제되었습니다.", {"deletedCount": deleted_count})
    return {"deletedCount": deleted_count}


def _result(
    item: dict,
    document: dict,
    location: dict,
    text: str,
    query: str,
    case_sensitive: bool,
    score: int,
) -> dict:
    return {
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
        "tags": document.get("tags", []),
        "favorite": bool(document.get("favorite")),
        "pinned": bool(document.get("pinned")),
        "memo": document.get("memo", ""),
        "createdAt": document.get("createdAt", ""),
        "score": score,
    }


def _sort_results(results: list[dict], sort: str) -> None:
    if sort == "createdAt":
        results.sort(key=lambda item: (item.get("createdAt") or "", item.get("score") or 0), reverse=True)
    elif sort == "fileName":
        results.sort(key=lambda item: item.get("displayName", "").lower())
    else:
        results.sort(key=lambda item: item.get("score") or 0, reverse=True)


def _matches_query(text: str, query: str, case_sensitive: bool, exact_match: bool, match_mode: str) -> bool:
    haystack = text if case_sensitive else text.lower()
    normalized_query = query if case_sensitive else query.lower()
    terms = _terms(normalized_query)

    if match_mode == "phrase":
        return _matches_token(haystack, normalized_query, exact_match)
    if match_mode == "and":
        return bool(terms) and all(_matches_token(haystack, term, exact_match) for term in terms)
    if match_mode == "or":
        return bool(terms) and any(_matches_token(haystack, term, exact_match) for term in terms)
    return _matches_token(haystack, normalized_query, exact_match)


def _matches_token(haystack: str, needle: str, exact_match: bool) -> bool:
    if not needle:
        return False
    if not exact_match:
        return needle in haystack
    return bool(re.search(rf"(?<!\w){re.escape(needle)}(?!\w)", haystack))


def _matches_any(text: str, keyword: str | None, case_sensitive: bool) -> bool:
    if not keyword or not keyword.strip():
        return False
    haystack = text if case_sensitive else text.lower()
    for term in _terms(keyword if case_sensitive else keyword.lower()):
        if term and term in haystack:
            return True
    return False


def _terms(text: str) -> list[str]:
    return [term for term in re.split(r"\s+", text.strip()) if term]


def _score_text(text: str, query: str, case_sensitive: bool) -> int:
    haystack = text if case_sensitive else text.lower()
    terms = _terms(query if case_sensitive else query.lower())
    if not terms:
        return 0
    return sum(haystack.count(term) for term in terms if term)


def _document_has_tag(document: dict, tag: str) -> bool:
    needle = tag.lower()
    return any(str(item).lower() == needle for item in document.get("tags", []))


def _document_metadata_text(document: dict) -> str:
    return " ".join(
        [
            document.get("displayName", ""),
            document.get("fileName", ""),
            document.get("folderName", ""),
            " ".join(str(tag) for tag in document.get("tags", [])),
            document.get("memo", ""),
        ]
    )


def _snippet(text: str, keyword: str, case_sensitive: bool) -> str:
    source = text.strip()
    compare_source = source if case_sensitive else source.lower()
    compare_keyword = keyword if case_sensitive else keyword.lower()
    index = compare_source.find(compare_keyword)
    if index < 0:
        first_term = _terms(compare_keyword)[0] if _terms(compare_keyword) else compare_keyword
        index = compare_source.find(first_term)
        compare_keyword = first_term
    if index < 0:
        return source[:220]
    start = max(index - 80, 0)
    end = min(index + len(compare_keyword) + 120, len(source))
    prefix = "..." if start > 0 else ""
    suffix = "..." if end < len(source) else ""
    return f"{prefix}{source[start:end]}{suffix}"


def _viewer_url(document_id: str, location: dict, keyword: str) -> str:
    params = [f"documentId={quote(document_id)}", f"keyword={quote(keyword)}"]
    if location.get("pageNumber"):
        params.append(f"page={location['pageNumber']}")
    if location.get("lineNumber"):
        params.append(f"line={location['lineNumber']}")
    return "/viewer?" + "&".join(params)


def _record_search_history(keyword: str, filters: dict, result_count: int) -> None:
    timestamp = now_iso()
    item = {
        "historyId": f"hist-{timestamp.replace(':', '').replace('-', '').replace('.', '')}",
        "keyword": keyword,
        "filters": filters,
        "resultCount": result_count,
        "searchedAt": timestamp,
    }
    existing = read_search_history_items()
    filtered = [
        history
        for history in existing
        if not (history.get("keyword") == keyword and history.get("filters", {}) == filters)
    ]
    configured_limit = int(settings.runtime_config.get("searchHistoryLimit", 100))
    write_search_history_items([item, *filtered][: max(1, configured_limit)])
