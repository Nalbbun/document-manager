from __future__ import annotations

from fastapi import APIRouter, Query
from fastapi.responses import FileResponse

from app.models.schemas import BulkDocumentMoveRequest, BulkDocumentRequest, DocumentMoveRequest, DocumentRenameRequest
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


@router.post("/bulk/move")
def bulk_move_documents(payload: BulkDocumentMoveRequest) -> dict:
    result = document_service.bulk_move_documents(payload.documentIds, payload.folderId)
    return {"success": result["failCount"] == 0, "message": "일괄 이동 처리 완료", **result}


@router.post("/bulk/delete")
def bulk_delete_documents(payload: BulkDocumentRequest) -> dict:
    result = document_service.bulk_delete_documents(payload.documentIds)
    return {"success": result["failCount"] == 0, "message": "선택 문서가 휴지통으로 이동되었습니다.", **result}


@router.patch("/{document_id}/move")
def move_document(document_id: str, payload: DocumentMoveRequest) -> dict:
    document = document_service.move_document(document_id, payload.folderId)
    return {"success": True, "message": "문서가 이동되었습니다.", "document": document}


@router.patch("/{document_id}/rename")
def rename_document(document_id: str, payload: DocumentRenameRequest) -> dict:
    document = document_service.rename_document(document_id, payload.fileName)
    return {"success": True, "message": "문서명이 변경되었습니다.", "document": document}


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
    trash_item = document_service.delete_document(document_id)
    return {"success": True, "message": "문서가 휴지통으로 이동되었습니다.", "trashItem": trash_item}
