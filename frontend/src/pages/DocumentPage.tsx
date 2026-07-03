import { Check, Eye, FolderOpen, Pencil, Plus, RefreshCcw, Trash2, X } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';
import { DocumentViewerModal, type ViewerTarget } from '../components/DocumentViewerModal';
import { StatusPill } from '../components/StatusPill';
import type { DocumentItem, Folder } from '../types/models';

export default function DocumentPage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [folderId, setFolderId] = useState('');
  const [extension, setExtension] = useState('');
  const [keyword, setKeyword] = useState('');
  const [folderName, setFolderName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [viewerTarget, setViewerTarget] = useState<ViewerTarget | null>(null);

  const loadFolders = async () => {
    const response = await api.folders();
    setFolders(response.folders);
    return response.folders;
  };

  const loadDocuments = async (nextFolderId = folderId) => {
    const response = await api.documents({
      folderId: nextFolderId,
      extension,
      keyword
    });
    setDocuments(response.documents);
  };

  const load = async () => {
    try {
      setError('');
      const [folderResponse, documentResponse] = await Promise.all([
        api.folders(),
        api.documents({ folderId, extension, keyword })
      ]);
      setFolders(folderResponse.folders);
      setDocuments(documentResponse.documents);
    } catch (err) {
      setError(err instanceof Error ? err.message : '문서/폴더 정보를 불러오지 못했습니다.');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void loadDocuments().catch((err) => setError(err.message));
  };

  const selectFolder = async (nextFolderId: string) => {
    try {
      setError('');
      setFolderId(nextFolderId);
      await loadDocuments(nextFolderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : '폴더 문서 조회 실패');
    }
  };

  const createFolder = async (event: FormEvent) => {
    event.preventDefault();
    if (!folderName.trim()) return;
    try {
      setError('');
      setMessage('');
      await api.createFolder(folderName.trim());
      setFolderName('');
      setMessage('폴더가 생성되었습니다.');
      await loadFolders();
    } catch (err) {
      setError(err instanceof Error ? err.message : '폴더 생성 실패');
    }
  };

  const renameFolder = async (targetFolderId: string) => {
    if (!editingName.trim()) return;
    try {
      setError('');
      setMessage('');
      await api.updateFolder(targetFolderId, editingName.trim());
      setEditingId(null);
      setMessage('폴더명이 변경되었습니다.');
      await loadFolders();
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : '폴더명 변경 실패');
    }
  };

  const removeFolder = async (folder: Folder) => {
    if (!window.confirm(`${folder.folderName} 폴더를 삭제할까요?`)) return;
    try {
      setError('');
      setMessage('');
      await api.deleteFolder(folder.folderId);
      const nextFolderId = folderId === folder.folderId ? '' : folderId;
      setFolderId(nextFolderId);
      setMessage('폴더가 삭제되었습니다.');
      await loadFolders();
      await loadDocuments(nextFolderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : '폴더 삭제 실패');
    }
  };

  const removeDocument = async (document: DocumentItem) => {
    if (!window.confirm(`${document.displayName} 문서를 삭제할까요?`)) return;
    try {
      setError('');
      setMessage('');
      await api.deleteDocument(document.documentId);
      setMessage('문서가 삭제되었습니다.');
      await loadFolders();
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : '문서 삭제 실패');
    }
  };

  const selectedFolder = folders.find((folder) => folder.folderId === folderId);
  const totalFolderDocuments = folders.reduce((sum, folder) => sum + folder.documentCount, 0);

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h1>문서/폴더 관리</h1>
          <p>폴더 생성, 이름 변경, 삭제와 등록 문서 조회를 한 화면에서 처리합니다.</p>
        </div>
        <button className="icon-text-button" onClick={() => void load()} title="새로고침">
          <RefreshCcw size={17} />
          새로고침
        </button>
      </div>

      {message && <div className="alert success">{message}</div>}
      {error && <div className="alert error">{error}</div>}

      <div className="management-layout">
        <aside className="panel folder-management-panel">
          <div className="section-header">
            <h2>폴더</h2>
            <span>{folders.length.toLocaleString()}개</span>
          </div>

          <form className="folder-create-form" onSubmit={createFolder}>
            <input value={folderName} onChange={(event) => setFolderName(event.target.value)} placeholder="새 폴더명" />
            <button className="icon-button primary" disabled={!folderName.trim()} title="폴더 생성">
              <Plus size={17} />
            </button>
          </form>

          <div className="folder-management-list">
            <div
              className={folderId ? 'folder-select-row' : 'folder-select-row selected-row'}
              role="button"
              tabIndex={0}
              onClick={() => void selectFolder('')}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void selectFolder('');
              }}
            >
              <FolderOpen size={18} />
              <div className="folder-select-main">
                <strong>전체 문서</strong>
                <span>모든 폴더</span>
              </div>
              <b>{totalFolderDocuments.toLocaleString()}</b>
            </div>

            {folders.map((folder) => (
              <div
                key={folder.folderId}
                className={folderId === folder.folderId ? 'folder-select-row selected-row' : 'folder-select-row'}
                role="button"
                tabIndex={0}
                onClick={() => void selectFolder(folder.folderId)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void selectFolder(folder.folderId);
                }}
              >
                <FolderOpen size={18} />
                <div className="folder-select-main">
                  {editingId === folder.folderId ? (
                    <input
                      value={editingName}
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => {
                        event.stopPropagation();
                        if (event.key === 'Enter') void renameFolder(folder.folderId);
                      }}
                      onChange={(event) => setEditingName(event.target.value)}
                    />
                  ) : (
                    <>
                      <strong>{folder.folderName}</strong>
                      <span>{folder.folderPath}</span>
                    </>
                  )}
                </div>
                <b>{folder.documentCount.toLocaleString()}</b>
                <div className="row-actions" onClick={(event) => event.stopPropagation()}>
                  {editingId === folder.folderId ? (
                    <>
                      <button className="icon-button success" onClick={() => void renameFolder(folder.folderId)} title="저장">
                        <Check size={16} />
                      </button>
                      <button className="icon-button" onClick={() => setEditingId(null)} title="취소">
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="icon-button"
                        disabled={folder.isSystemFolder}
                        onClick={() => {
                          setEditingId(folder.folderId);
                          setEditingName(folder.folderName);
                        }}
                        title="이름 변경"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="icon-button danger"
                        disabled={folder.isSystemFolder || folder.documentCount > 0}
                        onClick={() => void removeFolder(folder)}
                        title="삭제"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="document-management-area">
          <form className="filter-bar document-filter-bar" onSubmit={submit}>
            <select value={folderId} onChange={(event) => void selectFolder(event.target.value)}>
              <option value="">전체 폴더</option>
              {folders.map((folder) => (
                <option key={folder.folderId} value={folder.folderId}>
                  {folder.folderName}
                </option>
              ))}
            </select>
            <select value={extension} onChange={(event) => setExtension(event.target.value)}>
              <option value="">전체 유형</option>
              <option value="pdf">PDF</option>
              <option value="md">MD</option>
              <option value="txt">TXT</option>
            </select>
            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="문서명" />
            <button className="icon-text-button primary">조회</button>
          </form>

          <section className="panel">
            <div className="section-header">
              <h2>{selectedFolder ? `${selectedFolder.folderName} 문서` : '전체 문서'}</h2>
              <span>{documents.length.toLocaleString()}개</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>문서명</th>
                    <th>폴더</th>
                    <th>유형</th>
                    <th>크기</th>
                    <th>등록일</th>
                    <th>상태</th>
                    <th>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((document) => (
                    <tr key={document.documentId}>
                      <td>{document.displayName}</td>
                      <td>{document.folderName}</td>
                      <td className="uppercase">{document.extension}</td>
                      <td>{formatBytes(document.fileSize)}</td>
                      <td>{formatDate(document.createdAt)}</td>
                      <td>
                        <StatusPill status={document.indexStatus} />
                      </td>
                      <td>
                        <div className="row-actions">
                          <button className="icon-button" onClick={() => setViewerTarget({ documentId: document.documentId })} title="열기">
                            <Eye size={16} />
                          </button>
                          <button className="icon-button danger" onClick={() => void removeDocument(document)} title="삭제">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {documents.length === 0 && (
                    <tr>
                      <td colSpan={7} className="empty">
                        조회된 문서가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </div>

      <DocumentViewerModal target={viewerTarget} onClose={() => setViewerTarget(null)} />
    </section>
  );
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return value ? value.slice(0, 16).replace('T', ' ') : '';
}
