import { ExternalLink, RefreshCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { API_BASE_URL, api } from '../api/client';
import { HighlightedText } from '../components/HighlightedText';
import { StatusPill } from '../components/StatusPill';
import type { PreviewResponse } from '../types/models';

const TEXT_PREVIEW_LIMIT = 250;

export default function ViewerPage() {
  const { documentId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [error, setError] = useState('');

  const keyword = searchParams.get('keyword') || '';
  const page = Number(searchParams.get('page') || '1');
  const line = Number(searchParams.get('line') || '0');
  const [focusLine, setFocusLine] = useState<number | null>(null);

  const load = async () => {
    try {
      setError('');
      setPreview(await api.preview(documentId, { line: focusLine || line || undefined, limit: TEXT_PREVIEW_LIMIT }));
    } catch (err) {
      setError(err instanceof Error ? err.message : '문서 미리보기 실패');
    }
  };

  useEffect(() => {
    setFocusLine(line || null);
  }, [documentId, line]);

  useEffect(() => {
    void load();
  }, [documentId, focusLine]);

  useEffect(() => {
    const activeLine = focusLine || line;
    if (!activeLine || !preview) return;
    document.getElementById(`line-${activeLine}`)?.scrollIntoView({ block: 'center' });
  }, [focusLine, line, preview]);

  const pdfUrl = useMemo(() => {
    if (!preview) return '';
    const searchFragment = keyword ? `&search=${encodeURIComponent(keyword)}` : '';
    return `${API_BASE_URL}${preview.fileUrl}#page=${page || 1}${searchFragment}`;
  }, [preview, page, keyword]);

  const activeLine = focusLine || line || null;
  const previewInfo = preview?.previewInfo;
  const canMoveBackward = Boolean(previewInfo?.limited && previewInfo.startLine && previewInfo.startLine > 1);
  const canMoveForward = Boolean(previewInfo?.limited && previewInfo.endLine && previewInfo.endLine < previewInfo.totalLines);

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
          {previewInfo?.limited && (
            <div className="preview-range-banner">
              <span>
                전체 {previewInfo.totalLines.toLocaleString()}줄 중 {previewInfo.startLine?.toLocaleString()}-
                {previewInfo.endLine?.toLocaleString()}줄 표시
              </span>
              <div>
                <button
                  className="icon-text-button"
                  disabled={!canMoveBackward}
                  onClick={() => setFocusLine(Math.max(1, (previewInfo.startLine || 1) - TEXT_PREVIEW_LIMIT))}
                >
                  이전
                </button>
                <button
                  className="icon-text-button"
                  disabled={!canMoveForward}
                  onClick={() => setFocusLine((previewInfo.endLine || 0) + 1)}
                >
                  다음
                </button>
              </div>
            </div>
          )}
          {preview.lines.map((item) => (
            <div
              id={`line-${item.lineNumber}`}
              key={item.lineNumber}
              className={activeLine === item.lineNumber ? 'text-line active-line' : 'text-line'}
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
