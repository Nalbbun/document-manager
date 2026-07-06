import { RefreshCcw, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useOperation } from '../contexts/OperationContext';
import { useToast } from '../contexts/ToastContext';
import type { Folder, TrashItem } from '../types/models';

type ConflictPolicy = 'block' | 'auto_rename' | 'select_folder';

export default function TrashPage() {
  const { startOperation, endOperation } = useOperation();
  const { showToast } = useToast();
  const [items, setItems] = useState<TrashItem[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [restoreFolderId, setRestoreFolderId] = useState('');
  const [conflictPolicy, setConflictPolicy] = useState<ConflictPolicy>('auto_rename');
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
      setError(err instanceof Error ? err.message : 'Failed to load trash.');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (message) showToast({ type: 'success', title: message });
  }, [message, showToast]);

  useEffect(() => {
    if (error) showToast({ type: 'error', title: 'Error', message: error, durationMs: 6500 });
  }, [error, showToast]);

  const restore = async (item: TrashItem) => {
    const targetFolderId = restoreFolderId || undefined;
    if (!window.confirm(`Restore ${item.fileName}?`)) return;
    try {
      setError('');
      setMessage('');
      startOperation('Restoring document');
      const response = await api.restoreTrashItem(item.trashId, targetFolderId, conflictPolicy);
      setMessage(`Restored: ${response.document.displayName}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore document.');
    } finally {
      endOperation();
    }
  };

  const remove = async (item: TrashItem) => {
    if (!window.confirm(`Permanently delete ${item.fileName}? This cannot be undone.`)) return;
    try {
      setError('');
      setMessage('');
      startOperation('Deleting document permanently');
      await api.deleteTrashItem(item.trashId);
      setMessage('Document permanently deleted.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document.');
    } finally {
      endOperation();
    }
  };

  const empty = async () => {
    if (!items.length) return;
    if (!window.confirm(`Permanently delete ${items.length} trash items?`)) return;
    try {
      setError('');
      setMessage('');
      startOperation('Emptying trash');
      const result = await api.emptyTrash();
      setMessage(`Trash emptied: success ${result.successCount}, failed ${result.failCount}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to empty trash.');
    } finally {
      endOperation();
    }
  };

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h1>Trash</h1>
          <p>Restore or permanently delete removed documents</p>
        </div>
        <div className="header-actions">
          <button className="icon-text-button" onClick={() => void load()} title="Refresh">
            <RefreshCcw size={17} />
            Refresh
          </button>
          <button className="icon-text-button danger" disabled={!items.length} onClick={empty} title="Empty trash">
            <Trash2 size={17} />
            Empty
          </button>
        </div>
      </div>

      {message && <div className="alert success">{message}</div>}
      {error && <div className="alert error">{error}</div>}

      <section className="panel trash-toolbar">
        <label>
          Restore folder
          <select value={restoreFolderId} onChange={(event) => setRestoreFolderId(event.target.value)}>
            {folders.map((folder) => (
              <option key={folder.folderId} value={folder.folderId}>
                {folder.folderName}
              </option>
            ))}
          </select>
        </label>
        <label>
          Conflict policy
          <select value={conflictPolicy} onChange={(event) => setConflictPolicy(event.target.value as ConflictPolicy)}>
            <option value="auto_rename">Auto rename</option>
            <option value="block">Block</option>
            <option value="select_folder">Require selected folder</option>
          </select>
        </label>
      </section>

      <section className="panel">
        <div className="section-header">
          <h2>Deleted documents</h2>
          <span>{items.length.toLocaleString()} items</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Document</th>
                <th>Original folder</th>
                <th>Deleted at</th>
                <th>Original path</th>
                <th>Actions</th>
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
                      <button className="icon-button success" onClick={() => void restore(item)} title="Restore">
                        <RotateCcw size={16} />
                      </button>
                      <button className="icon-button danger" onClick={() => void remove(item)} title="Delete permanently">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty">
                    Trash is empty.
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
