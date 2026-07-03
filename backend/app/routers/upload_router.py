from __future__ import annotations

from fastapi import APIRouter, File, Form, UploadFile

from app.models.schemas import ImportFolderRequest
from app.services.upload_service import import_folder, upload_files


router = APIRouter(prefix="/api/documents", tags=["upload"])


@router.post("/upload")
async def upload_documents(folderId: str = Form(...), files: list[UploadFile] = File(...)) -> dict:
    result = await upload_files(folderId, files)
    return {"success": result["failCount"] == 0, "message": "파일 등록 처리가 완료되었습니다.", **result}


@router.post("/import-folder")
def import_documents_from_folder(payload: ImportFolderRequest) -> dict:
    result = import_folder(payload.folderId, payload.sourcePath, payload.recursive)
    return {"success": result["failCount"] == 0, "message": "폴더 단위 등록 처리가 완료되었습니다.", **result}

