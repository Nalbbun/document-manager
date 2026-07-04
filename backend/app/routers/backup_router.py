from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import FileResponse

from app.services import backup_service


router = APIRouter(prefix="/api/backups", tags=["backups"])


@router.get("")
def get_backups() -> dict:
    return {"items": backup_service.list_backups()}


@router.post("")
def create_backup() -> dict:
    item = backup_service.create_backup()
    return {"success": True, "message": "백업이 생성되었습니다.", "backup": item}


@router.get("/{backup_id}/download")
def download_backup(backup_id: str) -> FileResponse:
    return backup_service.get_backup_file_response(backup_id)


@router.post("/{backup_id}/validate")
def validate_backup(backup_id: str) -> dict:
    validation = backup_service.validate_backup(backup_id)
    return {"success": validation["valid"], "message": "백업 검증이 완료되었습니다.", "validation": validation}


@router.post("/{backup_id}/restore")
def restore_backup(backup_id: str) -> dict:
    result = backup_service.restore_backup(backup_id)
    return {"success": True, "message": "백업 복원이 완료되었습니다.", **result}
