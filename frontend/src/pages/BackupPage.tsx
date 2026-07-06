import { Download, Eye, RefreshCcw, RotateCcw, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useOperation } from '../contexts/OperationContext';
import { useToast } from '../contexts/ToastContext';
import type { BackupItem, BackupPreview, BackupValidation } from '../types/models';

export default function BackupPage() {
  const { startOperation, endOperation } = useOperation();
  const { showToast } = useToast();
  const [items, setItems] = useState<BackupItem[]>([]);
  const [validation, setValidation] = useState<Record<string, BackupValidation>>({});
  const [preview, setPreview] = useState<Record<string, BackupPreview>>({});
  const [selectedPreviewId, setSelectedPreviewId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setError('');
      const response = await api.backups();
      setItems(response.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load backups.');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (message) showToast({ type: 'success', title: message, durationMs: 6500 });
  }, [message, showToast]);

  useEffect(() => {
    if (error) showToast({ type: 'error', title: 'Error', message: error, durationMs: 6500 });
  }, [error, showToast]);

  const create = async () => {
    try {
      setError('');
      setMessage('');
      startOperation('Creating full backup');
      const response = await api.createBackup();
      setMessage(`Backup created: ${response.backup.fileName}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create backup.');
    } finally {
      endOperation();
    }
  };

  const validate = async (item: BackupItem) => {
    try {
      setError('');
      setMessage('');
      const response = await api.validateBackup(item.backupId);
      setValidation((current) => ({ ...current, [item.backupId]: response.validation }));
      setMessage(response.validation.valid ? 'Backup validation passed.' : 'Backup validation found issues.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate backup.');
    }
  };

  const loadPreview = async (item: BackupItem) => {
    try {
      setError('');
      const response = await api.previewBackup(item.backupId);
      const nextPreview = { backup: response.backup, validation: response.validation, summary: response.summary };
      setPreview((current) => ({ ...current, [item.backupId]: nextPreview }));
      setValidation((current) => ({ ...current, [item.backupId]: response.validation }));
      setSelectedPreviewId(item.backupId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview backup.');
    }
  };

  const restore = async (item: BackupItem) => {
    try {
      setError('');
      setMessage('');
      startOperation('Checking restore dry-run');
      const dryRun = await api.dryRunRestoreBackup(item.backupId);
      setPreview((current) => ({
        ...current,
        [item.backupId]: { backup: dryRun.backup, validation: dryRun.validation, summary: dryRun.summary }
      }));
      setValidation((current) => ({ ...current, [item.backupId]: dryRun.validation }));
      setSelectedPreviewId(item.backupId);
      if (!dryRun.restorable) {
        setError('Dry-run failed. Restore was not started.');
        return;
      }
      if (!window.confirm(`Restore from ${item.fileName}? Current data will be safety-backed up first.`)) return;
      startOperation('Restoring backup');
      const response = await api.restoreBackup(item.backupId);
      setMessage(`Restore completed. Safety backup: ${response.safetyBackup.fileName}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore backup.');
    } finally {
      endOperation();
    }
  };

  const selectedPreview = selectedPreviewId ? preview[selectedPreviewId] : null;

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h1>Backup / Restore</h1>
          <p>Backup, verify, preview, dry-run, and restore document manager data</p>
        </div>
        <div className="header-actions">
          <button className="icon-text-button" onClick={() => void load()} title="Refresh">
            <RefreshCcw size={17} />
            Refresh
          </button>
          <button className="icon-text-button primary" onClick={create} title="Create backup">
            <ShieldCheck size={17} />
            Full backup
          </button>
        </div>
      </div>

      {message && <div className="alert success">{message}</div>}
      {error && <div className="alert error">{error}</div>}

      {selectedPreview && (
        <section className="panel backup-preview">
          <div className="section-header">
            <h2>Backup preview</h2>
            <span>{selectedPreview.validation.valid ? 'Restorable' : 'Needs attention'}</span>
          </div>
          <div className="stat-grid backup-stat-grid">
            <div className="stat-card">
              <span>Documents</span>
              <strong>{selectedPreview.summary.documentCount.toLocaleString()}</strong>
            </div>
            <div className="stat-card">
              <span>Folders</span>
              <strong>{selectedPreview.summary.folderCount.toLocaleString()}</strong>
            </div>
            <div className="stat-card">
              <span>Search index</span>
              <strong>{selectedPreview.summary.searchIndexCount.toLocaleString()}</strong>
            </div>
            <div className="stat-card">
              <span>Trash</span>
              <strong>{selectedPreview.summary.trashCount.toLocaleString()}</strong>
            </div>
          </div>
          <div className="backup-hash">
            <strong>SHA-256</strong>
            <span>{selectedPreview.validation.sha256 || '-'}</span>
          </div>
        </section>
      )}

      <section className="panel">
        <div className="section-header">
          <h2>Backup history</h2>
          <span>{items.length.toLocaleString()} items</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>File</th>
                <th>Size</th>
                <th>Created</th>
                <th>Status</th>
                <th>Validation</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const result = validation[item.backupId];
                return (
                  <tr key={item.backupId}>
                    <td>{item.fileName}</td>
                    <td>{formatBytes(item.fileSize)}</td>
                    <td>{formatDate(item.createdAt)}</td>
                    <td>{item.status}</td>
                    <td>
                      {result
                        ? result.valid
                          ? `OK (${result.entryCount} entries)`
                          : `Missing ${result.missing.length}, hash ${result.hashMatches === false ? 'mismatch' : 'ok'}`
                        : '-'}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-button" onClick={() => void validate(item)} title="Validate">
                          <ShieldCheck size={16} />
                        </button>
                        <button className="icon-button" onClick={() => void loadPreview(item)} title="Preview">
                          <Eye size={16} />
                        </button>
                        <a className="icon-button" href={api.backupDownloadUrl(item.backupId)} title="Download">
                          <Download size={16} />
                        </a>
                        <button className="icon-button success" onClick={() => void restore(item)} title="Dry-run and restore">
                          <RotateCcw size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty">
                    No backups.
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

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return value ? value.slice(0, 16).replace('T', ' ') : '';
}
