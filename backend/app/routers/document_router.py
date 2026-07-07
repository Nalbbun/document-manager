from __future__ import annotations

from fastapi import APIRouter, Query
from fastapi.responses import FileResponse

from app.models.schemas import (
    BulkDocumentMoveRequest,
    BulkDocumentRequest,
    BulkDocumentTagRequest,
    DocumentMetadataUpdate,
    DocumentMoveRequest,
    DocumentRenameRequest,
)
from app.services import document_service


router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.get("")
def get_documents(
    folderId: str | None = None,
    extension: str | None = None,
    keyword: str | None = None,
    tag: str | None = None,
    favorite: bool | None = None,
    pinned: bool | None = None,
    sort: str = Query("createdAt"),
    order: str = Query("desc"),
) -> dict:
    return {
        "documents": document_service.list_documents(
            folder_id=folderId,
            extension=extension,
            keyword=keyword,
            tag=tag,
            favorite=favorite,
            pinned=pinned,
            sort=sort,
            order=order,
        )
    }


@router.get("/tags")
def get_document_tags() -> dict:
    return {"items": document_service.list_tags()}


@router.get("/duplicates")
def get_duplicate_documents() -> dict:
    return {"items": document_service.list_duplicate_documents()}


@router.post("/bulk/move")
def bulk_move_documents(payload: BulkDocumentMoveRequest) -> dict:
    result = document_service.bulk_move_documents(payload.documentIds, payload.folderId)
    return {"success": result["failCount"] == 0, "message": "일괄 이동 처리 완료", **result}


@router.post("/bulk/delete")
def bulk_delete_documents(payload: BulkDocumentRequest) -> dict:
    result = document_service.bulk_delete_documents(payload.documentIds)
    return {"success": result["failCount"] == 0, "message": "선택 문서가 휴지통으로 이동되었습니다.", **result}


@router.post("/bulk/tags")
def bulk_update_document_tags(payload: BulkDocumentTagRequest) -> dict:
    result = document_service.bulk_update_document_tags(payload.documentIds, payload.tags, payload.mode)
    return {"success": result["failCount"] == 0, "message": "문서 태그 일괄 처리가 완료되었습니다.", **result}


@router.patch("/{document_id}/move")
def move_document(document_id: str, payload: DocumentMoveRequest) -> dict:
    document = document_service.move_document(document_id, payload.folderId)
    return {"success": True, "message": "문서가 이동되었습니다.", "document": document}


@router.patch("/{document_id}/rename")
def rename_document(document_id: str, payload: DocumentRenameRequest) -> dict:
    document = document_service.rename_document(document_id, payload.fileName)
    return {"success": True, "message": "문서명이 변경되었습니다.", "document": document}


@router.patch("/{document_id}/metadata")
def update_document_metadata(document_id: str, payload: DocumentMetadataUpdate) -> dict:
    document = document_service.update_document_metadata(
        document_id,
        tags=payload.tags,
        favorite=payload.favorite,
        pinned=payload.pinned,
        memo=payload.memo,
    )
    return {"success": True, "message": "문서 분류 정보가 수정되었습니다.", "document": document}


@router.get("/{document_id}/file")
def get_document_file(document_id: str) -> FileResponse:
    return document_service.get_file_response(document_id)


@router.get("/{document_id}/preview")
def get_document_preview(
    document_id: str,
    line: int | None = Query(None, ge=1),
    limit: int = Query(250, ge=1, le=500),
) -> dict:
    return document_service.get_preview(document_id, line=line, limit=limit)


@router.get("/{document_id}")
def get_document(document_id: str) -> dict:
    return {"document": document_service.get_document(document_id)}


@router.delete("/{document_id}")
def delete_document(document_id: str) -> dict:
    trash_item = document_service.delete_document(document_id)
    return {"success": True, "message": "문서가 휴지통으로 이동되었습니다.", "trashItem": trash_item}
