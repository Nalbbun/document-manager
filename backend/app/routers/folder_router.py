from __future__ import annotations

from fastapi import APIRouter

from app.models.schemas import FolderCreate, FolderUpdate
from app.services import folder_service


router = APIRouter(prefix="/api/folders", tags=["folders"])


@router.get("")
def get_folders() -> dict:
    return {"folders": folder_service.list_folders()}


@router.post("")
def create_folder(payload: FolderCreate) -> dict:
    folder = folder_service.create_folder(payload.folderName)
    return {"success": True, "folderId": folder["folderId"], "message": "폴더가 생성되었습니다.", "folder": folder}


@router.put("/{folder_id}")
def update_folder(folder_id: str, payload: FolderUpdate) -> dict:
    folder = folder_service.rename_folder(folder_id, payload.folderName)
    return {"success": True, "message": "폴더명이 변경되었습니다.", "folder": folder}


@router.delete("/{folder_id}")
def delete_folder(folder_id: str) -> dict:
    folder_service.delete_folder(folder_id)
    return {"success": True, "message": "폴더가 삭제되었습니다."}

