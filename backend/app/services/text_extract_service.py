from __future__ import annotations

import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree

from app.core.logger import get_logger


logger = get_logger(__name__)


def extract_text(file_path: Path, extension: str) -> dict:
    extension = extension.lower()
    if extension == "pdf":
        return _extract_pdf_text(file_path)
    if extension in {"md", "txt"}:
        return _extract_text_lines(file_path)
    if extension == "pptx":
        return _extract_pptx_text(file_path)
    return {
        "locations": [],
        "pageCount": None,
        "lineCount": None,
        "searchable": False,
        "indexStatus": "UNSEARCHABLE",
        "error": "Unsupported file format.",
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
            "error": "pypdf is not installed.",
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
                "error": "Encrypted PDF.",
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
            "error": None if searchable else "No extractable text.",
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
                "error": None if searchable else "No extractable text.",
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
        "error": f"Could not decode text: {last_error}",
    }


def _extract_pptx_text(file_path: Path) -> dict:
    try:
        locations = []
        with zipfile.ZipFile(file_path, "r") as archive:
            slide_names = sorted(
                (name for name in archive.namelist() if name.startswith("ppt/slides/slide") and name.endswith(".xml")),
                key=_slide_sort_key,
            )
            for slide_index, slide_name in enumerate(slide_names, start=1):
                root = ElementTree.fromstring(archive.read(slide_name))
                texts = [
                    node.text.strip()
                    for node in root.iter()
                    if node.tag.endswith("}t") and node.text and node.text.strip()
                ]
                text = " ".join(" ".join(texts).split())
                if text:
                    locations.append(
                        {
                            "locationType": "SLIDE",
                            "pageNumber": slide_index,
                            "lineNumber": slide_index,
                            "text": text,
                        }
                    )
        searchable = bool(locations)
        return {
            "locations": locations,
            "pageCount": len(slide_names),
            "lineCount": len(locations),
            "searchable": searchable,
            "indexStatus": "INDEXED" if searchable else "UNSEARCHABLE",
            "error": None if searchable else "No extractable slide text.",
        }
    except Exception as exc:
        logger.exception("PPTX text extraction failed: %s", file_path)
        return {
            "locations": [],
            "pageCount": None,
            "lineCount": None,
            "searchable": False,
            "indexStatus": "FAILED",
            "error": str(exc),
        }


def _slide_sort_key(name: str) -> int:
    match = re.search(r"slide(\d+)\.xml$", name)
    return int(match.group(1)) if match else 0
