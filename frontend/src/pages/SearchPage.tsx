import { Eye, Search } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';
import { DocumentViewerModal, type ViewerTarget } from '../components/DocumentViewerModal';
import { HighlightedText } from '../components/HighlightedText';
import type { DocumentItem, Folder, SearchResult } from '../types/models';

export default function SearchPage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [keyword, setKeyword] = useState('');
  const [scope, setScope] = useState('all');
  const [folderId, setFolderId] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [extension, setExtension] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [exactMatch, setExactMatch] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState('');
  const [viewerTarget, setViewerTarget] = useState<ViewerTarget | null>(null);

  useEffect(() => {
    Promise.all([api.folders(), api.documents()])
      .then(([folderResponse, documentResponse]) => {
        setFolders(folderResponse.folders);
        setDocuments(documentResponse.documents);
      })
      .catch((err) => setError(err.message));
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setError('');
      const response = await api.search({
        keyword,
        scope,
        folderId: scope === 'folder' ? folderId : undefined,
        documentId: scope === 'document' ? documentId : undefined,
        extension,
        caseSensitive,
        exactMatch
      });
      setResults(response.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : '검색 실패');
    }
  };

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h1>문서 검색</h1>
          <p>키워드, 범위, 파일 유형 기반 검색</p>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      <form className="search-panel" onSubmit={submit}>
        <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="검색어" />
        <select value={scope} onChange={(event) => setScope(event.target.value)}>
          <option value="all">전체</option>
          <option value="folder">폴더</option>
          <option value="document">문서</option>
        </select>
        {scope === 'folder' && (
          <select value={folderId} onChange={(event) => setFolderId(event.target.value)}>
            <option value="">폴더 선택</option>
            {folders.map((folder) => (
              <option key={folder.folderId} value={folder.folderId}>
                {folder.folderName}
              </option>
            ))}
          </select>
        )}
        {scope === 'document' && (
          <select value={documentId} onChange={(event) => setDocumentId(event.target.value)}>
            <option value="">문서 선택</option>
            {documents.map((document) => (
              <option key={document.documentId} value={document.documentId}>
                {document.displayName}
              </option>
            ))}
          </select>
        )}
        <select value={extension} onChange={(event) => setExtension(event.target.value)}>
          <option value="">전체 유형</option>
          <option value="pdf">PDF</option>
          <option value="md">MD</option>
          <option value="txt">TXT</option>
        </select>
        <label className="check-row">
          <input type="checkbox" checked={caseSensitive} onChange={(event) => setCaseSensitive(event.target.checked)} />
          대소문자
        </label>
        <label className="check-row">
          <input type="checkbox" checked={exactMatch} onChange={(event) => setExactMatch(event.target.checked)} />
          정확히
        </label>
        <button className="icon-text-button primary" title="검색">
          <Search size={17} />
          검색
        </button>
      </form>

      <section className="panel">
        <div className="section-header">
          <h2>검색 결과</h2>
          <span>{results.length.toLocaleString()}건</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>문서명</th>
                <th>폴더</th>
                <th>유형</th>
                <th>위치</th>
                <th>내용</th>
                <th>열기</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, index) => (
                <tr key={`${result.documentId}-${result.pageNumber}-${result.lineNumber}-${index}`}>
                  <td>{result.displayName}</td>
                  <td>{result.folderName}</td>
                  <td className="uppercase">{result.extension}</td>
                  <td>{formatLocation(result)}</td>
                  <td className="snippet">
                    <HighlightedText text={result.snippet} keyword={keyword} />
                  </td>
                  <td>
                    <button
                      className="icon-button"
                      onClick={() =>
                        setViewerTarget({
                          documentId: result.documentId,
                          keyword,
                          page: result.pageNumber,
                          line: result.lineNumber
                        })
                      }
                      title="열기"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {results.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty">
                    검색 결과가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <DocumentViewerModal target={viewerTarget} onClose={() => setViewerTarget(null)} />
    </section>
  );
}

function formatLocation(result: SearchResult) {
  if (result.pageNumber) return `${result.pageNumber}페이지`;
  if (result.lineNumber) return `${result.lineNumber}줄`;
  return '-';
}
