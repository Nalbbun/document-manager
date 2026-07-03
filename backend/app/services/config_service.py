from __future__ import annotations

from app.core.config import settings
from app.utils.exceptions import AppError
from app.utils.file_utils import validate_folder_name


ALLOWED_CONFIG_KEYS = {
    "storageRootPath",
    "indexRootPath",
    "logRootPath",
    "allowedExtensions",
    "maxUploadSizeMB",
    "defaultFolderName",
    "unclassifiedFolderName",
    "enableHighlight",
    "enableAuditLog",
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

    config.update(updates)
    settings.write_runtime_config(config)
    return config

