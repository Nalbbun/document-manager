import { Download, RefreshCcw, RotateCcw, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useOperation } from '../contexts/OperationContext';
import type { BackupItem, BackupValidation } from '../types/models';

export default function BackupPage() {
  const { startOperation, endOperation } = useOperation();
  const [items, setItems] = useState<BackupItem[]>([]);
  const [validation, setValidation] = useState<Record<string, BackupValidation>>({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setError('');
      const response = await api.backups();
      setItems(response.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : '백업 이력을 불러오지 못했습니다.');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    try {
      setError('');
      setMessage('');
      startOperation('전체 백업 생성 중');
      const response = await api.createBackup();
      setMessage(`${response.backup.fileName} 백업이 생성되었습니다.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '백업 생성 실패');
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
      setMessage(response.validation.valid ? '백업 검증이 통과되었습니다.' : '백업 검증에서 누락 항목이 발견되었습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '백업 검증 실패');
    }
  };

  const restore = async (item: BackupItem) => {
    if (!window.confirm(`${item.fileName} 백업으로 복원할까요? 현재 데이터는 자동 백업 후 복원됩니다.`)) return;
    try {
      setError('');
      setMessage('');
      startOperation('백업 복원 중');
      const response = await api.restoreBackup(item.backupId);
      setMessage(`복원이 완료되었습니다. 복원 전 안전 백업: ${response.safetyBackup.fileName}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '백업 복원 실패');
    } finally {
      endOperation();
    }
  };

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h1>백업/복원</h1>
          <p>문서, 인덱스, 설정, 로그, 휴지통 데이터를 ZIP으로 백업하고 복원합니다.</p>
        </div>
        <div className="header-actions">
          <button className="icon-text-button" onClick={() => void load()} title="새로고침">
            <RefreshCcw size={17} />
            새로고침
          </button>
          <button className="icon-text-button primary" onClick={create} title="전체 백업">
            <ShieldCheck size={17} />
            전체 백업
          </button>
        </div>
      </div>

      {message && <div className="alert success">{message}</div>}
      {error && <div className="alert error">{error}</div>}

      <section className="panel">
        <div className="section-header">
          <h2>백업 이력</h2>
          <span>{items.length.toLocaleString()}개</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>파일명</th>
                <th>크기</th>
                <th>생성일</th>
                <th>상태</th>
                <th>검증</th>
                <th>작업</th>
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
                          ? `정상 (${result.entryCount}개 항목)`
                          : `누락 ${result.missing.length}개`
                        : '-'}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-button" onClick={() => void validate(item)} title="검증">
                          <ShieldCheck size={16} />
                        </button>
                        <a className="icon-button" href={api.backupDownloadUrl(item.backupId)} title="다운로드">
                          <Download size={16} />
                        </a>
                        <button className="icon-button success" onClick={() => void restore(item)} title="복원">
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
                    생성된 백업이 없습니다.
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
