from __future__ import annotations

import shutil
import zipfile
import hashlib
import json
from pathlib import Path

from fastapi.responses import FileResponse

from app.core.config import settings
from app.core.logger import now_iso, write_audit
from app.repositories.backup_repository import read_backup_items, write_backup_items
from app.utils.exceptions import AppError
from app.utils.file_utils import ensure_within_root, relative_to_project


BACKUP_DIRS = ("storage", "index", "config", "logs", "trash")
REQUIRED_ENTRIES = (
    "data/storage/",
    "data/index/",
    "data/config/",
    "data/trash/",
)


def list_backups() -> list[dict]:
    items = read_backup_items()
    items.sort(key=lambda item: item.get("createdAt") or "", reverse=True)
    return items


def create_backup(reason: str = "MANUAL") -> dict:
    settings.backup_root.mkdir(parents=True, exist_ok=True)
    items = read_backup_items()
    backup_id = _next_backup_id(items)
    timestamp = now_iso()
    stamp = timestamp.replace("-", "").replace(":", "").replace("T", "-")[:15]
    file_name = f"document-manager-backup-{stamp}.zip"
    backup_path = ensure_within_root(settings.backup_root / file_name, settings.backup_root)

    with zipfile.ZipFile(backup_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for directory_name in BACKUP_DIRS:
            source = settings.project_root / "data" / directory_name
            if not source.exists():
                continue
            for path in source.rglob("*"):
                if path.is_dir():
                    continue
                archive.write(path, path.resolve().relative_to(settings.project_root.resolve()).as_posix())

    item = {
        "backupId": backup_id,
        "fileName": file_name,
        "fileSize": backup_path.stat().st_size,
        "sha256": _sha256_file(backup_path),
        "backupPath": relative_to_project(backup_path, settings.project_root),
        "createdAt": timestamp,
        "status": "SUCCESS",
        "reason": reason,
    }
    items.append(item)
    write_backup_items(items)
    write_audit("BACKUP_CREATE", backup_id, file_name, "SUCCESS", "백업 생성 완료", item)
    return item


def get_backup_file_response(backup_id: str) -> FileResponse:
    item = _find_backup(backup_id)
    backup_path = _backup_path(item)
    if not backup_path.exists():
        raise AppError("백업 파일을 찾을 수 없습니다.", status_code=404)
    return FileResponse(path=backup_path, filename=item["fileName"], media_type="application/zip")


def validate_backup(backup_id: str) -> dict:
    item = _find_backup(backup_id)
    backup_path = _backup_path(item)
    if not backup_path.exists():
        raise AppError("백업 파일을 찾을 수 없습니다.", status_code=404)
    return _validate_backup_file(backup_path, item)


def preview_backup(backup_id: str) -> dict:
    item = _find_backup(backup_id)
    backup_path = _backup_path(item)
    validation = _validate_backup_file(backup_path, item)
    return {"backup": item, "validation": validation, "summary": _preview_backup_file(backup_path)}


def dry_run_restore(backup_id: str) -> dict:
    preview = preview_backup(backup_id)
    return {
        "restorable": preview["validation"]["valid"],
        "backup": preview["backup"],
        "validation": preview["validation"],
        "summary": preview["summary"],
    }


def restore_backup(backup_id: str) -> dict:
    item = _find_backup(backup_id)
    backup_path = _backup_path(item)
    validation = _validate_backup_file(backup_path, item)
    if not validation["valid"]:
        raise AppError("백업 파일 구조가 올바르지 않아 복원할 수 없습니다.")

    safety_backup = create_backup(reason="PRE_RESTORE")
    temp_root = settings.project_root / "data" / "temp" / f"restore-{backup_id}"
    if temp_root.exists():
        shutil.rmtree(temp_root)
    temp_root.mkdir(parents=True, exist_ok=True)

    try:
        with zipfile.ZipFile(backup_path, "r") as archive:
            archive.extractall(temp_root)
        extracted_data = temp_root / "data"
        for directory_name in BACKUP_DIRS:
            source = extracted_data / directory_name
            target = settings.project_root / "data" / directory_name
            if target.resolve() == settings.backup_root.resolve():
                continue
            if directory_name == "logs":
                target.mkdir(parents=True, exist_ok=True)
                if source.exists():
                    shutil.copytree(source, target, dirs_exist_ok=True)
                continue
            if target.exists():
                shutil.rmtree(target)
            if source.exists():
                shutil.copytree(source, target)
            else:
                target.mkdir(parents=True, exist_ok=True)
    except Exception as exc:
        rollback_error = None
        try:
            _restore_backup_file(_backup_path(safety_backup), f"rollback-{backup_id}")
        except Exception as rollback_exc:
            rollback_error = str(rollback_exc)
        write_audit(
            "BACKUP_RESTORE",
            backup_id,
            item["fileName"],
            "FAILURE",
            "Backup restore failed; rollback attempted.",
            {"safetyBackupId": safety_backup["backupId"], "rollbackError": rollback_error},
        )
        raise AppError(f"백업 복원 중 오류가 발생했습니다: {exc}") from exc
    finally:
        if temp_root.exists():
            shutil.rmtree(temp_root)

    write_audit(
        "BACKUP_RESTORE",
        backup_id,
        item["fileName"],
        "SUCCESS",
        "백업 복원 완료",
        {"safetyBackupId": safety_backup["backupId"]},
    )
    return {"backup": item, "safetyBackup": safety_backup, "validation": validation}


def _restore_backup_file(backup_path: Path, label: str) -> None:
    temp_root = settings.project_root / "data" / "temp" / f"restore-{label}"
    if temp_root.exists():
        shutil.rmtree(temp_root)
    temp_root.mkdir(parents=True, exist_ok=True)

    try:
        with zipfile.ZipFile(backup_path, "r") as archive:
            archive.extractall(temp_root)
        extracted_data = temp_root / "data"
        for directory_name in BACKUP_DIRS:
            source = extracted_data / directory_name
            target = settings.project_root / "data" / directory_name
            if target.resolve() == settings.backup_root.resolve():
                continue
            if directory_name == "logs":
                target.mkdir(parents=True, exist_ok=True)
                if source.exists():
                    shutil.copytree(source, target, dirs_exist_ok=True)
                continue
            if target.exists():
                shutil.rmtree(target)
            if source.exists():
                shutil.copytree(source, target)
            else:
                target.mkdir(parents=True, exist_ok=True)
    finally:
        if temp_root.exists():
            shutil.rmtree(temp_root)


def _validate_backup_file(backup_path: Path, item: dict | None = None) -> dict:
    if not backup_path.exists():
        raise AppError("백업 파일을 찾을 수 없습니다.", status_code=404)
    try:
        with zipfile.ZipFile(backup_path, "r") as archive:
            names = archive.namelist()
            bad_file = archive.testzip()
    except zipfile.BadZipFile as exc:
        raise AppError("ZIP 백업 파일이 손상되었습니다.") from exc

    missing = [entry for entry in REQUIRED_ENTRIES if not any(name.startswith(entry) for name in names)]
    sha256 = _sha256_file(backup_path)
    expected_sha256 = item.get("sha256") if item else None
    hash_matches = expected_sha256 in (None, "", sha256)
    return {
        "valid": bad_file is None and not missing and hash_matches,
        "entryCount": len(names),
        "missing": missing,
        "badFile": bad_file,
        "sha256": sha256,
        "expectedSha256": expected_sha256,
        "hashMatches": hash_matches,
    }


def _preview_backup_file(backup_path: Path) -> dict:
    with zipfile.ZipFile(backup_path, "r") as archive:
        names = archive.namelist()
        return {
            "totalEntries": len(names),
            "storageFiles": _count_prefix(names, "data/storage/"),
            "indexFiles": _count_prefix(names, "data/index/"),
            "configFiles": _count_prefix(names, "data/config/"),
            "logFiles": _count_prefix(names, "data/logs/"),
            "trashFiles": _count_prefix(names, "data/trash/"),
            "documentCount": _count_json_items(archive, "data/index/document-index.json", "documents"),
            "folderCount": _count_json_items(archive, "data/index/folder-index.json", "folders"),
            "searchIndexCount": _count_json_items(archive, "data/index/search-index.json", "items"),
            "trashCount": _count_json_items(archive, "data/trash/trash-index.json", "items"),
        }


def _count_prefix(names: list[str], prefix: str) -> int:
    return sum(1 for name in names if name.startswith(prefix) and not name.endswith("/"))


def _count_json_items(archive: zipfile.ZipFile, name: str, key: str) -> int:
    try:
        with archive.open(name) as file:
            payload = json.loads(file.read().decode("utf-8"))
        value = payload.get(key, [])
        return len(value) if isinstance(value, list) else 0
    except Exception:
        return 0


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _find_backup(backup_id: str) -> dict:
    item = next((backup for backup in read_backup_items() if backup["backupId"] == backup_id), None)
    if not item:
        raise AppError("백업 이력을 찾을 수 없습니다.", status_code=404)
    return item


def _backup_path(item: dict) -> Path:
    return ensure_within_root(settings.project_root / item["backupPath"], settings.backup_root)


def _next_backup_id(items: list[dict]) -> str:
    numbers = []
    for item in items:
        try:
            numbers.append(int(str(item["backupId"]).split("-")[-1]))
        except (KeyError, ValueError):
            continue
    return f"backup-{(max(numbers) + 1 if numbers else 1):04d}"
