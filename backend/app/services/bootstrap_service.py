from __future__ import annotations

from app.core.config import settings
from app.core.logger import now_iso
from app.repositories.backup_repository import backup_store
from app.repositories.document_repository import document_store
from app.repositories.folder_repository import folder_store, read_folders, write_folders
from app.repositories.search_history_repository import search_history_store
from app.repositories.search_index_repository import search_index_store
from app.repositories.trash_repository import trash_store
from app.utils.file_utils import relative_to_project


def initialize_runtime() -> None:
    settings.storage_root.mkdir(parents=True, exist_ok=True)
    settings.index_root.mkdir(parents=True, exist_ok=True)
    settings.log_root.mkdir(parents=True, exist_ok=True)
    settings.trash_root.mkdir(parents=True, exist_ok=True)
    settings.backup_root.mkdir(parents=True, exist_ok=True)
    (settings.project_root / "data" / "temp").mkdir(parents=True, exist_ok=True)
    (settings.project_root / "data" / "trash").mkdir(parents=True, exist_ok=True)
    (settings.trash_root / "documents").mkdir(parents=True, exist_ok=True)
    settings.write_runtime_config(settings.runtime_config)

    folder_store().ensure()
    document_store().ensure()
    search_index_store().ensure()
    trash_store().ensure()
    backup_store().ensure()
    search_history_store().ensure()
    ensure_system_folders()

    for log_name in ("app.log", "error.log", "audit.log"):
        log_path = settings.log_root / log_name
        log_path.touch(exist_ok=True)


def ensure_system_folders() -> None:
    folders = read_folders()
    names = {folder["folderName"].lower(): folder for folder in folders}
    changed = False

    for folder_id, folder_name in (
        ("fld-0001", settings.default_folder_name),
        ("fld-0002", settings.unclassified_folder_name),
    ):
        path = settings.storage_root / folder_name
        path.mkdir(parents=True, exist_ok=True)
        if folder_name.lower() not in names:
            timestamp = now_iso()
            folders.append(
                {
                    "folderId": folder_id,
                    "folderName": folder_name,
                    "folderPath": relative_to_project(path, settings.project_root),
                    "isSystemFolder": True,
                    "documentCount": 0,
                    "createdAt": timestamp,
                    "updatedAt": timestamp,
                }
            )
            changed = True

    if changed:
        write_folders(folders)
