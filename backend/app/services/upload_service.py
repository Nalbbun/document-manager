from __future__ import annotations

import shutil
import hashlib
from pathlib import Path
from typing import Any

from fastapi import UploadFile

from app.core.config import settings
from app.core.logger import now_iso, write_audit
from app.repositories.document_repository import read_documents, write_documents
from app.repositories.folder_repository import read_folders, write_folders
from app.repositories.search_index_repository import read_items, write_items
from app.services.folder_service import get_folder, list_folders
from app.services.text_extract_service import extract_text
from app.utils.exceptions import AppError
from app.utils.file_utils import (
    ensure_within_root,
    guess_mime_type,
    normalize_extension,
    relative_to_project,
    safe_file_name,
)


def _next_document_id(documents: list[dict]) -> str:
    numbers = []
    for document in documents:
        try:
            numbers.append(int(str(document["documentId"]).split("-")[-1]))
        except (KeyError, ValueError):
            continue
    return f"doc-{(max(numbers) + 1 if numbers else 1):04d}"


def _duplicate_file_exists(documents: list[dict], folder_id: str, file_name: str) -> bool:
    return any(
        document["folderId"] == folder_id and document["fileName"].lower() == file_name.lower()
        for document in documents
    )


def _find_duplicate_hash(documents: list[dict], file_hash: str) -> dict | None:
    return next((document for document in documents if document.get("fileHash") == file_hash), None)


def _populate_missing_file_hashes(documents: list[dict]) -> None:
    for document in documents:
        if document.get("fileHash"):
            continue
        try:
            file_path = ensure_within_root(settings.project_root / document["filePath"], settings.storage_root)
            if file_path.exists():
                document["fileHash"] = hashlib.sha256(file_path.read_bytes()).hexdigest()
        except Exception:
            continue


async def upload_files(folder_id: str, files: list[UploadFile]) -> dict:
    folder = get_folder(folder_id)
    folder_path = ensure_within_root(settings.project_root / folder["folderPath"], settings.storage_root)
    folder_path.mkdir(parents=True, exist_ok=True)
    documents = read_documents()
    items = read_items()
    succeeded: list[dict] = []
    failed: list[dict] = []

    for upload in files:
        file_name = safe_file_name(upload.filename or "untitled")
        try:
            content = await upload.read()
            document = _register_file_content(folder, folder_path, file_name, content, documents, items)
            succeeded.append(document)
        except AppError as exc:
            failed.append({"fileName": file_name, "reason": exc.message})
        except Exception as exc:
            failed.append({"fileName": file_name, "reason": str(exc)})

    write_documents(documents)
    write_items(items)
    _refresh_folder_counts()
    write_audit(
        "DOCUMENT_UPLOAD",
        None,
        folder["folderName"],
        "SUCCESS" if not failed else "PARTIAL",
        "파일 등록 처리 완료",
        {"successCount": len(succeeded), "failCount": len(failed)},
    )
    return {"successCount": len(succeeded), "failCount": len(failed), "succeeded": succeeded, "failed": failed}


def import_folder(folder_id: str, source_path: str, recursive: bool = True) -> dict:
    folder = get_folder(folder_id)
    target_folder_path = ensure_within_root(settings.project_root / folder["folderPath"], settings.storage_root)
    source = Path(source_path).expanduser().resolve()
    if not source.exists() or not source.is_dir():
        raise AppError("가져올 폴더 경로를 찾을 수 없습니다.")

    files = source.rglob("*") if recursive else source.glob("*")
    documents = read_documents()
    items = read_items()
    succeeded: list[dict] = []
    failed: list[dict] = []

    for file_path in files:
        if not file_path.is_file():
            continue
        file_name = safe_file_name(file_path.name)
        extension = normalize_extension(file_name)
        if extension not in settings.allowed_extensions:
            continue
        try:
            size = file_path.stat().st_size
            if size > settings.max_upload_size_bytes:
                raise AppError("파일 크기가 업로드 제한을 초과했습니다.")
            content = file_path.read_bytes()
            document = _register_file_content(folder, target_folder_path, file_name, content, documents, items)
            succeeded.append(document)
        except AppError as exc:
            failed.append({"fileName": file_name, "reason": exc.message})
        except Exception as exc:
            failed.append({"fileName": file_name, "reason": str(exc)})

    write_documents(documents)
    write_items(items)
    _refresh_folder_counts()
    write_audit(
        "DOCUMENT_IMPORT_FOLDER",
        None,
        folder["folderName"],
        "SUCCESS" if not failed else "PARTIAL",
        "폴더 단위 등록 처리 완료",
        {"sourcePath": str(source), "successCount": len(succeeded), "failCount": len(failed)},
    )
    return {"successCount": len(succeeded), "failCount": len(failed), "succeeded": succeeded, "failed": failed}


def _register_file_content(
    folder: dict,
    folder_path: Path,
    file_name: str,
    content: bytes,
    documents: list[dict],
    items: list[dict],
) -> dict:
    extension = normalize_extension(file_name)
    if extension not in settings.allowed_extensions:
        raise AppError("지원하지 않는 파일 형식입니다.")
    if len(content) > settings.max_upload_size_bytes:
        raise AppError("파일 크기가 업로드 제한을 초과했습니다.")
    if _duplicate_file_exists(documents, folder["folderId"], file_name):
        raise AppError("동일 폴더에 같은 파일명이 이미 등록되어 있습니다.")

    _populate_missing_file_hashes(documents)
    file_hash = hashlib.sha256(content).hexdigest()
    duplicate = _find_duplicate_hash(documents, file_hash)
    if duplicate:
        raise AppError(
            "동일한 내용의 파일이 이미 등록되어 있습니다: "
            f"{duplicate.get('displayName') or duplicate.get('fileName')} / {duplicate.get('folderName')}"
        )

    target_path = ensure_within_root(folder_path / file_name, settings.storage_root)
    if target_path.exists():
        raise AppError("저장 경로에 같은 파일명이 이미 존재합니다.")

    target_path.write_bytes(content)
    extraction = extract_text(target_path, extension)
    timestamp = now_iso()
    document = {
        "documentId": _next_document_id(documents),
        "folderId": folder["folderId"],
        "folderName": folder["folderName"],
        "fileName": file_name,
        "displayName": file_name,
        "extension": extension,
        "mimeType": guess_mime_type(file_name),
        "fileSize": len(content),
        "fileHash": file_hash,
        "filePath": relative_to_project(target_path, settings.project_root),
        "pageCount": extraction["pageCount"],
        "lineCount": extraction["lineCount"],
        "searchable": extraction["searchable"],
        "indexStatus": extraction["indexStatus"],
        "indexError": extraction["error"],
        "tags": [],
        "favorite": False,
        "pinned": False,
        "memo": "",
        "createdAt": timestamp,
        "updatedAt": timestamp,
    }
    documents.append(document)
    items.append(
        {
            "documentId": document["documentId"],
            "folderId": document["folderId"],
            "folderName": document["folderName"],
            "fileName": document["fileName"],
            "extension": document["extension"],
            "filePath": document["filePath"],
            "tags": document.get("tags", []),
            "favorite": bool(document.get("favorite")),
            "pinned": bool(document.get("pinned")),
            "locations": extraction["locations"],
        }
    )
    return document


def _refresh_folder_counts() -> None:
    folders = read_folders()
    documents = read_documents()
    for folder in folders:
        folder["documentCount"] = sum(1 for document in documents if document["folderId"] == folder["folderId"])
        folder["updatedAt"] = now_iso()
    write_folders(folders)
    list_folders()
