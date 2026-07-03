from __future__ import annotations

from fastapi import APIRouter

from app.models.schemas import TrashRestoreRequest
from app.services import document_service


router = APIRouter(prefix="/api/trash", tags=["trash"])


@router.get("")
def get_trash_items() -> dict:
    return {"items": document_service.list_trash_items()}


@router.post("/{trash_id}/restore")
def restore_trash_item(trash_id: str, payload: TrashRestoreRequest | None = None) -> dict:
    document = document_service.restore_trash_item(trash_id, payload.folderId if payload else None)
    return {"success": True, "message": "문서가 복원되었습니다.", "document": document}


@router.delete("/{trash_id}")
def permanently_delete_trash_item(trash_id: str) -> dict:
    item = document_service.permanently_delete_trash_item(trash_id)
    return {"success": True, "message": "문서가 영구 삭제되었습니다.", "item": item}


@router.delete("")
def empty_trash() -> dict:
    result = document_service.empty_trash()
    return {"success": result["failCount"] == 0, "message": "휴지통 비우기 처리 완료", **result}
