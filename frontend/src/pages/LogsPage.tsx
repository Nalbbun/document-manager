import { Archive, Download, RefreshCcw, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useOperation } from '../contexts/OperationContext';
import { useToast } from '../contexts/ToastContext';

type LogType = 'app' | 'error' | 'audit';

export default function LogsPage() {
  const { startOperation, endOperation } = useOperation();
  const { showToast } = useToast();
  const [type, setType] = useState<LogType>('app');
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('');
  const [lines, setLines] = useState<string[]>([]);
  const [totalMatched, setTotalMatched] = useState(0);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setError('');
      const response = await api.log(type, 500, { q: query, level });
      setLines(response.lines);
      setTotalMatched(response.totalMatched ?? response.lines.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs.');
    }
  };

  useEffect(() => {
    void load();
  }, [type]);

  useEffect(() => {
    if (error) showToast({ type: 'error', title: 'Error', message: error, durationMs: 6500 });
  }, [error, showToast]);

  const archive = async () => {
    try {
      setError('');
      startOperation('Archiving log file');
      const response = await api.archiveLog(type);
      showToast({
        type: 'success',
        title: 'Log archived.',
        message: response.archive.archivePath
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive log.');
    } finally {
      endOperation();
    }
  };

  const clear = async () => {
    if (!window.confirm(`Clear ${type}.log?`)) return;
    try {
      setError('');
      startOperation('Clearing log file');
      await api.clearLog(type);
      showToast({ type: 'success', title: 'Log cleared.' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear log.');
    } finally {
      endOperation();
    }
  };

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h1>Logs</h1>
          <p>Search, download, archive, and clear application logs</p>
        </div>
        <div className="header-actions">
          <select value={type} onChange={(event) => setType(event.target.value as LogType)}>
            <option value="app">app.log</option>
            <option value="error">error.log</option>
            <option value="audit">audit.log</option>
          </select>
          <button className="icon-text-button" onClick={() => void load()} title="Refresh">
            <RefreshCcw size={17} />
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      <form
        className="panel log-toolbar"
        onSubmit={(event) => {
          event.preventDefault();
          void load();
        }}
      >
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Keyword" />
        <select value={level} onChange={(event) => setLevel(event.target.value)}>
          <option value="">All levels</option>
          <option value="INFO">INFO</option>
          <option value="WARNING">WARNING</option>
          <option value="ERROR">ERROR</option>
          <option value="SUCCESS">SUCCESS</option>
          <option value="FAILURE">FAILURE</option>
        </select>
        <button className="icon-text-button primary" title="Search logs">
          <Search size={17} />
          Search
        </button>
        <a className="icon-text-button" href={api.logDownloadUrl(type)} title="Download log">
          <Download size={17} />
          Download
        </a>
        <button className="icon-text-button" type="button" onClick={() => void archive()} title="Archive log">
          <Archive size={17} />
          Archive
        </button>
        <button className="icon-text-button danger" type="button" onClick={() => void clear()} title="Clear log">
          <Trash2 size={17} />
          Clear
        </button>
      </form>

      <div className="section-header">
        <h2>{type}.log</h2>
        <span>{totalMatched.toLocaleString()} matched</span>
      </div>
      <pre className="log-viewer">{lines.length ? lines.join('\n') : 'No log lines.'}</pre>
    </section>
  );
}
