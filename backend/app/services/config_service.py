from __future__ import annotations

from app.core.config import settings
from app.utils.exceptions import AppError
from app.utils.file_utils import validate_folder_name


ALLOWED_CONFIG_KEYS = {
    "storageRootPath",
    "indexRootPath",
    "logRootPath",
    "trashRootPath",
    "backupRootPath",
    "importRootPath",
    "allowedExtensions",
    "maxUploadSizeMB",
    "maxImportFileCount",
    "maxImportTotalSizeMB",
    "defaultFolderName",
    "unclassifiedFolderName",
    "enableHighlight",
    "enableAuditLog",
    "allowAbsoluteImportPath",
    "followSymlinks",
    "excludeHiddenFiles",
    "duplicatePolicy",
    "backupRetentionCount",
    "backupRetentionDays",
    "trashRetentionDays",
    "logRetentionDays",
    "searchHistoryLimit",
    "autoRepairAfterIntegrityCheck",
}

PATH_KEYS = {
    "storageRootPath",
    "indexRootPath",
    "logRootPath",
    "trashRootPath",
    "backupRootPath",
    "importRootPath",
}

POSITIVE_INT_KEYS = {
    "maxUploadSizeMB",
    "maxImportFileCount",
    "maxImportTotalSizeMB",
    "backupRetentionCount",
    "backupRetentionDays",
    "trashRetentionDays",
    "logRetentionDays",
    "searchHistoryLimit",
}

BOOL_KEYS = {
    "enableHighlight",
    "enableAuditLog",
    "allowAbsoluteImportPath",
    "followSymlinks",
    "excludeHiddenFiles",
    "autoRepairAfterIntegrityCheck",
}


def get_config() -> dict:
    return settings.runtime_config


def update_config(payload: dict) -> dict:
    config = settings.runtime_config
    updates = {key: value for key, value in payload.items() if key in ALLOWED_CONFIG_KEYS and value is not None}
    if "allowedExtensions" in updates:
        extensions = [extension.lower().lstrip(".") for extension in updates["allowedExtensions"] if extension]
        if not extensions:
            raise AppError("허용 확장자를 1개 이상 입력하세요.")
        updates["allowedExtensions"] = sorted(set(extensions))
    if "defaultFolderName" in updates:
        updates["defaultFolderName"] = validate_folder_name(updates["defaultFolderName"])
    if "unclassifiedFolderName" in updates:
        updates["unclassifiedFolderName"] = validate_folder_name(updates["unclassifiedFolderName"])
    for key in PATH_KEYS & updates.keys():
        value = str(updates[key]).strip()
        if not value:
            raise AppError(f"{key} must not be empty.")
        updates[key] = value
    for key in POSITIVE_INT_KEYS & updates.keys():
        value = int(updates[key])
        if value < 1:
            raise AppError(f"{key} must be greater than zero.")
        updates[key] = value
    for key in BOOL_KEYS & updates.keys():
        updates[key] = bool(updates[key])
    if updates.get("duplicatePolicy") not in (None, "block", "auto_rename"):
        raise AppError("duplicatePolicy must be block or auto_rename.")

    config.update(updates)
    settings.write_runtime_config(config)
    return config
