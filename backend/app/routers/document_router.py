from __future__ import annotations

from fastapi import APIRouter, Query
from fastapi.responses import FileResponse

from app.services import document_service


router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.get("")
def get_documents(
    folderId: str | None = None,
    extension: str | None = None,
    keyword: str | None = None,
    sort: str = Query("createdAt"),
    order: str = Query("desc"),
) -> dict:
    return {
        "documents": document_service.list_documents(
            folder_id=folderId,
            extension=extension,
            keyword=keyword,
            sort=sort,
            order=order,
        )
    }


@router.get("/{document_id}/file")
def get_document_file(document_id: str) -> FileResponse:
    return document_service.get_file_response(document_id)


@router.get("/{document_id}/preview")
def get_document_preview(document_id: str) -> dict:
    return document_service.get_preview(document_id)


@router.get("/{document_id}")
def get_document(document_id: str) -> dict:
    return {"document": document_service.get_document(document_id)}


@router.delete("/{document_id}")
def delete_document(document_id: str) -> dict:
    document_service.delete_document(document_id)
    return {"success": True, "message": "문서가 삭제되었습니다."}

