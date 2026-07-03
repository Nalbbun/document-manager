import { FileText, RefreshCcw, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { StatusPill } from '../components/StatusPill';
import { useOperation } from '../contexts/OperationContext';
import type { DocumentItem, IndexStatus } from '../types/models';

export default function IndexPage() {
  const { startOperation, endOperation } = useOperation();
  const [status, setStatus] = useState<IndexStatus | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [taskLabel, setTaskLabel] = useState('');

  const load = async () => {
    try {
      setError('');
      const [statusResponse, documentResponse] = await Promise.all([api.indexStatus(), api.documents()]);
      setStatus(statusResponse);
      setDocuments(documentResponse.documents);
      setSelectedDocumentId((current) => current || documentResponse.documents[0]?.documentId || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : '인덱스 상태 조회 실패');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const rebuild = async () => {
    if (!window.confirm('전체 검색 인덱스를 재생성할까요?')) return;
    try {
      setBusy(true);
      setTaskLabel('전체 문서 인덱스를 재생성하는 중');
      startOperation('전체 문서 인덱스 재생성 중');
      setError('');
      setMessage('');
      const response = await api.rebuildIndex();
      setStatus(response.status);
      setMessage(`재생성 완료: 성공 ${response.successCount}, 실패 ${response.failCount}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '인덱스 재생성 실패');
    } finally {
      setBusy(false);
      setTaskLabel('');
      endOperation();
    }
  };

  const rebuildDocument = async () => {
    if (!selectedDocumentId) return;
    const target = documents.find((document) => document.documentId === selectedDocumentId);
    if (!target) return;
    try {
      setBusy(true);
      setTaskLabel(`${target.displayName} 인덱스를 재생성하는 중`);
      startOperation(`${target.displayName} 인덱스 재생성 중`);
      setError('');
      setMessage('');
      const response = await api.rebuildDocumentIndex(selectedDocumentId);
      setStatus(response.status);
      setMessage(`${response.document.displayName} 재생성 완료: 상태 ${response.document.indexStatus}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '문서 인덱스 재생성 실패');
    } finally {
      setBusy(false);
      setTaskLabel('');
      endOperation();
    }
  };

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h1>인덱스 관리</h1>
          <p>검색 인덱스 상태와 재생성</p>
        </div>
        <div className="header-actions">
          <button className="icon-text-button" disabled={busy} onClick={load} title="새로고침">
            <RefreshCcw size={17} />
            새로고침
          </button>
          <button className="icon-text-button primary" disabled={busy} onClick={rebuild} title="인덱스 재생성">
            <RotateCcw size={17} />
            전체 재생성
          </button>
        </div>
      </div>

      {message && <div className="alert success">{message}</div>}
      {error && <div className="alert error">{error}</div>}
      {busy && <ProgressBar label={taskLabel || '인덱스 작업 중'} />}

      <div className="stat-grid">
        <Stat label="전체 문서" value={status?.documentCount ?? 0} />
        <Stat label="인덱싱 완료" value={status?.indexedCount ?? 0} />
        <Stat label="실패" value={status?.failedCount ?? 0} />
        <Stat label="검색 불가" value={status?.unsearchableCount ?? 0} />
        <Stat label="인덱스 항목" value={status?.searchIndexItemCount ?? 0} />
      </div>

      <section className="panel">
        <div className="section-header">
          <h2>파일별 인덱스 재생성</h2>
          <span>{documents.length.toLocaleString()}개 문서</span>
        </div>
        <div className="index-action-row">
          <select value={selectedDocumentId} onChange={(event) => setSelectedDocumentId(event.target.value)} disabled={busy}>
            <option value="">문서 선택</option>
            {documents.map((document) => (
              <option key={document.documentId} value={document.documentId}>
                {document.displayName}
              </option>
            ))}
          </select>
          <button className="icon-text-button" disabled={!selectedDocumentId || busy} onClick={rebuildDocument} title="문서 인덱스 재생성">
            <FileText size={17} />
            선택 문서 재생성
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>문서별 인덱스 상태</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>문서명</th>
                <th>폴더</th>
                <th>유형</th>
                <th>페이지/줄</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.documentId}>
                  <td>{document.displayName}</td>
                  <td>{document.folderName}</td>
                  <td className="uppercase">{document.extension}</td>
                  <td>{document.pageCount ? `${document.pageCount}페이지` : document.lineCount ? `${document.lineCount}줄` : '-'}</td>
                  <td>
                    <StatusPill status={document.indexStatus} />
                  </td>
                </tr>
              ))}
              {documents.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty">
                    등록된 문서가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value.toLocaleString()}</strong>
    </div>
  );
}

function ProgressBar({ label }: { label: string }) {
  return (
    <div className="panel progress-work">
      <div className="progress-meta">
        <span>{label}</span>
        <strong>작업 중</strong>
      </div>
      <div className="progress-track">
        <div className="progress-bar indeterminate" />
      </div>
    </div>
  );
}
