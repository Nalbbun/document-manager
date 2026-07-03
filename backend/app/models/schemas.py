from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class FolderCreate(BaseModel):
    folderName: str = Field(min_length=1, max_length=80)


class FolderUpdate(BaseModel):
    folderName: str = Field(min_length=1, max_length=80)


class ImportFolderRequest(BaseModel):
    folderId: str
    sourcePath: str
    recursive: bool = True


class DocumentMoveRequest(BaseModel):
    folderId: str


class DocumentRenameRequest(BaseModel):
    fileName: str = Field(min_length=1, max_length=180)


class BulkDocumentMoveRequest(BaseModel):
    documentIds: list[str] = Field(min_length=1)
    folderId: str


class BulkDocumentRequest(BaseModel):
    documentIds: list[str] = Field(min_length=1)


class TrashRestoreRequest(BaseModel):
    folderId: str | None = None


class SearchQuery(BaseModel):
    keyword: str
    scope: Literal["all", "folder", "document"] = "all"
    folderId: str | None = None
    documentId: str | None = None
    extension: str | None = None
    caseSensitive: bool = False
    exactMatch: bool = False


class ConfigUpdate(BaseModel):
    storageRootPath: str | None = None
    indexRootPath: str | None = None
    logRootPath: str | None = None
    trashRootPath: str | None = None
    backupRootPath: str | None = None
    allowedExtensions: list[str] | None = None
    maxUploadSizeMB: int | None = Field(default=None, ge=1, le=2048)
    defaultFolderName: str | None = None
    unclassifiedFolderName: str | None = None
    enableHighlight: bool | None = None
    enableAuditLog: bool | None = None


class ApiResponse(BaseModel):
    success: bool
    message: str
    data: Any | None = None
