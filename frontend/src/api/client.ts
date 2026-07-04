import type {
  AppConfig,
  BackupItem,
  BackupValidation,
  DocumentItem,
  Folder,
  IntegrityReport,
  IndexStatus,
  PreviewResponse,
  RepairReport,
  SearchResult,
  TrashItem,
  UploadResult
} from '../types/models';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown; rawBody?: BodyInit };

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const { rawBody, body: jsonBody, ...init } = options;
  let body: BodyInit | undefined = rawBody;

  if (body === undefined && jsonBody !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(jsonBody);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    body
  });

  const contentType = response.headers.get('Content-Type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'object' && payload?.message ? payload.message : '요청 처리 중 오류가 발생했습니다.';
    throw new Error(message);
  }

  return payload as T;
}

function query(params: Record<string, string | number | boolean | undefined | null>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}

export const api = {
  health: () => request<{ status: string; appName: string }>('/health'),
  folders: () => request<{ folders: Folder[] }>('/api/folders'),
  createFolder: (folderName: string) => request('/api/folders', { method: 'POST', body: { folderName } }),
  updateFolder: (folderId: string, folderName: string) =>
    request(`/api/folders/${folderId}`, { method: 'PUT', body: { folderName } }),
  deleteFolder: (folderId: string) => request(`/api/folders/${folderId}`, { method: 'DELETE' }),
  documents: (params: Record<string, string | undefined> = {}) =>
    request<{ documents: DocumentItem[] }>(`/api/documents${query(params)}`),
  document: (documentId: string) => request<{ document: DocumentItem }>(`/api/documents/${documentId}`),
  preview: (documentId: string) => request<PreviewResponse>(`/api/documents/${documentId}/preview`),
  deleteDocument: (documentId: string) => request(`/api/documents/${documentId}`, { method: 'DELETE' }),
  moveDocument: (documentId: string, folderId: string) =>
    request<{ success: boolean; message: string; document: DocumentItem }>(`/api/documents/${documentId}/move`, {
      method: 'PATCH',
      body: { folderId }
    }),
  renameDocument: (documentId: string, fileName: string) =>
    request<{ success: boolean; message: string; document: DocumentItem }>(`/api/documents/${documentId}/rename`, {
      method: 'PATCH',
      body: { fileName }
    }),
  bulkMoveDocuments: (documentIds: string[], folderId: string) =>
    request<{
      success: boolean;
      message: string;
      successCount: number;
      failCount: number;
      succeeded: DocumentItem[];
      failed: Array<{ documentId: string; reason: string }>;
    }>('/api/documents/bulk/move', { method: 'POST', body: { documentIds, folderId } }),
  bulkDeleteDocuments: (documentIds: string[]) =>
    request<{
      success: boolean;
      message: string;
      successCount: number;
      failCount: number;
      succeeded: TrashItem[];
      failed: Array<{ documentId: string; reason: string }>;
    }>('/api/documents/bulk/delete', { method: 'POST', body: { documentIds } }),
  upload: (folderId: string, files: FileList, onProgress?: (percent: number) => void) => {
    const form = new FormData();
    form.set('folderId', folderId);
    Array.from(files).forEach((file) => form.append('files', file));
    return uploadWithProgress<UploadResult>('/api/documents/upload', form, onProgress);
  },
  importFolder: (folderId: string, sourcePath: string, recursive: boolean) =>
    request<UploadResult>('/api/documents/import-folder', {
      method: 'POST',
      body: { folderId, sourcePath, recursive }
    }),
  search: (params: Record<string, string | boolean | undefined>) =>
    request<{ success: boolean; keyword: string; resultCount: number; results: SearchResult[] }>(
      `/api/search${query(params)}`
    ),
  indexStatus: () => request<IndexStatus>('/api/index/status'),
  rebuildIndex: () =>
    request<{ success: boolean; message: string; successCount: number; failCount: number; status: IndexStatus }>(
      '/api/index/rebuild',
      { method: 'POST' }
    ),
  rebuildDocumentIndex: (documentId: string) =>
    request<{
      success: boolean;
      message: string;
      successCount: number;
      failCount: number;
      document: DocumentItem;
      status: IndexStatus;
    }>(`/api/index/documents/${documentId}/rebuild`, { method: 'POST' }),
  config: () => request<AppConfig>('/api/config'),
  updateConfig: (payload: Partial<AppConfig>) =>
    request<{ success: boolean; message: string; config: AppConfig }>('/api/config', { method: 'PUT', body: payload }),
  log: (type: 'app' | 'error' | 'audit', lines = 200) =>
    request<{ type: string; lines: string[] }>(`/api/logs/${type}${query({ lines })}`),
  trash: () => request<{ items: TrashItem[] }>('/api/trash'),
  restoreTrashItem: (trashId: string, folderId?: string) =>
    request<{ success: boolean; message: string; document: DocumentItem }>(`/api/trash/${trashId}/restore`, {
      method: 'POST',
      body: { folderId }
    }),
  deleteTrashItem: (trashId: string) =>
    request<{ success: boolean; message: string; item: TrashItem }>(`/api/trash/${trashId}`, { method: 'DELETE' }),
  emptyTrash: () =>
    request<{
      success: boolean;
      message: string;
      successCount: number;
      failCount: number;
      succeeded: TrashItem[];
      failed: Array<{ trashId: string; reason: string }>;
    }>('/api/trash', { method: 'DELETE' }),
  backups: () => request<{ items: BackupItem[] }>('/api/backups'),
  createBackup: () =>
    request<{ success: boolean; message: string; backup: BackupItem }>('/api/backups', { method: 'POST' }),
  validateBackup: (backupId: string) =>
    request<{ success: boolean; message: string; validation: BackupValidation }>(`/api/backups/${backupId}/validate`, {
      method: 'POST'
    }),
  restoreBackup: (backupId: string) =>
    request<{
      success: boolean;
      message: string;
      backup: BackupItem;
      safetyBackup: BackupItem;
      validation: BackupValidation;
    }>(`/api/backups/${backupId}/restore`, { method: 'POST' }),
  backupDownloadUrl: (backupId: string) => `${API_BASE_URL}/api/backups/${backupId}/download`,
  integrity: () => request<IntegrityReport>('/api/maintenance/integrity'),
  repairIntegrity: () => request<RepairReport>('/api/maintenance/repair', { method: 'POST' })
};

function uploadWithProgress<T>(path: string, form: FormData, onProgress?: (percent: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}${path}`);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress?.(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    };

    xhr.onload = () => {
      const contentType = xhr.getResponseHeader('Content-Type') || '';
      const payload = contentType.includes('application/json') && xhr.responseText ? JSON.parse(xhr.responseText) : xhr.responseText;

      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve(payload as T);
        return;
      }

      const message =
        payload && typeof payload === 'object' && 'message' in payload
          ? String((payload as { message: unknown }).message)
          : '요청 처리 중 오류가 발생했습니다.';
      reject(new Error(message));
    };

    xhr.onerror = () => reject(new Error('파일 업로드 중 네트워크 오류가 발생했습니다.'));
    xhr.onabort = () => reject(new Error('파일 업로드가 취소되었습니다.'));
    xhr.send(form);
  });
}
