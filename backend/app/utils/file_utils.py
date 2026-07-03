from __future__ import annotations

import mimetypes
import re
from pathlib import Path

from app.utils.exceptions import AppError


INVALID_PATH_CHARS = set('<>:"/\\|?*')
RESERVED_NAMES = {".", "..", "CON", "PRN", "AUX", "NUL"}


def normalize_extension(file_name: str) -> str:
    return Path(file_name).suffix.lower().lstrip(".")


def validate_folder_name(folder_name: str) -> str:
    name = folder_name.strip()
    if not name:
        raise AppError("폴더명을 입력하세요.")
    if len(name) > 80:
        raise AppError("폴더명은 80자 이하로 입력하세요.")
    if name.upper() in RESERVED_NAMES:
        raise AppError("사용할 수 없는 폴더명입니다.")
    if any(char in INVALID_PATH_CHARS or ord(char) < 32 for char in name):
        raise AppError("폴더명에 사용할 수 없는 문자가 포함되어 있습니다.")
    return name


def safe_file_name(file_name: str) -> str:
    name = Path(file_name).name.strip()
    name = re.sub(r"[\x00-\x1f]", "", name)
    for char in INVALID_PATH_CHARS:
        name = name.replace(char, "_")
    if not name or name in {".", ".."}:
        raise AppError("파일명이 올바르지 않습니다.")
    return name


def ensure_within_root(path: Path, root: Path) -> Path:
    resolved_path = path.resolve()
    resolved_root = root.resolve()
    try:
        resolved_path.relative_to(resolved_root)
    except ValueError as exc:
        raise AppError("허용된 저장 경로 밖에는 접근할 수 없습니다.", status_code=403) from exc
    return resolved_path


def relative_to_project(path: Path, project_root: Path) -> str:
    try:
        return path.resolve().relative_to(project_root.resolve()).as_posix()
    except ValueError:
        return path.resolve().as_posix()


def guess_mime_type(file_name: str) -> str:
    mime_type, _ = mimetypes.guess_type(file_name)
    return mime_type or "application/octet-stream"

