import { ExternalLink, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL, api } from '../api/client';
import { HighlightedText } from './HighlightedText';
import { StatusPill } from './StatusPill';
import type { PreviewResponse } from '../types/models';

export type ViewerTarget = {
  documentId: string;
  keyword?: string;
  page?: number | null;
  line?: number | null;
};

const TEXT_PREVIEW_LIMIT = 250;

export function DocumentViewerModal({ target, onClose }: { target: ViewerTarget | null; onClose: () => void }) {
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [error, setError] = useState('');
  const [focusLine, setFocusLine] = useState<number | null>(null);

  useEffect(() => {
    if (!target) {
      setFocusLine(null);
      return;
    }
    setFocusLine(target.line || null);
  }, [target?.documentId, target?.line]);

  useEffect(() => {
    if (!target) return;
    setPreview(null);
    setError('');
    api
      .preview(target.documentId, { line: focusLine || target.line || undefined, limit: TEXT_PREVIEW_LIMIT })
      .then(setPreview)
      .catch((err) => setError(err instanceof Error ? err.message : '문서 미리보기 실패'));
  }, [target?.documentId, target?.line, focusLine]);

  useEffect(() => {
    const activeLine = focusLine || target?.line;
    if (!activeLine || !preview) return;
    document.getElementById(`modal-line-${activeLine}`)?.scrollIntoView({ block: 'center' });
  }, [focusLine, target?.line, preview]);

  useEffect(() => {
    if (!target) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [target, onClose]);

  const pdfUrl = useMemo(() => {
    if (!preview || !target) return '';
    const page = target.page || 1;
    const searchFragment = target.keyword ? `&search=${encodeURIComponent(target.keyword)}` : '';
    return `${API_BASE_URL}${preview.fileUrl}#page=${page}${searchFragment}`;
  }, [preview, target]);

  if (!target) return null;

  const activeLine = focusLine || target.line || null;
  const previewInfo = preview?.previewInfo;
  const canMoveBackward = Boolean(previewInfo?.limited && previewInfo.startLine && previewInfo.startLine > 1);
  const canMoveForward = Boolean(previewInfo?.limited && previewInfo.endLine && previewInfo.endLine < previewInfo.totalLines);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="viewer-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{preview?.document.displayName || '문서 뷰어'}</h2>
            <p>
              {preview?.document.folderName || ''} {preview?.document.extension ? `· ${preview.document.extension.toUpperCase()}` : ''}
            </p>
          </div>
          <div className="modal-actions">
            {preview && <StatusPill status={preview.document.indexStatus} />}
            {preview && (
              <a className="icon-text-button" href={`${API_BASE_URL}${preview.fileUrl}`} target="_blank" rel="noreferrer">
                <ExternalLink size={17} />
                원본
              </a>
            )}
            <button className="icon-button" onClick={onClose} title="닫기">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="modal-body">
          {error && <div className="alert error">{error}</div>}
          {!preview && !error && <div className="empty panel">문서를 불러오는 중입니다.</div>}
          {preview?.viewerType === 'pdf' && <iframe className="modal-pdf-frame" src={pdfUrl} title={preview.document.displayName} />}
          {preview?.viewerType === 'text' && (
            <section className="text-viewer modal-text-viewer">
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
                  id={`modal-line-${item.lineNumber}`}
                  key={item.lineNumber}
                  className={activeLine === item.lineNumber ? 'text-line active-line' : 'text-line'}
                >
                  <span>{item.lineNumber}</span>
                  <p>
                    <HighlightedText text={item.text} keyword={target.keyword} />
                  </p>
                </div>
              ))}
            </section>
          )}
        </div>
      </section>
    </div>
  );
}
