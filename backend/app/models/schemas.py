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


class DocumentMetadataUpdate(BaseModel):
    tags: list[str] | None = None
    favorite: bool | None = None
    pinned: bool | None = None
    memo: str | None = Field(default=None, max_length=1000)


class BulkDocumentMoveRequest(BaseModel):
    documentIds: list[str] = Field(min_length=1)
    folderId: str


class BulkDocumentRequest(BaseModel):
    documentIds: list[str] = Field(min_length=1)


class BulkDocumentTagRequest(BaseModel):
    documentIds: list[str] = Field(min_length=1)
    tags: list[str] = Field(min_length=1)
    mode: Literal["replace", "add", "remove"] = "add"


class TrashRestoreRequest(BaseModel):
    folderId: str | None = None
    targetFolderId: str | None = None
    conflictPolicy: Literal["block", "auto_rename", "select_folder"] = "auto_rename"


class SearchQuery(BaseModel):
    keyword: str
    scope: Literal["all", "folder", "document"] = "all"
    folderId: str | None = None
    documentId: str | None = None
    extension: str | None = None
    caseSensitive: bool = False
    exactMatch: bool = False
    matchMode: Literal["contains", "and", "or", "phrase"] = "contains"
    excludeKeyword: str | None = None
    tag: str | None = None
    favorite: bool | None = None
    pinned: bool | None = None
    sort: Literal["relevance", "createdAt", "fileName"] = "relevance"


class ConfigUpdate(BaseModel):
    storageRootPath: str | None = None
    indexRootPath: str | None = None
    logRootPath: str | None = None
    trashRootPath: str | None = None
    backupRootPath: str | None = None
    importRootPath: str | None = None
    allowedExtensions: list[str] | None = None
    maxUploadSizeMB: int | None = Field(default=None, ge=1, le=2048)
    maxImportFileCount: int | None = Field(default=None, ge=1, le=100000)
    maxImportTotalSizeMB: int | None = Field(default=None, ge=1, le=102400)
    defaultFolderName: str | None = None
    unclassifiedFolderName: str | None = None
    enableHighlight: bool | None = None
    enableAuditLog: bool | None = None
    allowAbsoluteImportPath: bool | None = None
    followSymlinks: bool | None = None
    excludeHiddenFiles: bool | None = None
    duplicatePolicy: Literal["block", "auto_rename"] | None = None
    backupRetentionCount: int | None = Field(default=None, ge=1, le=1000)
    backupRetentionDays: int | None = Field(default=None, ge=1, le=3650)
    trashRetentionDays: int | None = Field(default=None, ge=1, le=3650)
    logRetentionDays: int | None = Field(default=None, ge=1, le=3650)
    searchHistoryLimit: int | None = Field(default=None, ge=1, le=1000)
    autoRepairAfterIntegrityCheck: bool | None = None


class ApiResponse(BaseModel):
    success: bool
    message: str
    data: Any | None = None
