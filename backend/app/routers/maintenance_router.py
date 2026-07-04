from __future__ import annotations

from fastapi import APIRouter

from app.services import maintenance_service


router = APIRouter(prefix="/api/maintenance", tags=["maintenance"])


@router.get("/integrity")
def check_integrity() -> dict:
    return maintenance_service.check_integrity()


@router.post("/repair")
def repair_integrity() -> dict:
    result = maintenance_service.repair_integrity()
    return {"success": True, "message": "데이터 정합성 자동 복구가 완료되었습니다.", **result}
