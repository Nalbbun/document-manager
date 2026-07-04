import {
  Check,
  Eye,
  FolderOpen,
  MoveRight,
  Pencil,
  Pin,
  Plus,
  RefreshCcw,
  RotateCcw,
  Star,
  Tags,
  Trash2,
  X
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { DocumentViewerModal, type ViewerTarget } from '../components/DocumentViewerModal';
import { StatusPill } from '../components/StatusPill';
import { useOperation } from '../contexts/OperationContext';
import type { DocumentItem, DuplicateGroup, Folder, TagSummary } from '../types/models';

export default function DocumentPage() {
  const { startOperation, endOperation } = useOperation();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [tags, setTags] = useState<TagSummary[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [folderId, setFolderId] = useState('');
  const [extension, setExtension] = useState('');
  const [keyword, setKeyword] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [favoriteFilter, setFavoriteFilter] = useState('');
  const [pinnedFilter, setPinnedFilter] = useState('');
  const [folderName, setFolderName] = useState('');
  const [folderEditingId, setFolderEditingId] = useState<string | null>(null);
  const [folderEditingName, setFolderEditingName] = useState('');
  const [documentEditingId, setDocumentEditingId] = useState<string | null>(null);
  const [documentEditingName, setDocumentEditingName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [moveTargetId, setMoveTargetId] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [viewerTarget, setViewerTarget] = useState<ViewerTarget | null>(null);

  const documentQuery = (nextFolderId = folderId) => ({
    folderId: nextFolderId,
    extension,
    keyword,
    tag: tagFilter,
    favorite: favoriteFilter === '' ? undefined : favoriteFilter === 'true',
    pinned: pinnedFilter === '' ? undefined : pinnedFilter === 'true'
  });

  const loadFolders = async () => {
    const response = await api.folders();
    setFolders(response.folders);
    setMoveTargetId((current) => current || response.folders[0]?.folderId || '');
    return response.folders;
  };

  const loadClassification = async () => {
    const [tagResponse, duplicateResponse] = await Promise.all([api.documentTags(), api.duplicateDocuments()]);
    setTags(tagResponse.items);
    setDuplicates(duplicateResponse.items);
  };

  const loadDocuments = async (nextFolderId = folderId) => {
    const response = await api.documents(documentQuery(nextFolderId));
    setDocuments(response.documents);
    setSelectedIds((current) => current.filter((id) => response.documents.some((document) => document.documentId === id)));
  };

  const load = async () => {
    try {
      setError('');
      const [folderResponse, documentResponse, tagResponse, duplicateResponse] = await Promise.all([
        api.folders(),
        api.documents(documentQuery()),
        api.documentTags(),
        api.duplicateDocuments()
      ]);
      setFolders(folderResponse.folders);
      setMoveTargetId((current) => current || folderResponse.folders[0]?.folderId || '');
      setDocuments(documentResponse.documents);
      setTags(tagResponse.items);
      setDuplicates(duplicateResponse.items);
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
      setError(err instanceof Error ? err.message : '폴더 문서 조회에 실패했습니다.');
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
      setError(err instanceof Error ? err.message : '폴더 생성에 실패했습니다.');
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
      setError(err instanceof Error ? err.message : '폴더명 변경에 실패했습니다.');
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
      setError(err instanceof Error ? err.message : '폴더 삭제에 실패했습니다.');
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
      setError(err instanceof Error ? err.message : '문서명 변경에 실패했습니다.');
    }
  };

  const replaceDocument = (updated: DocumentItem) => {
    setDocuments((current) => current.map((document) => (document.documentId === updated.documentId ? updated : document)));
  };

  const updateMetadata = async (
    document: DocumentItem,
    payload: Partial<Pick<DocumentItem, 'tags' | 'favorite' | 'pinned' | 'memo'>>
  ) => {
    try {
      setError('');
      setMessage('');
      const response = await api.updateDocumentMetadata(document.documentId, payload);
      replaceDocument(response.document);
      setMessage('문서 분류 정보가 수정되었습니다.');
      await loadClassification();
    } catch (err) {
      setError(err instanceof Error ? err.message : '문서 분류 정보 수정에 실패했습니다.');
    }
  };

  const editMetadata = async (document: DocumentItem) => {
    const tagText = window.prompt('태그를 쉼표로 구분해서 입력하세요.', document.tags.join(', '));
    if (tagText === null) return;
    const memoText = window.prompt('문서 메모를 입력하세요.', document.memo || '');
    if (memoText === null) return;
    await updateMetadata(document, { tags: parseTags(tagText), memo: memoText });
  };

  const applyTagsToSelected = async () => {
    const nextTags = parseTags(tagInput);
    if (!selectedIds.length || nextTags.length === 0) return;
    try {
      setError('');
      setMessage('');
      startOperation('선택 문서 태그 적용 중');
      const result = await api.bulkDocumentTags(selectedIds, nextTags, 'add');
      setMessage(`태그 적용 완료: 성공 ${result.successCount}, 실패 ${result.failCount}`);
      setTagInput('');
      await loadDocuments();
      await loadClassification();
    } catch (err) {
      setError(err instanceof Error ? err.message : '태그 일괄 적용에 실패했습니다.');
    } finally {
      endOperation();
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
      setError(err instanceof Error ? err.message : '일괄 이동에 실패했습니다.');
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
      await loadClassification();
    } catch (err) {
      setError(err instanceof Error ? err.message : '일괄 삭제에 실패했습니다.');
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
      await loadClassification();
    } catch (err) {
      setError(err instanceof Error ? err.message : '일괄 인덱스 재생성에 실패했습니다.');
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
      await loadClassification();
    } catch (err) {
      setError(err instanceof Error ? err.message : '문서 삭제에 실패했습니다.');
    }
  };

  const selectedFolder = folders.find((folder) => folder.folderId === folderId);
  const totalFolderDocuments = folders.reduce((sum, folder) => sum + folder.documentCount, 0);

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h1>문서/폴더 관리</h1>
          <p>폴더, 문서, 태그, 즐겨찾기, 중복 파일을 관리합니다.</p>
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
          <form className="filter-bar document-filter-bar classification-filter-bar" onSubmit={submit}>
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
            <select value={tagFilter} onChange={(event) => setTagFilter(event.target.value)}>
              <option value="">전체 태그</option>
              {tags.map((tag) => (
                <option key={tag.tag} value={tag.tag}>
                  {tag.tag} ({tag.count})
                </option>
              ))}
            </select>
            <select value={favoriteFilter} onChange={(event) => setFavoriteFilter(event.target.value)}>
              <option value="">즐겨찾기 전체</option>
              <option value="true">즐겨찾기만</option>
              <option value="false">즐겨찾기 제외</option>
            </select>
            <select value={pinnedFilter} onChange={(event) => setPinnedFilter(event.target.value)}>
              <option value="">고정 전체</option>
              <option value="true">고정만</option>
              <option value="false">고정 제외</option>
            </select>
            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="문서명, 태그, 메모" />
            <button className="icon-text-button primary">조회</button>
          </form>

          <section className="panel bulk-action-panel">
            <div className="bulk-action-header">
              <div>
                <strong>{selectedDocuments.length.toLocaleString()}개 선택</strong>
                <span>선택 문서를 이동, 휴지통 이동, 인덱스 재생성, 태그 적용할 수 있습니다.</span>
              </div>
              <select value={moveTargetId} onChange={(event) => setMoveTargetId(event.target.value)}>
                {folders.map((folder) => (
                  <option key={folder.folderId} value={folder.folderId}>
                    {folder.folderName}
                  </option>
                ))}
              </select>
            </div>
            <div className="bulk-controls">
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
              <div className="bulk-tag-row">
                <input value={tagInput} onChange={(event) => setTagInput(event.target.value)} placeholder="태그, 쉼표 구분" />
                <button className="icon-text-button" disabled={!selectedIds.length || !tagInput.trim()} onClick={applyTagsToSelected}>
                  <Tags size={17} />
                  태그 적용
                </button>
              </div>
            </div>
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
                          <div className="document-title-block">
                            <div className="document-title-line">
                              <span className="document-name-text">{document.displayName}</span>
                              <span className="document-flags">
                                {document.favorite && <Star size={14} />}
                                {document.pinned && <Pin size={14} />}
                              </span>
                            </div>
                            {(document.tags.length > 0 || document.memo) && (
                              <div className="tag-chip-row">
                                {document.tags.map((tag) => (
                                  <span className="tag-chip" key={`${document.documentId}-${tag}`}>
                                    {tag}
                                  </span>
                                ))}
                                {document.memo && <span className="memo-text">{document.memo}</span>}
                              </div>
                            )}
                          </div>
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
                            className={document.favorite ? 'icon-button favorite-active' : 'icon-button'}
                            onClick={() => void updateMetadata(document, { favorite: !document.favorite })}
                            title="즐겨찾기"
                          >
                            <Star size={16} />
                          </button>
                          <button
                            className={document.pinned ? 'icon-button pin-active' : 'icon-button'}
                            onClick={() => void updateMetadata(document, { pinned: !document.pinned })}
                            title="고정"
                          >
                            <Pin size={16} />
                          </button>
                          <button className="icon-button" onClick={() => void editMetadata(document)} title="태그/메모">
                            <Tags size={16} />
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

          <section className="panel">
            <div className="section-header">
              <h2>중복 파일 확인</h2>
              <span>{duplicates.length.toLocaleString()}그룹</span>
            </div>
            {duplicates.length > 0 ? (
              <div className="duplicate-list">
                {duplicates.map((group) => (
                  <div className="duplicate-row" key={group.fileHash}>
                    <div>
                      <strong>{group.count.toLocaleString()}개 문서</strong>
                      <span>{group.fileHash.slice(0, 24)}</span>
                    </div>
                    <ul>
                      {group.documents.map((document) => (
                        <li key={document.documentId}>
                          {document.displayName} · {document.folderName}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty">현재 해시 기준 중복 파일이 없습니다.</div>
            )}
          </section>
        </section>
      </div>

      <DocumentViewerModal target={viewerTarget} onClose={() => setViewerTarget(null)} />
    </section>
  );
}

function parseTags(value: string) {
  const seen = new Set<string>();
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => {
      if (!item) return false;
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return value ? value.slice(0, 16).replace('T', ' ') : '';
}
