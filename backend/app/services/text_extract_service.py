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
    if extension == "hwpx":
        return _extract_hwpx_text(file_path)
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


def _extract_hwpx_text(file_path: Path) -> dict:
    try:
        locations = []
        with zipfile.ZipFile(file_path, "r") as archive:
            section_names = sorted(
                (name for name in archive.namelist() if _is_hwpx_section_xml(name)),
                key=_hwpx_section_sort_key,
            )
            for section_index, section_name in enumerate(section_names, start=1):
                root = ElementTree.fromstring(archive.read(section_name))
                paragraph_texts = _hwpx_paragraph_texts(root)
                if not paragraph_texts:
                    section_text = _normalize_hwpx_text(_collect_hwpx_text(root))
                    paragraph_texts = [section_text] if section_text else []

                for text in paragraph_texts:
                    locations.append(
                        {
                            "locationType": "SECTION",
                            "pageNumber": section_index,
                            "lineNumber": len(locations) + 1,
                            "text": text,
                        }
                    )

        searchable = bool(locations)
        return {
            "locations": locations,
            "pageCount": len(section_names),
            "lineCount": len(locations),
            "searchable": searchable,
            "indexStatus": "INDEXED" if searchable else "UNSEARCHABLE",
            "error": None if searchable else "No extractable HWPX text.",
        }
    except Exception as exc:
        logger.exception("HWPX text extraction failed: %s", file_path)
        return {
            "locations": [],
            "pageCount": None,
            "lineCount": None,
            "searchable": False,
            "indexStatus": "FAILED",
            "error": str(exc),
        }


def _is_hwpx_section_xml(name: str) -> bool:
    normalized = name.replace("\\", "/").lower()
    return normalized.startswith("contents/") and re.search(r"(^|/)section\d+\.xml$", normalized) is not None


def _hwpx_section_sort_key(name: str) -> int:
    match = re.search(r"section(\d+)\.xml$", name.replace("\\", "/").lower())
    return int(match.group(1)) if match else 0


def _hwpx_paragraph_texts(root: ElementTree.Element) -> list[str]:
    texts = []
    for node in root.iter():
        if _xml_local_name(node.tag) != "p":
            continue
        text = _normalize_hwpx_text(_collect_hwpx_text(node))
        if text:
            texts.append(text)
    return texts


def _collect_hwpx_text(root: ElementTree.Element) -> str:
    parts: list[str] = []
    for node in root.iter():
        local_name = _xml_local_name(node.tag)
        if local_name == "t" and node.text:
            parts.append(node.text)
        elif local_name in {"lineBreak", "br", "tab"}:
            parts.append(" ")
    return "".join(parts)


def _normalize_hwpx_text(text: str) -> str:
    return " ".join(text.split())


def _xml_local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]
