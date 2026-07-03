import { ExternalLink, RefreshCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { API_BASE_URL, api } from '../api/client';
import { HighlightedText } from '../components/HighlightedText';
import { StatusPill } from '../components/StatusPill';
import type { PreviewResponse } from '../types/models';

export default function ViewerPage() {
  const { documentId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [error, setError] = useState('');

  const keyword = searchParams.get('keyword') || '';
  const page = Number(searchParams.get('page') || '1');
  const line = Number(searchParams.get('line') || '0');

  const load = async () => {
    try {
      setError('');
      setPreview(await api.preview(documentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : '문서 미리보기 실패');
    }
  };

  useEffect(() => {
    void load();
  }, [documentId]);

  useEffect(() => {
    if (!line || !preview) return;
    document.getElementById(`line-${line}`)?.scrollIntoView({ block: 'center' });
  }, [line, preview]);

  const pdfUrl = useMemo(() => {
    if (!preview) return '';
    const searchFragment = keyword ? `&search=${encodeURIComponent(keyword)}` : '';
    return `${API_BASE_URL}${preview.fileUrl}#page=${page || 1}${searchFragment}`;
  }, [preview, page, keyword]);

  return (
    <section className="page viewer-page">
      <div className="page-header">
        <div>
          <h1>{preview?.document.displayName || '문서 뷰어'}</h1>
          <p>
            {preview?.document.folderName || ''} {preview?.document.extension ? `· ${preview.document.extension.toUpperCase()}` : ''}
          </p>
        </div>
        <div className="header-actions">
          {preview && <StatusPill status={preview.document.indexStatus} />}
          <button className="icon-text-button" onClick={load} title="새로고침">
            <RefreshCcw size={17} />
            새로고침
          </button>
          {preview && (
            <a className="icon-text-button" href={`${API_BASE_URL}${preview.fileUrl}`} target="_blank" rel="noreferrer">
              <ExternalLink size={17} />
              원본
            </a>
          )}
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      {preview?.viewerType === 'pdf' && <iframe className="pdf-frame" src={pdfUrl} title={preview.document.displayName} />}

      {preview?.viewerType === 'text' && (
        <section className="text-viewer">
          {preview.lines.map((item) => (
            <div
              id={`line-${item.lineNumber}`}
              key={item.lineNumber}
              className={line === item.lineNumber ? 'text-line active-line' : 'text-line'}
            >
              <span>{item.lineNumber}</span>
              <p>
                <HighlightedText text={item.text} keyword={keyword} />
              </p>
            </div>
          ))}
        </section>
      )}

      {!preview && !error && <div className="empty panel">문서를 불러오는 중입니다.</div>}

      <div className="footer-link">
        <Link to="/documents">문서 목록</Link>
      </div>
    </section>
  );
}
