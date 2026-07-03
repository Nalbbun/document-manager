import { RefreshCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api/client';

type LogType = 'app' | 'error' | 'audit';

export default function LogsPage() {
  const [type, setType] = useState<LogType>('app');
  const [lines, setLines] = useState<string[]>([]);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setError('');
      const response = await api.log(type, 300);
      setLines(response.lines);
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그 조회 실패');
    }
  };

  useEffect(() => {
    void load();
  }, [type]);

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h1>로그 조회</h1>
          <p>처리, 오류, 감사 로그</p>
        </div>
        <div className="header-actions">
          <select value={type} onChange={(event) => setType(event.target.value as LogType)}>
            <option value="app">app.log</option>
            <option value="error">error.log</option>
            <option value="audit">audit.log</option>
          </select>
          <button className="icon-text-button" onClick={load} title="새로고침">
            <RefreshCcw size={17} />
            새로고침
          </button>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      <pre className="log-viewer">{lines.length ? lines.join('\n') : '로그가 없습니다.'}</pre>
    </section>
  );
}

