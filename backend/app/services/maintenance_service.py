from __future__ import annotations

import hashlib

from app.core.config import settings
from app.core.logger import now_iso, write_audit
from app.repositories.document_repository import read_documents, write_documents
from app.repositories.folder_repository import read_folders, write_folders
from app.repositories.search_index_repository import read_items, write_items
from app.repositories.trash_repository import read_trash_items, write_trash_items
from app.services.backup_service import create_backup
from app.services.text_extract_service import extract_text
from app.utils.file_utils import ensure_within_root, relative_to_project


def check_integrity() -> dict:
    documents = read_documents()
    folders = read_folders()
    search_items = read_items()
    trash_items = read_trash_items()

    document_ids = {document["documentId"] for document in documents}
    document_paths = {document["filePath"] for document in documents}
    search_document_ids = {item["documentId"] for item in search_items}
    trash_paths = {item["trashPath"] for item in trash_items}

    issues: list[dict] = []

    for document in documents:
        file_path = ensure_within_root(settings.project_root / document["filePath"], settings.storage_root)
        if not file_path.exists():
            issues.append(_issue("MISSING_FILE", "문서 메타정보는 있으나 실제 파일이 없습니다.", "repairable", document))
        elif not document.get("fileHash"):
            issues.append(_issue("MISSING_FILE_HASH", "문서 파일 해시가 비어 있습니다.", "repairable", document))
        if document.get("searchable") and document["documentId"] not in search_document_ids:
            issues.append(_issue("MISSING_SEARCH_INDEX", "검색 가능한 문서이나 검색 인덱스가 없습니다.", "repairable", document))

    for item in search_items:
        if item["documentId"] not in document_ids:
            issues.append(_issue("ORPHAN_SEARCH_INDEX", "문서 메타정보가 없는 검색 인덱스 항목입니다.", "repairable", item))

    for folder in folders:
        actual_count = sum(1 for document in documents if document["folderId"] == folder["folderId"])
        if folder.get("documentCount") != actual_count:
            issues.append(
                {
                    "type": "FOLDER_COUNT_MISMATCH",
                    "severity": "warning",
                    "message": "폴더 문서 수가 실제 문서 수와 다릅니다.",
                    "repair": "repairable",
                    "targetId": folder["folderId"],
                    "targetName": folder["folderName"],
                    "details": {"storedCount": folder.get("documentCount"), "actualCount": actual_count},
                }
            )

    if settings.storage_root.exists():
        for file_path in settings.storage_root.rglob("*"):
            if not file_path.is_file() or file_path.name == ".gitkeep":
                continue
            relative_path = relative_to_project(file_path, settings.project_root)
            if relative_path not in document_paths:
                issues.append(
                    {
                        "type": "UNREGISTERED_FILE",
                        "severity": "info",
                        "message": "실제 파일은 있으나 문서 메타정보에 등록되지 않았습니다.",
                        "repair": "manual",
                        "targetId": relative_path,
                        "targetName": file_path.name,
                        "details": {"filePath": relative_path},
                    }
                )

    for item in trash_items:
        trash_path = ensure_within_root(settings.project_root / item["trashPath"], settings.trash_root)
        if not trash_path.exists():
            issues.append(
                {
                    "type": "MISSING_TRASH_FILE",
                    "severity": "warning",
                    "message": "휴지통 메타정보는 있으나 실제 휴지통 파일이 없습니다.",
                    "repair": "repairable",
                    "targetId": item["trashId"],
                    "targetName": item["fileName"],
                    "details": {"trashPath": item["trashPath"]},
                }
            )

    trash_documents_root = settings.trash_root / "documents"
    if trash_documents_root.exists():
        for file_path in trash_documents_root.rglob("*"):
            if not file_path.is_file() or file_path.name == ".gitkeep":
                continue
            relative_path = relative_to_project(file_path, settings.project_root)
            if relative_path not in trash_paths:
                issues.append(
                    {
                        "type": "ORPHAN_TRASH_FILE",
                        "severity": "info",
                        "message": "휴지통 파일은 있으나 휴지통 메타정보가 없습니다.",
                        "repair": "manual",
                        "targetId": relative_path,
                        "targetName": file_path.name,
                        "details": {"trashPath": relative_path},
                    }
                )

    summary = _summary(issues)
    return {"checkedAt": now_iso(), "summary": summary, "issues": issues}


def repair_integrity() -> dict:
    before = check_integrity()
    safety_backup = create_backup(reason="PRE_REPAIR")
    documents = read_documents()
    search_items = read_items()
    trash_items = read_trash_items()
    actions: list[dict] = []

    changed_documents = False
    changed_search = False

    for document in documents:
        file_path = ensure_within_root(settings.project_root / document["filePath"], settings.storage_root)
        if not file_path.exists():
            document["searchable"] = False
            document["indexStatus"] = "FAILED"
            document["indexError"] = "원본 파일을 찾을 수 없습니다."
            document["updatedAt"] = now_iso()
            search_items = [item for item in search_items if item["documentId"] != document["documentId"]]
            changed_documents = True
            changed_search = True
            actions.append(_action("MARK_MISSING_FILE_FAILED", document["documentId"], document["displayName"]))
            continue

        if not document.get("fileHash"):
            document["fileHash"] = hashlib.sha256(file_path.read_bytes()).hexdigest()
            document["updatedAt"] = now_iso()
            changed_documents = True
            actions.append(_action("REBUILD_FILE_HASH", document["documentId"], document["displayName"]))

        has_search = any(item["documentId"] == document["documentId"] for item in search_items)
        if document.get("searchable") and not has_search:
            extraction = extract_text(file_path, document["extension"])
            document["pageCount"] = extraction["pageCount"]
            document["lineCount"] = extraction["lineCount"]
            document["searchable"] = extraction["searchable"]
            document["indexStatus"] = extraction["indexStatus"]
            document["indexError"] = extraction["error"]
            document["updatedAt"] = now_iso()
            search_items.append(
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
            changed_documents = True
            changed_search = True
            actions.append(_action("REBUILD_MISSING_SEARCH_INDEX", document["documentId"], document["displayName"]))

    document_ids = {document["documentId"] for document in documents}
    filtered_items = [item for item in search_items if item["documentId"] in document_ids]
    if len(filtered_items) != len(search_items):
        actions.append(_action("REMOVE_ORPHAN_SEARCH_INDEX", None, "문서 없는 검색 인덱스 정리"))
        search_items = filtered_items
        changed_search = True

    filtered_trash_items = []
    for item in trash_items:
        trash_path = ensure_within_root(settings.project_root / item["trashPath"], settings.trash_root)
        if trash_path.exists():
            filtered_trash_items.append(item)
        else:
            actions.append(_action("REMOVE_MISSING_TRASH_METADATA", item["trashId"], item["fileName"]))
    if len(filtered_trash_items) != len(trash_items):
        write_trash_items(filtered_trash_items)

    if changed_documents:
        write_documents(documents)
    if changed_search:
        write_items(search_items)

    folder_actions = _repair_folder_counts(documents)
    actions.extend(folder_actions)

    after = check_integrity()
    write_audit(
        "INTEGRITY_REPAIR",
        None,
        None,
        "SUCCESS",
        "데이터 정합성 자동 복구 완료",
        {"actions": len(actions), "safetyBackupId": safety_backup["backupId"]},
    )
    return {"before": before, "after": after, "actions": actions, "safetyBackup": safety_backup}


def _repair_folder_counts(documents: list[dict]) -> list[dict]:
    folders = read_folders()
    actions: list[dict] = []
    changed = False
    timestamp = now_iso()
    for folder in folders:
        actual_count = sum(1 for document in documents if document["folderId"] == folder["folderId"])
        if folder.get("documentCount") != actual_count:
            folder["documentCount"] = actual_count
            folder["updatedAt"] = timestamp
            changed = True
            actions.append(_action("RECALCULATE_FOLDER_COUNT", folder["folderId"], folder["folderName"]))
    if changed:
        write_folders(folders)
    return actions


def _issue(issue_type: str, message: str, repair: str, target: dict) -> dict:
    return {
        "type": issue_type,
        "severity": "warning",
        "message": message,
        "repair": repair,
        "targetId": target.get("documentId"),
        "targetName": target.get("displayName") or target.get("fileName"),
        "details": target,
    }


def _action(action_type: str, target_id: str | None, target_name: str) -> dict:
    return {"type": action_type, "targetId": target_id, "targetName": target_name, "completedAt": now_iso()}


def _summary(issues: list[dict]) -> dict:
    by_type: dict[str, int] = {}
    repairable = 0
    manual = 0
    for issue in issues:
        by_type[issue["type"]] = by_type.get(issue["type"], 0) + 1
        if issue["repair"] == "repairable":
            repairable += 1
        else:
            manual += 1
    return {"totalIssues": len(issues), "repairable": repairable, "manual": manual, "byType": by_type}
