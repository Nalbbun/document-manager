from __future__ import annotations

import shutil
import hashlib
from pathlib import Path

from fastapi.responses import FileResponse

from app.core.config import settings
from app.core.logger import now_iso, write_audit
from app.repositories.document_repository import read_documents, write_documents
from app.repositories.folder_repository import read_folders, write_folders
from app.repositories.search_index_repository import read_items, write_items
from app.repositories.trash_repository import read_trash_items, write_trash_items
from app.services.text_extract_service import extract_text
from app.utils.exceptions import AppError
from app.utils.file_utils import ensure_within_root, relative_to_project, safe_file_name


def list_documents(
    folder_id: str | None = None,
    extension: str | None = None,
    keyword: str | None = None,
    tag: str | None = None,
    favorite: bool | None = None,
    pinned: bool | None = None,
    sort: str = "createdAt",
    order: str = "desc",
) -> list[dict]:
    documents = read_documents()
    if folder_id:
        documents = [document for document in documents if document["folderId"] == folder_id]
    if extension:
        documents = [document for document in documents if document["extension"] == extension.lower()]
    if tag:
        tag_needle = tag.lower()
        documents = [
            document
            for document in documents
            if any(str(item).lower() == tag_needle for item in document.get("tags", []))
        ]
    if favorite is not None:
        documents = [document for document in documents if bool(document.get("favorite")) == favorite]
    if pinned is not None:
        documents = [document for document in documents if bool(document.get("pinned")) == pinned]
    if keyword:
        needle = keyword.lower()
        documents = [
            document
            for document in documents
            if needle in document["displayName"].lower()
            or needle in document["fileName"].lower()
            or needle in str(document.get("memo", "")).lower()
            or any(needle in str(item).lower() for item in document.get("tags", []))
        ]

    reverse = order.lower() != "asc"
    if sort in {"displayName", "fileSize", "createdAt", "updatedAt", "extension", "folderName", "favorite", "pinned"}:
        documents.sort(key=lambda document: document.get(sort) or "", reverse=reverse)
    return documents


def get_document(document_id: str) -> dict:
    for document in read_documents():
        if document["documentId"] == document_id:
            return document
    raise AppError("문서를 찾을 수 없습니다.", status_code=404)


def move_document(document_id: str, folder_id: str) -> dict:
    documents = read_documents()
    document = _find_document(documents, document_id)
    target_folder = _get_folder(folder_id)

    if document["folderId"] == folder_id:
        return document

    source_path = _document_file_path(document)
    if not source_path.exists():
        raise AppError("원본 파일을 찾을 수 없습니다.", status_code=404)

    target_folder_path = ensure_within_root(settings.project_root / target_folder["folderPath"], settings.storage_root)
    target_folder_path.mkdir(parents=True, exist_ok=True)
    target_path = ensure_within_root(target_folder_path / document["fileName"], settings.storage_root)

    if _duplicate_file_exists(documents, folder_id, document["fileName"], exclude_document_id=document_id) or target_path.exists():
        raise AppError("이동 대상 폴더에 같은 파일명이 이미 있습니다.")

    before = {"folderId": document["folderId"], "folderName": document["folderName"], "filePath": document["filePath"]}
    shutil.move(str(source_path), str(target_path))

    document["folderId"] = target_folder["folderId"]
    document["folderName"] = target_folder["folderName"]
    document["filePath"] = relative_to_project(target_path, settings.project_root)
    document["updatedAt"] = now_iso()
    write_documents(documents)
    _update_search_index_document(document)
    _refresh_folder_counts()
    write_audit("DOCUMENT_MOVE", document_id, document["fileName"], "SUCCESS", "문서 이동 완료", {"before": before, "after": document})
    return document


def rename_document(document_id: str, file_name: str) -> dict:
    documents = read_documents()
    document = _find_document(documents, document_id)
    source_path = _document_file_path(document)
    if not source_path.exists():
        raise AppError("원본 파일을 찾을 수 없습니다.", status_code=404)

    new_file_name = _build_renamed_file_name(file_name, document["extension"])
    if new_file_name == document["fileName"]:
        return document
    if _duplicate_file_exists(documents, document["folderId"], new_file_name, exclude_document_id=document_id):
        raise AppError("같은 폴더에 동일한 파일명이 이미 있습니다.")

    target_path = ensure_within_root(source_path.with_name(new_file_name), settings.storage_root)
    if target_path.exists():
        raise AppError("저장 경로에 같은 파일명이 이미 존재합니다.")

    before = {"fileName": document["fileName"], "filePath": document["filePath"]}
    shutil.move(str(source_path), str(target_path))

    document["fileName"] = new_file_name
    document["displayName"] = new_file_name
    document["filePath"] = relative_to_project(target_path, settings.project_root)
    document["updatedAt"] = now_iso()
    write_documents(documents)
    _update_search_index_document(document)
    write_audit("DOCUMENT_RENAME", document_id, new_file_name, "SUCCESS", "문서명 변경 완료", {"before": before, "after": document})
    return document


def update_document_metadata(
    document_id: str,
    tags: list[str] | None = None,
    favorite: bool | None = None,
    pinned: bool | None = None,
    memo: str | None = None,
) -> dict:
    documents = read_documents()
    document = _find_document(documents, document_id)
    before = {
        "tags": list(document.get("tags", [])),
        "favorite": bool(document.get("favorite")),
        "pinned": bool(document.get("pinned")),
        "memo": document.get("memo", ""),
    }

    if tags is not None:
        document["tags"] = _normalize_tags(tags)
    if favorite is not None:
        document["favorite"] = favorite
    if pinned is not None:
        document["pinned"] = pinned
    if memo is not None:
        document["memo"] = memo.strip()

    document["updatedAt"] = now_iso()
    write_documents(documents)
    _update_search_index_document(document)
    write_audit(
        "DOCUMENT_METADATA_UPDATE",
        document_id,
        document["fileName"],
        "SUCCESS",
        "문서 분류 정보가 수정되었습니다.",
        {"before": before, "after": document},
    )
    return document


def bulk_update_document_tags(document_ids: list[str], tags: list[str], mode: str = "add") -> dict:
    documents = read_documents()
    normalized_tags = _normalize_tags(tags)
    succeeded: list[dict] = []
    failed: list[dict] = []

    for document_id in document_ids:
        try:
            document = _find_document(documents, document_id)
            current_tags = _normalize_tags(document.get("tags", []))
            if mode == "replace":
                next_tags = normalized_tags
            elif mode == "remove":
                remove_set = {tag.lower() for tag in normalized_tags}
                next_tags = [tag for tag in current_tags if tag.lower() not in remove_set]
            else:
                next_tags = _normalize_tags([*current_tags, *normalized_tags])
            document["tags"] = next_tags
            document["updatedAt"] = now_iso()
            succeeded.append(document)
        except AppError as exc:
            failed.append({"documentId": document_id, "reason": exc.message})
        except Exception as exc:
            failed.append({"documentId": document_id, "reason": str(exc)})

    write_documents(documents)
    for document in succeeded:
        _update_search_index_document(document)
    write_audit(
        "DOCUMENT_TAG_BULK_UPDATE",
        None,
        None,
        "SUCCESS" if not failed else "PARTIAL",
        "문서 태그 일괄 처리가 완료되었습니다.",
        {"mode": mode, "successCount": len(succeeded), "failCount": len(failed), "tags": normalized_tags},
    )
    return {"successCount": len(succeeded), "failCount": len(failed), "succeeded": succeeded, "failed": failed}


def list_tags() -> list[dict]:
    counts: dict[str, int] = {}
    labels: dict[str, str] = {}
    for document in read_documents():
        for tag in document.get("tags", []):
            key = str(tag).lower()
            counts[key] = counts.get(key, 0) + 1
            labels.setdefault(key, str(tag))
    return [
        {"tag": labels[key], "count": counts[key]}
        for key in sorted(counts, key=lambda item: (-counts[item], labels[item].lower()))
    ]


def list_duplicate_documents() -> list[dict]:
    documents = read_documents()
    changed = _populate_missing_file_hashes(documents)
    if changed:
        write_documents(documents)

    groups: dict[str, list[dict]] = {}
    for document in documents:
        file_hash = document.get("fileHash")
        if not file_hash:
            continue
        groups.setdefault(file_hash, []).append(document)

    duplicates = [
        {"fileHash": file_hash, "count": len(items), "documents": items}
        for file_hash, items in groups.items()
        if len(items) > 1
    ]
    duplicates.sort(key=lambda item: item["count"], reverse=True)
    return duplicates


def bulk_move_documents(document_ids: list[str], folder_id: str) -> dict:
    succeeded: list[dict] = []
    failed: list[dict] = []
    for document_id in document_ids:
        try:
            succeeded.append(move_document(document_id, folder_id))
        except AppError as exc:
            failed.append({"documentId": document_id, "reason": exc.message})
        except Exception as exc:
            failed.append({"documentId": document_id, "reason": str(exc)})
    return {"successCount": len(succeeded), "failCount": len(failed), "succeeded": succeeded, "failed": failed}


def bulk_delete_documents(document_ids: list[str]) -> dict:
    succeeded: list[dict] = []
    failed: list[dict] = []
    for document_id in document_ids:
        try:
            succeeded.append(delete_document(document_id))
        except AppError as exc:
            failed.append({"documentId": document_id, "reason": exc.message})
        except Exception as exc:
            failed.append({"documentId": document_id, "reason": str(exc)})
    return {"successCount": len(succeeded), "failCount": len(failed), "succeeded": succeeded, "failed": failed}


def delete_document(document_id: str) -> dict:
    documents = read_documents()
    target = _find_document(documents, document_id)
    file_path = _document_file_path(target)
    if not file_path.exists():
        raise AppError("원본 파일을 찾을 수 없습니다.", status_code=404)

    trash_items = read_trash_items()
    trash_id = _next_trash_id(trash_items)
    trash_path = _trash_file_path(trash_id, target["fileName"])
    trash_path.parent.mkdir(parents=True, exist_ok=True)

    shutil.move(str(file_path), str(trash_path))
    documents = [document for document in documents if document["documentId"] != document_id]
    write_documents(documents)
    write_items([item for item in read_items() if item["documentId"] != document_id])

    timestamp = now_iso()
    trash_item = {
        "trashId": trash_id,
        "documentId": target["documentId"],
        "fileName": target["fileName"],
        "originalFolderId": target["folderId"],
        "originalFolderName": target["folderName"],
        "originalPath": target["filePath"],
        "trashPath": relative_to_project(trash_path, settings.project_root),
        "deletedAt": timestamp,
        "deletedReason": "USER_DELETE",
        "document": target,
    }
    trash_items.append(trash_item)
    write_trash_items(trash_items)
    _refresh_folder_counts()
    write_audit("DOCUMENT_TRASH", document_id, target["fileName"], "SUCCESS", "문서 휴지통 이동 완료", trash_item)
    return trash_item


def list_trash_items() -> list[dict]:
    items = read_trash_items()
    items.sort(key=lambda item: item.get("deletedAt") or "", reverse=True)
    return items


def restore_trash_item(trash_id: str, folder_id: str | None = None, conflict_policy: str | None = None) -> dict:
    trash_items = read_trash_items()
    trash_item = _find_trash_item(trash_items, trash_id)
    document = dict(trash_item["document"])
    target_folder = _get_folder(folder_id or trash_item["originalFolderId"])
    policy = conflict_policy or str(settings.runtime_config.get("duplicatePolicy", "block"))
    if policy not in {"block", "auto_rename", "select_folder"}:
        policy = "block"

    documents = read_documents()
    if any(item["documentId"] == document["documentId"] for item in documents):
        raise AppError("같은 문서 ID가 이미 문서 목록에 있습니다.")
    if policy != "auto_rename" and _duplicate_file_exists(documents, target_folder["folderId"], document["fileName"]):
        raise AppError("복원 대상 폴더에 같은 파일명이 이미 있습니다.")

    trash_path = ensure_within_root(settings.project_root / trash_item["trashPath"], settings.trash_root)
    if not trash_path.exists():
        raise AppError("휴지통 파일을 찾을 수 없습니다.", status_code=404)

    target_folder_path = ensure_within_root(settings.project_root / target_folder["folderPath"], settings.storage_root)
    target_folder_path.mkdir(parents=True, exist_ok=True)
    file_name = document["fileName"]
    target_path = ensure_within_root(target_folder_path / file_name, settings.storage_root)
    has_conflict = _duplicate_file_exists(documents, target_folder["folderId"], file_name) or target_path.exists()
    if has_conflict and policy == "auto_rename":
        file_name = _available_restore_file_name(file_name, target_folder_path, documents, target_folder["folderId"])
        target_path = ensure_within_root(target_folder_path / file_name, settings.storage_root)
    if target_path.exists():
        raise AppError("복원 대상 경로에 같은 파일이 이미 있습니다.")

    shutil.move(str(trash_path), str(target_path))
    extraction = extract_text(target_path, document["extension"])
    timestamp = now_iso()
    document["folderId"] = target_folder["folderId"]
    document["folderName"] = target_folder["folderName"]
    document["fileName"] = file_name
    document["displayName"] = file_name
    document["filePath"] = relative_to_project(target_path, settings.project_root)
    document["fileSize"] = target_path.stat().st_size
    document["pageCount"] = extraction["pageCount"]
    document["lineCount"] = extraction["lineCount"]
    document["searchable"] = extraction["searchable"]
    document["indexStatus"] = extraction["indexStatus"]
    document["indexError"] = extraction["error"]
    document["updatedAt"] = timestamp

    documents.append(document)
    write_documents(documents)
    items = read_items()
    items.append(_search_item(document, extraction["locations"]))
    write_items(items)
    write_trash_items([item for item in trash_items if item["trashId"] != trash_id])
    _refresh_folder_counts()
    write_audit("DOCUMENT_RESTORE", document["documentId"], document["fileName"], "SUCCESS", "문서 복원 완료")
    return document


def permanently_delete_trash_item(trash_id: str) -> dict:
    trash_items = read_trash_items()
    trash_item = _find_trash_item(trash_items, trash_id)
    trash_path = ensure_within_root(settings.project_root / trash_item["trashPath"], settings.trash_root)
    if trash_path.exists():
        trash_path.unlink()
    write_trash_items([item for item in trash_items if item["trashId"] != trash_id])
    write_audit("TRASH_DELETE_PERMANENT", trash_item["documentId"], trash_item["fileName"], "SUCCESS", "휴지통 문서 영구 삭제 완료")
    return trash_item


def empty_trash() -> dict:
    trash_items = read_trash_items()
    deleted: list[dict] = []
    failed: list[dict] = []
    for item in trash_items:
        try:
            deleted.append(permanently_delete_trash_item(item["trashId"]))
        except AppError as exc:
            failed.append({"trashId": item["trashId"], "reason": exc.message})
        except Exception as exc:
            failed.append({"trashId": item["trashId"], "reason": str(exc)})
    return {"successCount": len(deleted), "failCount": len(failed), "succeeded": deleted, "failed": failed}


def get_file_response(document_id: str) -> FileResponse:
    document = get_document(document_id)
    file_path = _document_file_path(document)
    if not file_path.exists():
        raise AppError("원본 파일을 찾을 수 없습니다.", status_code=404)
    return FileResponse(
        path=file_path,
        media_type=document["mimeType"],
        filename=document["fileName"],
        content_disposition_type="inline",
    )


def get_preview(document_id: str) -> dict:
    document = get_document(document_id)
    file_path = _document_file_path(document)
    if not file_path.exists():
        raise AppError("원본 파일을 찾을 수 없습니다.", status_code=404)

    if document["extension"] == "pdf":
        return {
            "document": document,
            "viewerType": "pdf",
            "fileUrl": f"/api/documents/{document_id}/file",
            "lines": [],
        }

    if document["extension"] in {"pptx", "hwpx"}:
        extraction = extract_text(file_path, document["extension"])
        return {
            "document": document,
            "viewerType": "text",
            "fileUrl": f"/api/documents/{document_id}/file",
            "lines": [
                {
                    "lineNumber": location.get("lineNumber") or index,
                    "text": _structured_preview_text(location),
                }
                for index, location in enumerate(extraction["locations"], start=1)
            ],
        }

    text = _read_text_file(file_path)
    return {
        "document": document,
        "viewerType": "text",
        "fileUrl": f"/api/documents/{document_id}/file",
        "lines": [{"lineNumber": index, "text": line} for index, line in enumerate(text.splitlines(), start=1)],
    }


def _read_text_file(file_path: Path) -> str:
    for encoding in ("utf-8-sig", "utf-8", "cp949"):
        try:
            return file_path.read_text(encoding=encoding)
        except UnicodeDecodeError:
            continue
    return file_path.read_text(encoding="utf-8", errors="replace")


def _structured_preview_text(location: dict) -> str:
    text = location.get("text", "")
    if location.get("locationType") == "SLIDE":
        slide = location.get("pageNumber") or location.get("lineNumber")
        return f"Slide {slide}: {text}" if slide else text
    if location.get("locationType") == "SECTION":
        section = location.get("pageNumber")
        return f"Section {section}: {text}" if section else text
    return text


def _find_document(documents: list[dict], document_id: str) -> dict:
    target = next((document for document in documents if document["documentId"] == document_id), None)
    if not target:
        raise AppError("문서를 찾을 수 없습니다.", status_code=404)
    return target


def _find_trash_item(items: list[dict], trash_id: str) -> dict:
    target = next((item for item in items if item["trashId"] == trash_id), None)
    if not target:
        raise AppError("휴지통 문서를 찾을 수 없습니다.", status_code=404)
    return target


def _get_folder(folder_id: str) -> dict:
    folder = next((item for item in read_folders() if item["folderId"] == folder_id), None)
    if not folder:
        raise AppError("폴더를 찾을 수 없습니다.", status_code=404)
    return folder


def _document_file_path(document: dict) -> Path:
    return ensure_within_root(settings.project_root / document["filePath"], settings.storage_root)


def _duplicate_file_exists(
    documents: list[dict],
    folder_id: str,
    file_name: str,
    exclude_document_id: str | None = None,
) -> bool:
    return any(
        document["folderId"] == folder_id
        and document["fileName"].lower() == file_name.lower()
        and document["documentId"] != exclude_document_id
        for document in documents
    )


def _build_renamed_file_name(file_name: str, extension: str) -> str:
    candidate = safe_file_name(file_name)
    path = Path(candidate)
    stem = path.stem if path.suffix else candidate
    stem = stem.strip()
    if not stem:
        raise AppError("파일명을 입력하세요.")
    return f"{stem}.{extension}"


def _available_restore_file_name(file_name: str, folder_path: Path, documents: list[dict], folder_id: str) -> str:
    candidate = safe_file_name(file_name)
    path = Path(candidate)
    stem = path.stem or candidate
    suffix = path.suffix
    for index in range(1, 1000):
        next_name = f"{stem}_restored{index if index > 1 else ''}{suffix}"
        if _duplicate_file_exists(documents, folder_id, next_name):
            continue
        if (folder_path / next_name).exists():
            continue
        return next_name
    raise AppError("Could not build a unique restore file name.")


def _update_search_index_document(document: dict) -> None:
    items = read_items()
    for item in items:
        if item["documentId"] == document["documentId"]:
            item["folderId"] = document["folderId"]
            item["folderName"] = document["folderName"]
            item["fileName"] = document["fileName"]
            item["extension"] = document["extension"]
            item["filePath"] = document["filePath"]
            item["tags"] = document.get("tags", [])
            item["favorite"] = bool(document.get("favorite"))
            item["pinned"] = bool(document.get("pinned"))
    write_items(items)


def _search_item(document: dict, locations: list[dict]) -> dict:
    return {
        "documentId": document["documentId"],
        "folderId": document["folderId"],
        "folderName": document["folderName"],
        "fileName": document["fileName"],
        "extension": document["extension"],
        "filePath": document["filePath"],
        "tags": document.get("tags", []),
        "favorite": bool(document.get("favorite")),
        "pinned": bool(document.get("pinned")),
        "locations": locations,
    }


def _next_trash_id(items: list[dict]) -> str:
    numbers = []
    for item in items:
        try:
            numbers.append(int(str(item["trashId"]).split("-")[-1]))
        except (KeyError, ValueError):
            continue
    return f"trash-{(max(numbers) + 1 if numbers else 1):04d}"


def _trash_file_path(trash_id: str, file_name: str) -> Path:
    safe_name = safe_file_name(file_name)
    return ensure_within_root(settings.trash_root / "documents" / f"{trash_id}_{safe_name}", settings.trash_root)


def _normalize_tags(tags: list[str]) -> list[str]:
    normalized: list[str] = []
    seen: set[str] = set()
    for tag in tags:
        value = str(tag).strip()
        if not value:
            continue
        value = value[:40]
        key = value.lower()
        if key in seen:
            continue
        normalized.append(value)
        seen.add(key)
    return normalized[:20]


def _populate_missing_file_hashes(documents: list[dict]) -> bool:
    changed = False
    for document in documents:
        if document.get("fileHash"):
            continue
        try:
            file_path = _document_file_path(document)
            if not file_path.exists():
                continue
            document["fileHash"] = hashlib.sha256(file_path.read_bytes()).hexdigest()
            document["updatedAt"] = now_iso()
            changed = True
        except Exception:
            continue
    return changed


def _refresh_folder_counts() -> None:
    folders = read_folders()
    documents = read_documents()
    timestamp = now_iso()
    for folder in folders:
        folder["documentCount"] = sum(1 for document in documents if document["folderId"] == folder["folderId"])
        folder["updatedAt"] = timestamp
    write_folders(folders)
