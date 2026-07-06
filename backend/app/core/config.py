from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any


class Settings:
    project_root: Path = Path(__file__).resolve().parents[3]
    config_path: Path = project_root / "data" / "config" / "app-config.json"
    legacy_default_extensions: set[str] = {"pdf", "md", "txt"}
    previous_default_extensions: set[str] = {"pdf", "md", "txt", "pptx"}

    default_config: dict[str, Any] = {
        "appName": "document-manager-v1",
        "storageRootPath": "data/storage",
        "indexRootPath": "data/index",
        "logRootPath": "data/logs",
        "trashRootPath": "data/trash",
        "backupRootPath": "data/backup",
        "importRootPath": "data/import",
        "allowedExtensions": ["pdf", "md", "txt", "pptx", "hwpx"],
        "maxUploadSizeMB": 100,
        "maxImportFileCount": 1000,
        "maxImportTotalSizeMB": 2048,
        "defaultFolderName": "default",
        "unclassifiedFolderName": "unclassified",
        "enableHighlight": True,
        "enableAuditLog": True,
        "allowAbsoluteImportPath": False,
        "followSymlinks": False,
        "excludeHiddenFiles": True,
        "duplicatePolicy": "block",
        "backupRetentionCount": 10,
        "backupRetentionDays": 90,
        "trashRetentionDays": 30,
        "logRetentionDays": 30,
        "searchHistoryLimit": 100,
        "autoRepairAfterIntegrityCheck": False,
        "backendHost": "127.0.0.1",
        "backendPort": 8000,
        "frontendPort": 5173,
    }

    @property
    def app_name(self) -> str:
        return os.getenv("APP_NAME", self.runtime_config["appName"])

    @property
    def host(self) -> str:
        return os.getenv("APP_HOST", self.runtime_config.get("backendHost", "127.0.0.1"))

    @property
    def port(self) -> int:
        return int(os.getenv("APP_PORT", str(self.runtime_config.get("backendPort", 8000))))

    @property
    def runtime_config(self) -> dict[str, Any]:
        self.config_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.config_path.exists():
            self.write_runtime_config(self.default_config)
            return dict(self.default_config)

        try:
            with self.config_path.open("r", encoding="utf-8") as file:
                loaded = json.load(file)
        except json.JSONDecodeError:
            backup_path = self.config_path.with_suffix(".json.bak")
            self.config_path.replace(backup_path)
            self.write_runtime_config(self.default_config)
            return dict(self.default_config)

        merged = dict(self.default_config)
        merged.update(loaded)
        current_extensions = set(self._normalize_extensions(merged.get("allowedExtensions", [])))
        if current_extensions in (self.legacy_default_extensions, self.previous_default_extensions):
            merged["allowedExtensions"] = list(self.default_config["allowedExtensions"])
            self.write_runtime_config(merged)
        return merged

    def write_runtime_config(self, config: dict[str, Any]) -> None:
        self.config_path.parent.mkdir(parents=True, exist_ok=True)
        temp_path = self.config_path.with_suffix(".json.tmp")
        backup_path = self.config_path.with_suffix(".json.bak")
        if self.config_path.exists():
            backup_path.write_text(self.config_path.read_text(encoding="utf-8"), encoding="utf-8")
        with temp_path.open("w", encoding="utf-8") as file:
            json.dump(config, file, ensure_ascii=False, indent=2)
            file.write("\n")
        with temp_path.open("r", encoding="utf-8") as file:
            json.load(file)
        try:
            temp_path.replace(self.config_path)
        except Exception:
            if backup_path.exists():
                backup_path.replace(self.config_path)
            raise

    @property
    def storage_root(self) -> Path:
        return self.resolve_project_path(self.runtime_config["storageRootPath"])

    @property
    def index_root(self) -> Path:
        return self.resolve_project_path(self.runtime_config["indexRootPath"])

    @property
    def log_root(self) -> Path:
        return self.resolve_project_path(self.runtime_config["logRootPath"])

    @property
    def trash_root(self) -> Path:
        return self.resolve_project_path(self.runtime_config["trashRootPath"])

    @property
    def backup_root(self) -> Path:
        return self.resolve_project_path(self.runtime_config["backupRootPath"])

    @property
    def import_root(self) -> Path:
        return self.resolve_project_path(self.runtime_config["importRootPath"])

    @property
    def max_upload_size_bytes(self) -> int:
        return int(self.runtime_config["maxUploadSizeMB"]) * 1024 * 1024

    @property
    def max_import_file_count(self) -> int:
        return int(self.runtime_config.get("maxImportFileCount", 1000))

    @property
    def max_import_total_size_bytes(self) -> int:
        return int(self.runtime_config.get("maxImportTotalSizeMB", 2048)) * 1024 * 1024

    @property
    def allow_absolute_import_path(self) -> bool:
        return bool(self.runtime_config.get("allowAbsoluteImportPath", False))

    @property
    def follow_symlinks(self) -> bool:
        return bool(self.runtime_config.get("followSymlinks", False))

    @property
    def exclude_hidden_files(self) -> bool:
        return bool(self.runtime_config.get("excludeHiddenFiles", True))

    @property
    def allowed_extensions(self) -> set[str]:
        return set(self._normalize_extensions(self.runtime_config["allowedExtensions"]))

    @property
    def default_folder_name(self) -> str:
        return str(self.runtime_config["defaultFolderName"])

    @property
    def unclassified_folder_name(self) -> str:
        return str(self.runtime_config["unclassifiedFolderName"])

    def resolve_project_path(self, value: str | Path) -> Path:
        path = Path(value)
        if path.is_absolute():
            return path.resolve()
        return (self.project_root / path).resolve()

    def _normalize_extensions(self, extensions: Any) -> list[str]:
        if not isinstance(extensions, list):
            return []
        return [str(extension).lower().lstrip(".") for extension in extensions if extension]


settings = Settings()
