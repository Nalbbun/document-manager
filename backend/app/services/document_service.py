from __future__ import annotations

from fastapi.responses import FileResponse

from app.core.config import settings
from app.core.logger import now_iso, write_audit
from app.repositories.document_repository import read_documents, write_documents
from app.repositories.folder_repository import read_folders, write_folders
from app.repositories.search_index_repository import read_items, write_items
from app.utils.exceptions import AppError
from app.utils.file_utils import ensure_within_root


def list_documents(
    folder_id: str | None = None,
    extension: str | None = None,
    keyword: str | None = None,
    sort: str = "createdAt",
    order: str = "desc",
) -> list[dict]:
    documents = read_documents()
    if folder_id:
        documents = [document for document in documents if document["folderId"] == folder_id]
    if extension:
        documents = [document for document in documents if document["extension"] == extension.lower()]
    if keyword:
        needle = keyword.lower()
        documents = [
            document
            for document in documents
            if needle in document["displayName"].lower() or needle in document["fileName"].lower()
        ]

    reverse = order.lower() != "asc"
    if sort in {"displayName", "fileSize", "createdAt", "extension", "folderName"}:
        documents.sort(key=lambda document: document.get(sort) or "", reverse=reverse)
    return documents


def get_document(document_id: str) -> dict:
    for document in read_documents():
        if document["documentId"] == document_id:
            return document
    raise AppError("문서를 찾을 수 없습니다.", status_code=404)


def delete_document(document_id: str) -> None:
    documents = read_documents()
    target = next((document for document in documents if document["documentId"] == document_id), None)
    if not target:
        raise AppError("문서를 찾을 수 없습니다.", status_code=404)

    file_path = ensure_within_root(settings.project_root / target["filePath"], settings.storage_root)
    if file_path.exists():
        file_path.unlink()

    write_documents([document for document in documents if document["documentId"] != document_id])
    write_items([item for item in read_items() if item["documentId"] != document_id])
    _refresh_folder_counts()
    write_audit("DOCUMENT_DELETE", document_id, target["fileName"], "SUCCESS", "문서 삭제 완료")


def get_file_response(document_id: str) -> FileResponse:
    document = get_document(document_id)
    file_path = ensure_within_root(settings.project_root / document["filePath"], settings.storage_root)
    if not file_path.exists():
        raise AppError("원본 파일을 찾을 수 없습니다.", status_code=404)
    return FileResponse(
        path=file_path,
        media_type=document["mimeType"],
        filename=document["fileName"],
        content_disposition_type="inline",
    )


def get_preview(document_id: str) -> dict:
    document = get_document(document_id)
    file_path = ensure_within_root(settings.project_root / document["filePath"], settings.storage_root)
    if not file_path.exists():
        raise AppError("원본 파일을 찾을 수 없습니다.", status_code=404)

    if document["extension"] == "pdf":
        return {
            "document": document,
            "viewerType": "pdf",
            "fileUrl": f"/api/documents/{document_id}/file",
            "lines": [],
        }

    text = _read_text_file(file_path)
    return {
        "document": document,
        "viewerType": "text",
        "fileUrl": f"/api/documents/{document_id}/file",
        "lines": [{"lineNumber": index, "text": line} for index, line in enumerate(text.splitlines(), start=1)],
    }


def _read_text_file(file_path) -> str:
    for encoding in ("utf-8-sig", "utf-8", "cp949"):
        try:
            return file_path.read_text(encoding=encoding)
        except UnicodeDecodeError:
            continue
    return file_path.read_text(encoding="utf-8", errors="replace")


def _refresh_folder_counts() -> None:
    folders = read_folders()
    documents = read_documents()
    timestamp = now_iso()
    for folder in folders:
        folder["documentCount"] = sum(1 for document in documents if document["folderId"] == folder["folderId"])
        folder["updatedAt"] = timestamp
    write_folders(folders)
