import { Save } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../contexts/ToastContext';
import type { AppConfig } from '../types/models';

export default function SettingsPage() {
  const { showToast } = useToast();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [extensions, setExtensions] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .config()
      .then((response) => {
        setConfig(response);
        setExtensions(response.allowedExtensions.join(','));
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (message) showToast({ type: 'success', title: message });
  }, [message, showToast]);

  useEffect(() => {
    if (error) showToast({ type: 'error', title: 'Error', message: error, durationMs: 6500 });
  }, [error, showToast]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!config) return;
    try {
      setError('');
      const response = await api.updateConfig({
        ...config,
        allowedExtensions: extensions
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      });
      setConfig(response.config);
      setExtensions(response.config.allowedExtensions.join(','));
      setMessage('Settings saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings.');
    }
  };

  if (!config) {
    return (
      <section className="page">
        <div className="page-header">
          <div>
            <h1>Settings</h1>
            <p>Storage, import, retention, and operation policy</p>
          </div>
        </div>
        {error ? <div className="alert error">{error}</div> : <div className="empty panel">Loading settings.</div>}
      </section>
    );
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Storage, import, retention, and operation policy</p>
        </div>
      </div>

      {message && <div className="alert success">{message}</div>}
      {error && <div className="alert error">{error}</div>}

      <form className="panel settings-form" onSubmit={save}>
        <label>
          Storage root
          <input value={config.storageRootPath} onChange={(event) => setConfig({ ...config, storageRootPath: event.target.value })} />
        </label>
        <label>
          Index root
          <input value={config.indexRootPath} onChange={(event) => setConfig({ ...config, indexRootPath: event.target.value })} />
        </label>
        <label>
          Log root
          <input value={config.logRootPath} onChange={(event) => setConfig({ ...config, logRootPath: event.target.value })} />
        </label>
        <label>
          Trash root
          <input value={config.trashRootPath} onChange={(event) => setConfig({ ...config, trashRootPath: event.target.value })} />
        </label>
        <label>
          Backup root
          <input value={config.backupRootPath} onChange={(event) => setConfig({ ...config, backupRootPath: event.target.value })} />
        </label>
        <label>
          Import root
          <input value={config.importRootPath} onChange={(event) => setConfig({ ...config, importRootPath: event.target.value })} />
        </label>
        <label>
          Allowed extensions
          <input value={extensions} onChange={(event) => setExtensions(event.target.value)} />
        </label>
        <label>
          Max upload MB
          <input
            type="number"
            min={1}
            value={config.maxUploadSizeMB}
            onChange={(event) => setConfig({ ...config, maxUploadSizeMB: Number(event.target.value) })}
          />
        </label>
        <label>
          Max import files
          <input
            type="number"
            min={1}
            value={config.maxImportFileCount}
            onChange={(event) => setConfig({ ...config, maxImportFileCount: Number(event.target.value) })}
          />
        </label>
        <label>
          Max import total MB
          <input
            type="number"
            min={1}
            value={config.maxImportTotalSizeMB}
            onChange={(event) => setConfig({ ...config, maxImportTotalSizeMB: Number(event.target.value) })}
          />
        </label>
        <label>
          Default folder
          <input value={config.defaultFolderName} onChange={(event) => setConfig({ ...config, defaultFolderName: event.target.value })} />
        </label>
        <label>
          Unclassified folder
          <input
            value={config.unclassifiedFolderName}
            onChange={(event) => setConfig({ ...config, unclassifiedFolderName: event.target.value })}
          />
        </label>
        <label>
          Duplicate policy
          <select
            value={config.duplicatePolicy}
            onChange={(event) => setConfig({ ...config, duplicatePolicy: event.target.value as AppConfig['duplicatePolicy'] })}
          >
            <option value="block">Block</option>
            <option value="auto_rename">Auto rename</option>
          </select>
        </label>
        <label>
          Backup retention count
          <input
            type="number"
            min={1}
            value={config.backupRetentionCount}
            onChange={(event) => setConfig({ ...config, backupRetentionCount: Number(event.target.value) })}
          />
        </label>
        <label>
          Backup retention days
          <input
            type="number"
            min={1}
            value={config.backupRetentionDays}
            onChange={(event) => setConfig({ ...config, backupRetentionDays: Number(event.target.value) })}
          />
        </label>
        <label>
          Trash retention days
          <input
            type="number"
            min={1}
            value={config.trashRetentionDays}
            onChange={(event) => setConfig({ ...config, trashRetentionDays: Number(event.target.value) })}
          />
        </label>
        <label>
          Log retention days
          <input
            type="number"
            min={1}
            value={config.logRetentionDays}
            onChange={(event) => setConfig({ ...config, logRetentionDays: Number(event.target.value) })}
          />
        </label>
        <label>
          Search history limit
          <input
            type="number"
            min={1}
            value={config.searchHistoryLimit}
            onChange={(event) => setConfig({ ...config, searchHistoryLimit: Number(event.target.value) })}
          />
        </label>
        <div className="settings-toggles">
          <label className="check-row">
            <input
              type="checkbox"
              checked={config.enableHighlight}
              onChange={(event) => setConfig({ ...config, enableHighlight: event.target.checked })}
            />
            Highlight
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={config.enableAuditLog}
              onChange={(event) => setConfig({ ...config, enableAuditLog: event.target.checked })}
            />
            Audit log
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={config.allowAbsoluteImportPath}
              onChange={(event) => setConfig({ ...config, allowAbsoluteImportPath: event.target.checked })}
            />
            Absolute import path
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={config.followSymlinks}
              onChange={(event) => setConfig({ ...config, followSymlinks: event.target.checked })}
            />
            Follow symlinks
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={config.excludeHiddenFiles}
              onChange={(event) => setConfig({ ...config, excludeHiddenFiles: event.target.checked })}
            />
            Exclude hidden files
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={config.autoRepairAfterIntegrityCheck}
              onChange={(event) => setConfig({ ...config, autoRepairAfterIntegrityCheck: event.target.checked })}
            />
            Auto repair after integrity check
          </label>
        </div>
        <button className="icon-text-button primary" title="Save settings">
          <Save size={17} />
          Save
        </button>
      </form>
    </section>
  );
}
