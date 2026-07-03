import { RefreshCcw, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useOperation } from '../contexts/OperationContext';
import type { Folder, TrashItem } from '../types/models';

export default function TrashPage() {
  const { startOperation, endOperation } = useOperation();
  const [items, setItems] = useState<TrashItem[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [restoreFolderId, setRestoreFolderId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setError('');
      const [trashResponse, folderResponse] = await Promise.all([api.trash(), api.folders()]);
      setItems(trashResponse.items);
      setFolders(folderResponse.folders);
      setRestoreFolderId((current) => current || folderResponse.folders[0]?.folderId || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : '휴지통 정보를 불러오지 못했습니다.');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const restore = async (item: TrashItem) => {
    const targetFolderId = restoreFolderId || undefined;
    if (!window.confirm(`${item.fileName} 문서를 복원할까요?`)) return;
    try {
      setError('');
      setMessage('');
      startOperation('문서 복원 중');
      await api.restoreTrashItem(item.trashId, targetFolderId);
      setMessage('문서가 복원되었습니다.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '문서 복원 실패');
    } finally {
      endOperation();
    }
  };

  const remove = async (item: TrashItem) => {
    if (!window.confirm(`${item.fileName} 문서를 영구 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) return;
    try {
      setError('');
      setMessage('');
      startOperation('문서 영구 삭제 중');
      await api.deleteTrashItem(item.trashId);
      setMessage('문서가 영구 삭제되었습니다.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '영구 삭제 실패');
    } finally {
      endOperation();
    }
  };

  const empty = async () => {
    if (!items.length) return;
    if (!window.confirm(`휴지통 문서 ${items.length}건을 모두 영구 삭제할까요?`)) return;
    try {
      setError('');
      setMessage('');
      startOperation('휴지통 비우는 중');
      const result = await api.emptyTrash();
      setMessage(`휴지통 비우기 완료: 성공 ${result.successCount}, 실패 ${result.failCount}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '휴지통 비우기 실패');
    } finally {
      endOperation();
    }
  };

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h1>휴지통</h1>
          <p>삭제된 문서를 복원하거나 영구 삭제합니다.</p>
        </div>
        <div className="header-actions">
          <button className="icon-text-button" onClick={() => void load()} title="새로고침">
            <RefreshCcw size={17} />
            새로고침
          </button>
          <button className="icon-text-button danger" disabled={!items.length} onClick={empty} title="휴지통 비우기">
            <Trash2 size={17} />
            비우기
          </button>
        </div>
      </div>

      {message && <div className="alert success">{message}</div>}
      {error && <div className="alert error">{error}</div>}

      <section className="panel trash-toolbar">
        <label>
          복원 대상 폴더
          <select value={restoreFolderId} onChange={(event) => setRestoreFolderId(event.target.value)}>
            {folders.map((folder) => (
              <option key={folder.folderId} value={folder.folderId}>
                {folder.folderName}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="panel">
        <div className="section-header">
          <h2>삭제 문서</h2>
          <span>{items.length.toLocaleString()}개</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>문서명</th>
                <th>원래 폴더</th>
                <th>삭제일</th>
                <th>원래 경로</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.trashId}>
                  <td>{item.fileName}</td>
                  <td>{item.originalFolderName}</td>
                  <td>{formatDate(item.deletedAt)}</td>
                  <td className="mono-cell">{item.originalPath}</td>
                  <td>
                    <div className="row-actions">
                      <button className="icon-button success" onClick={() => void restore(item)} title="복원">
                        <RotateCcw size={16} />
                      </button>
                      <button className="icon-button danger" onClick={() => void remove(item)} title="영구 삭제">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty">
                    휴지통이 비어 있습니다.
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

function formatDate(value: string) {
  return value ? value.slice(0, 16).replace('T', ' ') : '';
}
