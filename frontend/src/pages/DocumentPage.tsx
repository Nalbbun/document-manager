import { Check, Eye, FolderOpen, MoveRight, Pencil, Plus, RefreshCcw, RotateCcw, Trash2, X } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { DocumentViewerModal, type ViewerTarget } from '../components/DocumentViewerModal';
import { StatusPill } from '../components/StatusPill';
import { useOperation } from '../contexts/OperationContext';
import type { DocumentItem, Folder } from '../types/models';

export default function DocumentPage() {
  const { startOperation, endOperation } = useOperation();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [folderId, setFolderId] = useState('');
  const [extension, setExtension] = useState('');
  const [keyword, setKeyword] = useState('');
  const [folderName, setFolderName] = useState('');
  const [folderEditingId, setFolderEditingId] = useState<string | null>(null);
  const [folderEditingName, setFolderEditingName] = useState('');
  const [documentEditingId, setDocumentEditingId] = useState<string | null>(null);
  const [documentEditingName, setDocumentEditingName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [moveTargetId, setMoveTargetId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [viewerTarget, setViewerTarget] = useState<ViewerTarget | null>(null);

  const loadFolders = async () => {
    const response = await api.folders();
    setFolders(response.folders);
    setMoveTargetId((current) => current || response.folders[0]?.folderId || '');
    return response.folders;
  };

  const loadDocuments = async (nextFolderId = folderId) => {
    const response = await api.documents({
      folderId: nextFolderId,
      extension,
      keyword
    });
    setDocuments(response.documents);
    setSelectedIds((current) => current.filter((id) => response.documents.some((document) => document.documentId === id)));
  };

  const load = async () => {
    try {
      setError('');
      const [folderResponse, documentResponse] = await Promise.all([
        api.folders(),
        api.documents({ folderId, extension, keyword })
      ]);
      setFolders(folderResponse.folders);
      setMoveTargetId((current) => current || folderResponse.folders[0]?.folderId || '');
      setDocuments(documentResponse.documents);
      setSelectedIds((current) => current.filter((id) => documentResponse.documents.some((document) => document.documentId === id)));
    } catch (err) {
      setError(err instanceof Error ? err.message : '문서/폴더 정보를 불러오지 못했습니다.');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const selectedDocuments = useMemo(
    () => documents.filter((document) => selectedIds.includes(document.documentId)),
    [documents, selectedIds]
  );

  const allVisibleSelected = documents.length > 0 && selectedIds.length === documents.length;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void loadDocuments().catch((err) => setError(err.message));
  };

  const selectFolder = async (nextFolderId: string) => {
    try {
      setError('');
      setFolderId(nextFolderId);
      setSelectedIds([]);
      await loadDocuments(nextFolderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : '폴더 문서 조회 실패');
    }
  };

  const toggleDocument = (documentId: string) => {
    setSelectedIds((current) =>
      current.includes(documentId) ? current.filter((id) => id !== documentId) : [...current, documentId]
    );
  };

  const toggleAllVisible = () => {
    setSelectedIds(allVisibleSelected ? [] : documents.map((document) => document.documentId));
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
    if (!folderEditingName.trim()) return;
    try {
      setError('');
      setMessage('');
      await api.updateFolder(targetFolderId, folderEditingName.trim());
      setFolderEditingId(null);
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

  const renameDocument = async (document: DocumentItem) => {
    if (!documentEditingName.trim()) return;
    try {
      setError('');
      setMessage('');
      await api.renameDocument(document.documentId, documentEditingName.trim());
      setDocumentEditingId(null);
      setMessage('문서명이 변경되었습니다.');
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : '문서명 변경 실패');
    }
  };

  const moveSelectedDocuments = async () => {
    if (!selectedIds.length || !moveTargetId) return;
    if (!window.confirm(`선택한 문서 ${selectedIds.length}건을 이동할까요?`)) return;
    try {
      setError('');
      setMessage('');
      startOperation('선택 문서 이동 중');
      const result = await api.bulkMoveDocuments(selectedIds, moveTargetId);
      setMessage(`이동 완료: 성공 ${result.successCount}, 실패 ${result.failCount}`);
      setSelectedIds([]);
      await loadFolders();
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : '일괄 이동 실패');
    } finally {
      endOperation();
    }
  };

  const deleteSelectedDocuments = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`선택한 문서 ${selectedIds.length}건을 휴지통으로 이동할까요?`)) return;
    try {
      setError('');
      setMessage('');
      startOperation('선택 문서 휴지통 이동 중');
      const result = await api.bulkDeleteDocuments(selectedIds);
      setMessage(`휴지통 이동 완료: 성공 ${result.successCount}, 실패 ${result.failCount}`);
      setSelectedIds([]);
      await loadFolders();
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : '일괄 삭제 실패');
    } finally {
      endOperation();
    }
  };

  const rebuildSelectedDocuments = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`선택한 문서 ${selectedIds.length}건의 인덱스를 재생성할까요?`)) return;
    try {
      setError('');
      setMessage('');
      startOperation('선택 문서 인덱스 재생성 중');
      let successCount = 0;
      let failCount = 0;
      for (const documentId of selectedIds) {
        try {
          await api.rebuildDocumentIndex(documentId);
          successCount += 1;
        } catch {
          failCount += 1;
        }
      }
      setMessage(`인덱스 재생성 완료: 성공 ${successCount}, 실패 ${failCount}`);
      setSelectedIds([]);
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : '일괄 인덱스 재생성 실패');
    } finally {
      endOperation();
    }
  };

  const removeDocument = async (document: DocumentItem) => {
    if (!window.confirm(`${document.displayName} 문서를 휴지통으로 이동할까요?`)) return;
    try {
      setError('');
      setMessage('');
      await api.deleteDocument(document.documentId);
      setMessage('문서가 휴지통으로 이동되었습니다.');
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
          <p>폴더 정리, 문서명 변경, 문서 이동, 일괄 작업을 한 화면에서 처리합니다.</p>
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
                  {folderEditingId === folder.folderId ? (
                    <input
                      value={folderEditingName}
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => {
                        event.stopPropagation();
                        if (event.key === 'Enter') void renameFolder(folder.folderId);
                      }}
                      onChange={(event) => setFolderEditingName(event.target.value)}
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
                  {folderEditingId === folder.folderId ? (
                    <>
                      <button className="icon-button success" onClick={() => void renameFolder(folder.folderId)} title="저장">
                        <Check size={16} />
                      </button>
                      <button className="icon-button" onClick={() => setFolderEditingId(null)} title="취소">
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="icon-button"
                        disabled={folder.isSystemFolder}
                        onClick={() => {
                          setFolderEditingId(folder.folderId);
                          setFolderEditingName(folder.folderName);
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

          <section className="panel bulk-action-bar">
            <div>
              <strong>{selectedDocuments.length.toLocaleString()}개 선택</strong>
              <span>현재 목록에서 선택한 문서를 이동, 휴지통 이동, 재색인할 수 있습니다.</span>
            </div>
            <select value={moveTargetId} onChange={(event) => setMoveTargetId(event.target.value)}>
              {folders.map((folder) => (
                <option key={folder.folderId} value={folder.folderId}>
                  {folder.folderName}
                </option>
              ))}
            </select>
            <button className="icon-text-button" disabled={!selectedIds.length || !moveTargetId} onClick={moveSelectedDocuments}>
              <MoveRight size={17} />
              선택 이동
            </button>
            <button className="icon-text-button" disabled={!selectedIds.length} onClick={rebuildSelectedDocuments}>
              <RotateCcw size={17} />
              선택 재색인
            </button>
            <button className="icon-text-button danger" disabled={!selectedIds.length} onClick={deleteSelectedDocuments}>
              <Trash2 size={17} />
              선택 휴지통
            </button>
          </section>

          <section className="panel">
            <div className="section-header">
              <h2>{selectedFolder ? `${selectedFolder.folderName} 문서` : '전체 문서'}</h2>
              <span>{documents.length.toLocaleString()}개</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th className="checkbox-cell">
                      <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} />
                    </th>
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
                      <td className="checkbox-cell">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(document.documentId)}
                          onChange={() => toggleDocument(document.documentId)}
                        />
                      </td>
                      <td>
                        {documentEditingId === document.documentId ? (
                          <div className="inline-edit">
                            <input value={documentEditingName} onChange={(event) => setDocumentEditingName(event.target.value)} />
                            <button className="icon-button success" onClick={() => void renameDocument(document)} title="저장">
                              <Check size={16} />
                            </button>
                            <button className="icon-button" onClick={() => setDocumentEditingId(null)} title="취소">
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <span className="document-name-text">{document.displayName}</span>
                        )}
                      </td>
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
                          <button
                            className="icon-button"
                            onClick={() => {
                              setDocumentEditingId(document.documentId);
                              setDocumentEditingName(document.displayName);
                            }}
                            title="문서명 변경"
                          >
                            <Pencil size={16} />
                          </button>
                          <button className="icon-button danger" onClick={() => void removeDocument(document)} title="휴지통 이동">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {documents.length === 0 && (
                    <tr>
                      <td colSpan={8} className="empty">
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
