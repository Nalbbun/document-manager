import { FolderInput, UploadCloud } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useOperation } from '../contexts/OperationContext';
import type { Folder, UploadResult } from '../types/models';

export default function UploadPage() {
  const { startOperation, endOperation } = useOperation();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folderId, setFolderId] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [sourcePath, setSourcePath] = useState('');
  const [recursive, setRecursive] = useState(true);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState('');
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importBusy, setImportBusy] = useState(false);
  const busy = uploadBusy || importBusy;

  useEffect(() => {
    api
      .folders()
      .then((response) => {
        setFolders(response.folders);
        setFolderId(response.folders[0]?.folderId || '');
      })
      .catch((err) => setError(err.message));
  }, []);

  const upload = async (event: FormEvent) => {
    event.preventDefault();
    if (!files || files.length === 0) return;
    try {
      setError('');
      setResult(null);
      setUploadProgress(0);
      setUploadBusy(true);
      startOperation('파일 업로드 및 인덱싱 중');
      setResult(await api.upload(folderId, files, setUploadProgress));
    } catch (err) {
      setError(err instanceof Error ? err.message : '파일 등록 실패');
    } finally {
      setUploadBusy(false);
      endOperation();
    }
  };

  const importFolder = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setError('');
      setResult(null);
      setImportBusy(true);
      startOperation('폴더 파일 등록 및 인덱싱 중');
      setResult(await api.importFolder(folderId, sourcePath, recursive));
    } catch (err) {
      setError(err instanceof Error ? err.message : '폴더 가져오기 실패');
    } finally {
      setImportBusy(false);
      endOperation();
    }
  };

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h1>파일 등록</h1>
          <p>PDF, MD, TXT 문서 등록</p>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="split-layout">
        <form className="panel form-panel" onSubmit={upload}>
          <h2>파일 선택 등록</h2>
          <label>
            저장 폴더
            <select value={folderId} disabled={busy} onChange={(event) => setFolderId(event.target.value)}>
              {folders.map((folder) => (
                <option key={folder.folderId} value={folder.folderId}>
                  {folder.folderName}
                </option>
              ))}
            </select>
          </label>
          <label>
            문서 파일
            <input type="file" multiple accept=".pdf,.md,.txt" disabled={busy} onChange={(event) => setFiles(event.target.files)} />
          </label>
          <button className="icon-text-button primary" disabled={!folderId || !files?.length || busy} title="파일 등록">
            <UploadCloud size={17} />
            {uploadBusy ? '등록 중' : '등록'}
          </button>
          {uploadBusy && (
            <ProgressBar
              label={uploadProgress >= 100 ? '업로드 완료, 인덱싱 결과 대기 중' : '파일 업로드 중'}
              value={uploadProgress}
            />
          )}
        </form>

        <form className="panel form-panel" onSubmit={importFolder}>
          <h2>폴더 경로 등록</h2>
          <label>
            저장 폴더
            <select value={folderId} disabled={busy} onChange={(event) => setFolderId(event.target.value)}>
              {folders.map((folder) => (
                <option key={folder.folderId} value={folder.folderId}>
                  {folder.folderName}
                </option>
              ))}
            </select>
          </label>
          <label>
            로컬 폴더 경로
            <input value={sourcePath} disabled={busy} onChange={(event) => setSourcePath(event.target.value)} placeholder="C:\docs" />
          </label>
          <label className="check-row">
            <input type="checkbox" checked={recursive} disabled={busy} onChange={(event) => setRecursive(event.target.checked)} />
            하위 폴더 포함
          </label>
          <button className="icon-text-button" disabled={!folderId || !sourcePath || busy} title="폴더 등록">
            <FolderInput size={17} />
            {importBusy ? '가져오는 중' : '가져오기'}
          </button>
          {importBusy && <ProgressBar label="폴더 파일을 등록하고 인덱싱하는 중" indeterminate />}
        </form>
      </div>

      {result && (
        <section className="panel">
          <h2>등록 결과</h2>
          <div className="result-summary">
            <span>성공 {result.successCount}</span>
            <span>실패 {result.failCount}</span>
          </div>
          {result.failed.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>파일명</th>
                    <th>사유</th>
                  </tr>
                </thead>
                <tbody>
                  {result.failed.map((item) => (
                    <tr key={`${item.fileName}-${item.reason}`}>
                      <td>{item.fileName}</td>
                      <td>{item.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </section>
  );
}

function ProgressBar({ label, value = 0, indeterminate = false }: { label: string; value?: number; indeterminate?: boolean }) {
  return (
    <div className="progress-area" role="status" aria-live="polite">
      <div className="progress-meta">
        <span>{label}</span>
        {!indeterminate && <strong>{value}%</strong>}
      </div>
      <div className="progress-track">
        <div
          className={indeterminate ? 'progress-bar indeterminate' : 'progress-bar'}
          style={indeterminate ? undefined : { width: `${Math.max(4, value)}%` }}
        />
      </div>
    </div>
  );
}
