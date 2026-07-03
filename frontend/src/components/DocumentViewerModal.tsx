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

export function DocumentViewerModal({ target, onClose }: { target: ViewerTarget | null; onClose: () => void }) {
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!target) return;
    setPreview(null);
    setError('');
    api
      .preview(target.documentId)
      .then(setPreview)
      .catch((err) => setError(err instanceof Error ? err.message : '문서 미리보기 실패'));
  }, [target]);

  useEffect(() => {
    if (!target?.line || !preview) return;
    document.getElementById(`modal-line-${target.line}`)?.scrollIntoView({ block: 'center' });
  }, [target?.line, preview]);

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
              {preview.lines.map((item) => (
                <div
                  id={`modal-line-${item.lineNumber}`}
                  key={item.lineNumber}
                  className={target.line === item.lineNumber ? 'text-line active-line' : 'text-line'}
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
