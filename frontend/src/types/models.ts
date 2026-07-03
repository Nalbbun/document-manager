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
  searchable: boolean;
  indexStatus: 'READY' | 'INDEXING' | 'INDEXED' | 'FAILED' | 'UNSEARCHABLE' | string;
  indexError?: string | null;
  createdAt: string;
  updatedAt: string;
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

