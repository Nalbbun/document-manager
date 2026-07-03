from __future__ import annotations

import shutil

from app.core.config import settings
from app.core.logger import now_iso, write_audit
from app.repositories.document_repository import read_documents, write_documents
from app.repositories.folder_repository import read_folders, write_folders
from app.repositories.search_index_repository import read_items, write_items
from app.utils.exceptions import AppError
from app.utils.file_utils import ensure_within_root, relative_to_project, validate_folder_name


def _next_folder_id(folders: list[dict]) -> str:
    numbers = []
    for folder in folders:
        try:
            numbers.append(int(str(folder["folderId"]).split("-")[-1]))
        except (KeyError, ValueError):
            continue
    return f"fld-{(max(numbers) + 1 if numbers else 1):04d}"


def _find_folder(folder_id: str) -> dict:
    for folder in read_folders():
        if folder["folderId"] == folder_id:
            return folder
    raise AppError("폴더를 찾을 수 없습니다.", status_code=404)


def list_folders() -> list[dict]:
    folders = read_folders()
    documents = read_documents()
    counts = {folder["folderId"]: 0 for folder in folders}
    for document in documents:
        counts[document["folderId"]] = counts.get(document["folderId"], 0) + 1

    changed = False
    for folder in folders:
        count = counts.get(folder["folderId"], 0)
        if folder.get("documentCount") != count:
            folder["documentCount"] = count
            changed = True
    if changed:
        write_folders(folders)
    return folders


def create_folder(folder_name: str) -> dict:
    name = validate_folder_name(folder_name)
    folders = read_folders()
    if any(folder["folderName"].lower() == name.lower() for folder in folders):
        raise AppError("동일한 폴더명이 이미 존재합니다.")

    folder_path = ensure_within_root(settings.storage_root / name, settings.storage_root)
    folder_path.mkdir(parents=False, exist_ok=False)
    timestamp = now_iso()
    folder = {
        "folderId": _next_folder_id(folders),
        "folderName": name,
        "folderPath": relative_to_project(folder_path, settings.project_root),
        "isSystemFolder": False,
        "documentCount": 0,
        "createdAt": timestamp,
        "updatedAt": timestamp,
    }
    folders.append(folder)
    write_folders(folders)
    write_audit("FOLDER_CREATE", folder["folderId"], name, "SUCCESS", "폴더 생성 완료")
    return folder


def rename_folder(folder_id: str, folder_name: str) -> dict:
    name = validate_folder_name(folder_name)
    folders = read_folders()
    target = next((folder for folder in folders if folder["folderId"] == folder_id), None)
    if not target:
        raise AppError("폴더를 찾을 수 없습니다.", status_code=404)
    if target.get("isSystemFolder"):
        raise AppError("시스템 폴더명은 변경할 수 없습니다.")
    if any(folder["folderId"] != folder_id and folder["folderName"].lower() == name.lower() for folder in folders):
        raise AppError("동일한 폴더명이 이미 존재합니다.")

    old_path = ensure_within_root(settings.project_root / target["folderPath"], settings.storage_root)
    new_path = ensure_within_root(settings.storage_root / name, settings.storage_root)
    if new_path.exists():
        raise AppError("대상 폴더 경로가 이미 존재합니다.")
    old_path.rename(new_path)

    old_name = target["folderName"]
    target["folderName"] = name
    target["folderPath"] = relative_to_project(new_path, settings.project_root)
    target["updatedAt"] = now_iso()

    documents = read_documents()
    for document in documents:
        if document["folderId"] == folder_id:
            document["folderName"] = name
            document_path = new_path / document["fileName"]
            document["filePath"] = relative_to_project(document_path, settings.project_root)
            document["updatedAt"] = now_iso()
    write_documents(documents)

    items = read_items()
    for item in items:
        if item["folderId"] == folder_id:
            item["folderName"] = name
    write_items(items)
    write_folders(folders)

    write_audit(
        "FOLDER_RENAME",
        folder_id,
        name,
        "SUCCESS",
        "폴더명 변경 완료",
        {"before": old_name, "after": name},
    )
    return target


def delete_folder(folder_id: str) -> None:
    folders = read_folders()
    target = next((folder for folder in folders if folder["folderId"] == folder_id), None)
    if not target:
        raise AppError("폴더를 찾을 수 없습니다.", status_code=404)
    if target.get("isSystemFolder"):
        raise AppError("시스템 폴더는 삭제할 수 없습니다.")

    documents = read_documents()
    document_count = sum(1 for document in documents if document["folderId"] == folder_id)
    if document_count > 0:
        raise AppError("문서가 있는 폴더는 삭제할 수 없습니다.")

    folder_path = ensure_within_root(settings.project_root / target["folderPath"], settings.storage_root)
    if folder_path.exists():
        shutil.rmtree(folder_path)
    write_folders([folder for folder in folders if folder["folderId"] != folder_id])
    write_audit("FOLDER_DELETE", folder_id, target["folderName"], "SUCCESS", "폴더 삭제 완료")


def get_folder(folder_id: str) -> dict:
    return _find_folder(folder_id)

