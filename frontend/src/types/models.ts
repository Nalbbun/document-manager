export type Folder = {
  folderId: string;
  folderName: string;
  folderPath: string;
  isSystemFolder: boolean;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
};

export type DocumentItem = {
  documentId: string;
  folderId: string;
  folderName: string;
  fileName: string;
  displayName: string;
  extension: 'pdf' | 'md' | 'txt' | string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  pageCount: number | null;
  lineCount: number | null;
  fileHash: string;
  tags: string[];
  favorite: boolean;
  pinned: boolean;
  memo: string;
  searchable: boolean;
  indexStatus: 'READY' | 'INDEXING' | 'INDEXED' | 'FAILED' | 'UNSEARCHABLE' | string;
  indexError?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TrashItem = {
  trashId: string;
  documentId: string;
  fileName: string;
  originalFolderId: string;
  originalFolderName: string;
  originalPath: string;
  trashPath: string;
  deletedAt: string;
  deletedReason: string;
  document: DocumentItem;
};

export type BackupItem = {
  backupId: string;
  fileName: string;
  fileSize: number;
  sha256?: string;
  backupPath: string;
  createdAt: string;
  status: string;
  reason: string;
};

export type BackupValidation = {
  valid: boolean;
  entryCount: number;
  missing: string[];
  badFile: string | null;
  sha256?: string;
  expectedSha256?: string | null;
  hashMatches?: boolean;
};

export type BackupPreviewSummary = {
  totalEntries: number;
  storageFiles: number;
  indexFiles: number;
  configFiles: number;
  logFiles: number;
  trashFiles: number;
  documentCount: number;
  folderCount: number;
  searchIndexCount: number;
  trashCount: number;
};

export type BackupPreview = {
  backup: BackupItem;
  validation: BackupValidation;
  summary: BackupPreviewSummary;
};

export type BackupDryRun = BackupPreview & {
  restorable: boolean;
};

export type TagSummary = {
  tag: string;
  count: number;
};

export type DuplicateGroup = {
  fileHash: string;
  count: number;
  documents: DocumentItem[];
};

export type SearchHistoryItem = {
  historyId: string;
  keyword: string;
  filters: {
    scope?: string;
    folderId?: string | null;
    documentId?: string | null;
    extension?: string | null;
    caseSensitive?: boolean;
    exactMatch?: boolean;
    matchMode?: string;
    excludeKeyword?: string | null;
    tag?: string | null;
    favorite?: boolean | null;
    pinned?: boolean | null;
    sort?: string;
  };
  resultCount: number;
  searchedAt: string;
};

export type IntegrityIssue = {
  type: string;
  severity: string;
  message: string;
  repair: 'repairable' | 'manual' | string;
  targetId: string | null;
  targetName: string | null;
  details: Record<string, unknown>;
};

export type IntegrityReport = {
  checkedAt: string;
  summary: {
    totalIssues: number;
    repairable: number;
    manual: number;
    byType: Record<string, number>;
  };
  issues: IntegrityIssue[];
};

export type RepairReport = {
  success: boolean;
  message: string;
  before: IntegrityReport;
  after: IntegrityReport;
  actions: Array<{ type: string; targetId: string | null; targetName: string; completedAt: string }>;
  safetyBackup: BackupItem;
};

export type SearchResult = {
  documentId: string;
  folderId: string;
  folderName: string;
  fileName: string;
  displayName: string;
  extension: string;
  locationType: 'PAGE' | 'LINE' | string;
  pageNumber: number | null;
  lineNumber: number | null;
  snippet: string;
  filePath: string;
  viewerUrl: string;
  tags: string[];
  favorite: boolean;
  pinned: boolean;
  memo: string;
  createdAt: string;
  score: number;
};

export type IndexStatus = {
  documentCount: number;
  indexedCount: number;
  failedCount: number;
  unsearchableCount: number;
  searchIndexItemCount: number;
};

export type AppConfig = {
  appName: string;
  storageRootPath: string;
  indexRootPath: string;
  logRootPath: string;
  trashRootPath: string;
  backupRootPath: string;
  importRootPath: string;
  allowedExtensions: string[];
  maxUploadSizeMB: number;
  maxImportFileCount: number;
  maxImportTotalSizeMB: number;
  defaultFolderName: string;
  unclassifiedFolderName: string;
  enableHighlight: boolean;
  enableAuditLog: boolean;
  allowAbsoluteImportPath: boolean;
  followSymlinks: boolean;
  excludeHiddenFiles: boolean;
  duplicatePolicy: 'block' | 'auto_rename';
  backupRetentionCount: number;
  backupRetentionDays: number;
  trashRetentionDays: number;
  logRetentionDays: number;
  searchHistoryLimit: number;
  autoRepairAfterIntegrityCheck: boolean;
  backendHost: string;
  backendPort: number;
  frontendPort: number;
};

export type UploadResult = {
  success: boolean;
  message: string;
  successCount: number;
  failCount: number;
  succeeded: DocumentItem[];
  failed: Array<{ fileName: string; reason: string }>;
};

export type PreviewResponse = {
  document: DocumentItem;
  viewerType: 'pdf' | 'text';
  fileUrl: string;
  lines: Array<{ lineNumber: number; text: string }>;
};
