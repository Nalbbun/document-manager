from __future__ import annotations

from app.core.config import settings
from app.core.logger import now_iso, write_audit
from app.repositories.document_repository import read_documents, write_documents
from app.repositories.search_index_repository import read_items, write_items
from app.services.text_extract_service import extract_text
from app.utils.exceptions import AppError
from app.utils.file_utils import ensure_within_root


def get_index_status() -> dict:
    documents = read_documents()
    items = read_items()
    return {
        "documentCount": len(documents),
        "indexedCount": sum(1 for document in documents if document.get("indexStatus") == "INDEXED"),
        "failedCount": sum(1 for document in documents if document.get("indexStatus") == "FAILED"),
        "unsearchableCount": sum(1 for document in documents if document.get("indexStatus") == "UNSEARCHABLE"),
        "searchIndexItemCount": len(items),
    }


def rebuild_all_indexes() -> dict:
    documents = read_documents()
    new_items: list[dict] = []
    success_count = 0
    fail_count = 0
    timestamp = now_iso()

    for document in documents:
        file_path = ensure_within_root(settings.project_root / document["filePath"], settings.storage_root)
        if not file_path.exists():
            document["searchable"] = False
            document["indexStatus"] = "FAILED"
            document["indexError"] = "원본 파일을 찾을 수 없습니다."
            document["updatedAt"] = timestamp
            fail_count += 1
            continue

        extraction = extract_text(file_path, document["extension"])
        document["pageCount"] = extraction["pageCount"]
        document["lineCount"] = extraction["lineCount"]
        document["searchable"] = extraction["searchable"]
        document["indexStatus"] = extraction["indexStatus"]
        document["indexError"] = extraction["error"]
        document["updatedAt"] = timestamp
        if extraction["searchable"]:
            success_count += 1
        else:
            fail_count += 1

        new_items.append(
            {
                "documentId": document["documentId"],
                "folderId": document["folderId"],
                "folderName": document["folderName"],
                "fileName": document["fileName"],
                "extension": document["extension"],
                "filePath": document["filePath"],
                "locations": extraction["locations"],
            }
        )

    write_documents(documents)
    write_items(new_items)
    write_audit(
        "INDEX_REBUILD",
        None,
        None,
        "SUCCESS",
        "전체 인덱스 재생성 완료",
        {"successCount": success_count, "failCount": fail_count},
    )
    return {"successCount": success_count, "failCount": fail_count, "status": get_index_status()}


def rebuild_document_index(document_id: str) -> dict:
    documents = read_documents()
    document = next((item for item in documents if item["documentId"] == document_id), None)
    if not document:
        raise AppError("문서를 찾을 수 없습니다.", status_code=404)

    timestamp = now_iso()
    file_path = ensure_within_root(settings.project_root / document["filePath"], settings.storage_root)
    if not file_path.exists():
        document["searchable"] = False
        document["indexStatus"] = "FAILED"
        document["indexError"] = "원본 파일을 찾을 수 없습니다."
        document["updatedAt"] = timestamp
        items = [item for item in read_items() if item["documentId"] != document_id]
        write_documents(documents)
        write_items(items)
        write_audit("INDEX_REBUILD_DOCUMENT", document_id, document["fileName"], "FAILED", "문서 인덱스 재생성 실패")
        return {"successCount": 0, "failCount": 1, "document": document, "status": get_index_status()}

    extraction = extract_text(file_path, document["extension"])
    document["pageCount"] = extraction["pageCount"]
    document["lineCount"] = extraction["lineCount"]
    document["searchable"] = extraction["searchable"]
    document["indexStatus"] = extraction["indexStatus"]
    document["indexError"] = extraction["error"]
    document["updatedAt"] = timestamp

    items = [item for item in read_items() if item["documentId"] != document_id]
    items.append(
        {
            "documentId": document["documentId"],
            "folderId": document["folderId"],
            "folderName": document["folderName"],
            "fileName": document["fileName"],
            "extension": document["extension"],
            "filePath": document["filePath"],
            "locations": extraction["locations"],
        }
    )

    write_documents(documents)
    write_items(items)
    success_count = 1 if extraction["searchable"] else 0
    fail_count = 0 if extraction["searchable"] else 1
    write_audit(
        "INDEX_REBUILD_DOCUMENT",
        document_id,
        document["fileName"],
        "SUCCESS" if extraction["searchable"] else "FAILED",
        "문서 인덱스 재생성 완료",
        {"indexStatus": document["indexStatus"]},
    )
    return {"successCount": success_count, "failCount": fail_count, "document": document, "status": get_index_status()}
