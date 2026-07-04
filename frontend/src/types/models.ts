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
  allowedExtensions: string[];
  maxUploadSizeMB: number;
  defaultFolderName: string;
  unclassifiedFolderName: string;
  enableHighlight: boolean;
  enableAuditLog: boolean;
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
