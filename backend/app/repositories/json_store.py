from __future__ import annotations

import copy
import json
import threading
from pathlib import Path
from typing import Any


class JsonStore:
    _locks: dict[Path, threading.RLock] = {}

    def __init__(self, path: Path, default_data: dict[str, Any]) -> None:
        self.path = path
        self.default_data = default_data
        self._lock = self._locks.setdefault(path.resolve(), threading.RLock())

    def ensure(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if not self.path.exists():
            self.write(copy.deepcopy(self.default_data), create_backup=False)

    def read(self) -> dict[str, Any]:
        with self._lock:
            self.ensure()
            try:
                with self.path.open("r", encoding="utf-8") as file:
                    return json.load(file)
            except json.JSONDecodeError:
                backup_path = self.path.with_suffix(self.path.suffix + ".bak")
                self.path.replace(backup_path)
                data = copy.deepcopy(self.default_data)
                self._write_unlocked(data, create_backup=False)
                return data

    def write(self, data: dict[str, Any], create_backup: bool = True) -> None:
        with self._lock:
            self._write_unlocked(data, create_backup=create_backup)

    def _write_unlocked(self, data: dict[str, Any], create_backup: bool = True) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        backup_path = self.path.with_suffix(self.path.suffix + ".bak")
        if create_backup and self.path.exists():
            backup_path.write_text(self.path.read_text(encoding="utf-8"), encoding="utf-8")
        temp_path = self.path.with_suffix(self.path.suffix + ".tmp")
        with temp_path.open("w", encoding="utf-8") as file:
            json.dump(data, file, ensure_ascii=False, indent=2)
            file.write("\n")
        with temp_path.open("r", encoding="utf-8") as file:
            json.load(file)
        try:
            temp_path.replace(self.path)
        except Exception:
            if create_backup and backup_path.exists():
                backup_path.replace(self.path)
            raise
