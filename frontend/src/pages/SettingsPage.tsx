import { Save } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { AppConfig } from '../types/models';

export default function SettingsPage() {
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
      setMessage('설정이 저장되었습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '설정 저장 실패');
    }
  };

  if (!config) {
    return (
      <section className="page">
        <div className="page-header">
          <div>
            <h1>환경 설정</h1>
            <p>저장 경로와 등록 정책</p>
          </div>
        </div>
        {error ? <div className="alert error">{error}</div> : <div className="empty panel">설정을 불러오는 중입니다.</div>}
      </section>
    );
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h1>환경 설정</h1>
          <p>저장 경로와 등록 정책</p>
        </div>
      </div>

      {message && <div className="alert success">{message}</div>}
      {error && <div className="alert error">{error}</div>}

      <form className="panel settings-form" onSubmit={save}>
        <label>
          저장 루트
          <input value={config.storageRootPath} onChange={(event) => setConfig({ ...config, storageRootPath: event.target.value })} />
        </label>
        <label>
          인덱스 루트
          <input value={config.indexRootPath} onChange={(event) => setConfig({ ...config, indexRootPath: event.target.value })} />
        </label>
        <label>
          로그 루트
          <input value={config.logRootPath} onChange={(event) => setConfig({ ...config, logRootPath: event.target.value })} />
        </label>
        <label>
          휴지통 루트
          <input value={config.trashRootPath} onChange={(event) => setConfig({ ...config, trashRootPath: event.target.value })} />
        </label>
        <label>
          백업 루트
          <input value={config.backupRootPath} onChange={(event) => setConfig({ ...config, backupRootPath: event.target.value })} />
        </label>
        <label>
          허용 확장자
          <input value={extensions} onChange={(event) => setExtensions(event.target.value)} />
        </label>
        <label>
          최대 업로드 MB
          <input
            type="number"
            min={1}
            value={config.maxUploadSizeMB}
            onChange={(event) => setConfig({ ...config, maxUploadSizeMB: Number(event.target.value) })}
          />
        </label>
        <label>
          기본 폴더명
          <input value={config.defaultFolderName} onChange={(event) => setConfig({ ...config, defaultFolderName: event.target.value })} />
        </label>
        <label>
          미분류 폴더명
          <input
            value={config.unclassifiedFolderName}
            onChange={(event) => setConfig({ ...config, unclassifiedFolderName: event.target.value })}
          />
        </label>
        <div className="settings-toggles">
          <label className="check-row">
            <input
              type="checkbox"
              checked={config.enableHighlight}
              onChange={(event) => setConfig({ ...config, enableHighlight: event.target.checked })}
            />
            하이라이트
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={config.enableAuditLog}
              onChange={(event) => setConfig({ ...config, enableAuditLog: event.target.checked })}
            />
            감사 로그
          </label>
        </div>
        <button className="icon-text-button primary" title="설정 저장">
          <Save size={17} />
          저장
        </button>
      </form>
    </section>
  );
}
