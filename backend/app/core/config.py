from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any


class Settings:
    project_root: Path = Path(__file__).resolve().parents[3]
    config_path: Path = project_root / "data" / "config" / "app-config.json"

    default_config: dict[str, Any] = {
        "appName": "document-manager-v1",
        "storageRootPath": "data/storage",
        "indexRootPath": "data/index",
        "logRootPath": "data/logs",
        "trashRootPath": "data/trash",
        "backupRootPath": "data/backup",
        "allowedExtensions": ["pdf", "md", "txt"],
        "maxUploadSizeMB": 100,
        "defaultFolderName": "default",
        "unclassifiedFolderName": "unclassified",
        "enableHighlight": True,
        "enableAuditLog": True,
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
        return merged

    def write_runtime_config(self, config: dict[str, Any]) -> None:
        self.config_path.parent.mkdir(parents=True, exist_ok=True)
        temp_path = self.config_path.with_suffix(".json.tmp")
        with temp_path.open("w", encoding="utf-8") as file:
            json.dump(config, file, ensure_ascii=False, indent=2)
            file.write("\n")
        temp_path.replace(self.config_path)

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
    def max_upload_size_bytes(self) -> int:
        return int(self.runtime_config["maxUploadSizeMB"]) * 1024 * 1024

    @property
    def allowed_extensions(self) -> set[str]:
        return {extension.lower().lstrip(".") for extension in self.runtime_config["allowedExtensions"]}

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


settings = Settings()
