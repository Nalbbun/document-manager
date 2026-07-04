import { RefreshCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { DocumentViewerModal, type ViewerTarget } from '../components/DocumentViewerModal';
import { StatusPill } from '../components/StatusPill';
import type { DocumentItem, Folder, IndexStatus } from '../types/models';

export default function DashboardPage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [status, setStatus] = useState<IndexStatus | null>(null);
  const [error, setError] = useState('');
  const [viewerTarget, setViewerTarget] = useState<ViewerTarget | null>(null);

  const load = async () => {
    try {
      setError('');
      const [folderResponse, documentResponse, indexResponse] = await Promise.all([
        api.folders(),
        api.documents(),
        api.indexStatus()
      ]);
      setFolders(folderResponse.folders);
      setDocuments(documentResponse.documents);
      setStatus(indexResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : '대시보드를 불러오지 못했습니다.');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const counts = useMemo(() => {
    const byExtension = documents.reduce<Record<string, number>>((acc, document) => {
      acc[document.extension] = (acc[document.extension] || 0) + 1;
      return acc;
    }, {});
    return {
      pdf: byExtension.pdf || 0,
      md: byExtension.md || 0,
      txt: byExtension.txt || 0
    };
  }, [documents]);

  const recent = [...documents].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);
  const favorites = [...documents]
    .filter((document) => document.favorite || document.pinned)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 8);

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h1>대시보드</h1>
          <p>문서 저장소와 인덱스 상태</p>
        </div>
        <button className="icon-text-button" onClick={load} title="새로고침">
          <RefreshCcw size={17} />
          새로고침
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="stat-grid">
        <Stat label="전체 폴더" value={folders.length} />
        <Stat label="전체 문서" value={documents.length} />
        <Stat label="검색 가능" value={status?.indexedCount ?? 0} />
        <Stat label="인덱스 실패" value={(status?.failedCount ?? 0) + (status?.unsearchableCount ?? 0)} />
        <Stat label="PDF" value={counts.pdf} />
        <Stat label="MD" value={counts.md} />
        <Stat label="TXT" value={counts.txt} />
        <Stat label="인덱스 항목" value={status?.searchIndexItemCount ?? 0} />
      </div>

      <div className="split-layout">
        <section className="panel">
          <h2>최근 등록 문서</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>문서명</th>
                  <th>폴더</th>
                  <th>유형</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((document) => (
                  <tr key={document.documentId}>
                    <td>
                      <button
                        className="text-link-button"
                        onClick={() => setViewerTarget({ documentId: document.documentId })}
                        title="문서 열기"
                      >
                        {document.displayName}
                      </button>
                    </td>
                    <td>{document.folderName}</td>
                    <td className="uppercase">{document.extension}</td>
                    <td>
                      <StatusPill status={document.indexStatus} />
                    </td>
                  </tr>
                ))}
                {recent.length === 0 && (
                  <tr>
                    <td colSpan={4} className="empty">
                      등록된 문서가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <h2>폴더 현황</h2>
          <div className="folder-list">
            {folders.map((folder) => (
              <div className="folder-row" key={folder.folderId}>
                <div>
                  <strong>{folder.folderName}</strong>
                  <span>{folder.folderPath}</span>
                </div>
                <b>{folder.documentCount}</b>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="panel">
        <div className="section-header">
          <h2>즐겨찾기 문서</h2>
          <span>{favorites.length.toLocaleString()}개</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>문서명</th>
                <th>폴더</th>
                <th>태그</th>
                <th>구분</th>
              </tr>
            </thead>
            <tbody>
              {favorites.map((document) => (
                <tr key={document.documentId}>
                  <td>
                    <button
                      className="text-link-button"
                      onClick={() => setViewerTarget({ documentId: document.documentId })}
                      title="문서 열기"
                    >
                      {document.displayName}
                    </button>
                  </td>
                  <td>{document.folderName}</td>
                  <td>
                    {document.tags.length > 0 ? (
                      <div className="tag-chip-row">
                        {document.tags.map((tag) => (
                          <span className="tag-chip" key={`${document.documentId}-${tag}`}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>{[document.pinned ? '고정' : '', document.favorite ? '즐겨찾기' : ''].filter(Boolean).join(' · ')}</td>
                </tr>
              ))}
              {favorites.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty">
                    즐겨찾기 문서가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <DocumentViewerModal target={viewerTarget} onClose={() => setViewerTarget(null)} />
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
