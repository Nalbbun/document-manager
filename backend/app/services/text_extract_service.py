from __future__ import annotations

from pathlib import Path

from app.core.logger import get_logger


logger = get_logger(__name__)


def extract_text(file_path: Path, extension: str) -> dict:
    extension = extension.lower()
    if extension == "pdf":
        return _extract_pdf_text(file_path)
    if extension in {"md", "txt"}:
        return _extract_text_lines(file_path)
    return {
        "locations": [],
        "pageCount": None,
        "lineCount": None,
        "searchable": False,
        "indexStatus": "UNSEARCHABLE",
        "error": "지원하지 않는 파일 형식입니다.",
    }


def _extract_pdf_text(file_path: Path) -> dict:
    try:
        from pypdf import PdfReader
    except ImportError:
        logger.exception("pypdf is not installed")
        return {
            "locations": [],
            "pageCount": None,
            "lineCount": None,
            "searchable": False,
            "indexStatus": "FAILED",
            "error": "pypdf 패키지가 설치되어 있지 않습니다.",
        }

    try:
        reader = PdfReader(str(file_path))
        if reader.is_encrypted:
            return {
                "locations": [],
                "pageCount": len(reader.pages),
                "lineCount": None,
                "searchable": False,
                "indexStatus": "UNSEARCHABLE",
                "error": "암호화된 PDF입니다.",
            }

        locations = []
        for page_index, page in enumerate(reader.pages, start=1):
            text = page.extract_text() or ""
            text = " ".join(text.split())
            if text:
                locations.append(
                    {
                        "locationType": "PAGE",
                        "pageNumber": page_index,
                        "lineNumber": None,
                        "text": text,
                    }
                )

        searchable = bool(locations)
        return {
            "locations": locations,
            "pageCount": len(reader.pages),
            "lineCount": None,
            "searchable": searchable,
            "indexStatus": "INDEXED" if searchable else "UNSEARCHABLE",
            "error": None if searchable else "추출 가능한 텍스트가 없습니다.",
        }
    except Exception as exc:
        logger.exception("PDF text extraction failed: %s", file_path)
        return {
            "locations": [],
            "pageCount": None,
            "lineCount": None,
            "searchable": False,
            "indexStatus": "FAILED",
            "error": str(exc),
        }


def _extract_text_lines(file_path: Path) -> dict:
    last_error: Exception | None = None
    for encoding in ("utf-8-sig", "utf-8", "cp949"):
        try:
            text = file_path.read_text(encoding=encoding)
            lines = text.splitlines()
            locations = [
                {
                    "locationType": "LINE",
                    "pageNumber": None,
                    "lineNumber": index,
                    "text": line.rstrip(),
                }
                for index, line in enumerate(lines, start=1)
                if line.strip()
            ]
            searchable = bool(locations)
            return {
                "locations": locations,
                "pageCount": None,
                "lineCount": len(lines),
                "searchable": searchable,
                "indexStatus": "INDEXED" if searchable else "UNSEARCHABLE",
                "error": None if searchable else "추출 가능한 텍스트가 없습니다.",
            }
        except UnicodeDecodeError as exc:
            last_error = exc
            continue

    return {
        "locations": [],
        "pageCount": None,
        "lineCount": None,
        "searchable": False,
        "indexStatus": "FAILED",
        "error": f"텍스트 인코딩을 해석할 수 없습니다: {last_error}",
    }

