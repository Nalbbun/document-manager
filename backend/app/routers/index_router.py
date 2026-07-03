from __future__ import annotations

from fastapi import APIRouter

from app.services.index_service import get_index_status, rebuild_all_indexes, rebuild_document_index


router = APIRouter(prefix="/api/index", tags=["index"])


@router.get("/status")
def index_status() -> dict:
    return get_index_status()


@router.post("/rebuild")
def rebuild_index() -> dict:
    return {"success": True, "message": "인덱스 재생성이 완료되었습니다.", **rebuild_all_indexes()}


@router.post("/documents/{document_id}/rebuild")
def rebuild_document(document_id: str) -> dict:
    return {"success": True, "message": "문서 인덱스 재생성이 완료되었습니다.", **rebuild_document_index(document_id)}
