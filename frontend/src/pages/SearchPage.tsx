import { Clock, Download, Eye, RotateCcw, Search, Trash2 } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { DocumentViewerModal, type ViewerTarget } from '../components/DocumentViewerModal';
import { HighlightedText } from '../components/HighlightedText';
import { Pagination } from '../components/Pagination';
import { useToast } from '../contexts/ToastContext';
import type { DocumentItem, Folder, SearchHistoryItem, SearchResult, TagSummary } from '../types/models';

type SearchParams = Record<string, string | boolean | undefined | null>;

export default function SearchPage() {
  const { showToast } = useToast();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [tags, setTags] = useState<TagSummary[]>([]);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [keyword, setKeyword] = useState('');
  const [excludeKeyword, setExcludeKeyword] = useState('');
  const [scope, setScope] = useState('all');
  const [folderId, setFolderId] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [extension, setExtension] = useState('');
  const [tag, setTag] = useState('');
  const [matchMode, setMatchMode] = useState('contains');
  const [sort, setSort] = useState('relevance');
  const [favoriteFilter, setFavoriteFilter] = useState('');
  const [pinnedFilter, setPinnedFilter] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [exactMatch, setExactMatch] = useState(false);
  const [resultKeyword, setResultKeyword] = useState('');
  const [resultCount, setResultCount] = useState(0);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [error, setError] = useState('');
  const [viewerTarget, setViewerTarget] = useState<ViewerTarget | null>(null);

  const loadBaseData = async () => {
    const [folderResponse, documentResponse, tagResponse, historyResponse] = await Promise.all([
      api.folders(),
      api.documents(),
      api.documentTags(),
      api.searchHistory()
    ]);
    setFolders(folderResponse.folders);
    setDocuments(documentResponse.documents);
    setTags(tagResponse.items);
    setHistory(historyResponse.items);
  };

  useEffect(() => {
    loadBaseData().catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!error) return;
    showToast({ type: 'error', title: '오류', message: error, durationMs: 6500 });
  }, [error, showToast]);

  const filteredDocuments = useMemo(() => {
    if (scope !== 'document' || !folderId) return documents;
    return documents.filter((document) => document.folderId === folderId);
  }, [documents, folderId, scope]);

  const buildParams = (): SearchParams => ({
    keyword,
    excludeKeyword,
    scope,
    folderId: scope === 'folder' ? folderId : undefined,
    documentId: scope === 'document' ? documentId : undefined,
    extension,
    tag,
    matchMode,
    sort,
    favorite: favoriteFilter === '' ? undefined : favoriteFilter === 'true',
    pinned: pinnedFilter === '' ? undefined : pinnedFilter === 'true',
    caseSensitive,
    exactMatch
  });

  const runSearch = async (params: SearchParams) => {
    const response = await api.search(params);
    setResults(response.results);
    setResultCount(response.resultCount);
    setResultKeyword(String(params.keyword || ''));
    setPage(1);
    showToast({
      type: response.resultCount > 0 ? 'success' : 'warning',
      title: '검색 완료',
      message: `${response.keyword} · ${response.resultCount.toLocaleString()}건`
    });
    const historyResponse = await api.searchHistory();
    setHistory(historyResponse.items);
  };

  const pagedResults = useMemo(() => {
    const start = (page - 1) * pageSize;
    return results.slice(start, start + pageSize);
  }, [page, pageSize, results]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(results.length / pageSize));
    if (page > maxPage) setPage(maxPage);
  }, [page, pageSize, results.length]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setError('');
      await runSearch(buildParams());
    } catch (err) {
      setError(err instanceof Error ? err.message : '검색에 실패했습니다.');
    }
  };

  const applyHistory = async (item: SearchHistoryItem) => {
    const filters = item.filters || {};
    const nextScope = filters.scope || 'all';
    const nextFolderId = filters.folderId || '';
    const nextDocumentId = filters.documentId || '';
    const nextExtension = filters.extension || '';
    const nextTag = filters.tag || '';
    const nextMatchMode = filters.matchMode || 'contains';
    const nextSort = filters.sort || 'relevance';
    const nextFavorite = filters.favorite === null || filters.favorite === undefined ? '' : String(filters.favorite);
    const nextPinned = filters.pinned === null || filters.pinned === undefined ? '' : String(filters.pinned);
    const nextExclude = filters.excludeKeyword || '';
    const nextCaseSensitive = Boolean(filters.caseSensitive);
    const nextExactMatch = Boolean(filters.exactMatch);

    setKeyword(item.keyword);
    setExcludeKeyword(nextExclude);
    setScope(nextScope);
    setFolderId(nextFolderId);
    setDocumentId(nextDocumentId);
    setExtension(nextExtension);
    setTag(nextTag);
    setMatchMode(nextMatchMode);
    setSort(nextSort);
    setFavoriteFilter(nextFavorite);
    setPinnedFilter(nextPinned);
    setCaseSensitive(nextCaseSensitive);
    setExactMatch(nextExactMatch);

    try {
      setError('');
      await runSearch({
        keyword: item.keyword,
        excludeKeyword: nextExclude,
        scope: nextScope,
        folderId: nextScope === 'folder' ? nextFolderId : undefined,
        documentId: nextScope === 'document' ? nextDocumentId : undefined,
        extension: nextExtension,
        tag: nextTag,
        matchMode: nextMatchMode,
        sort: nextSort,
        favorite: nextFavorite === '' ? undefined : nextFavorite === 'true',
        pinned: nextPinned === '' ? undefined : nextPinned === 'true',
        caseSensitive: nextCaseSensitive,
        exactMatch: nextExactMatch
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '검색 이력을 다시 실행하지 못했습니다.');
    }
  };

  const clearHistory = async () => {
    try {
      setError('');
      await api.clearSearchHistory();
      setHistory([]);
      showToast({ type: 'success', title: '검색 이력 삭제 완료' });
    } catch (err) {
      setError(err instanceof Error ? err.message : '검색 이력을 삭제하지 못했습니다.');
    }
  };

  const resetConditions = () => {
    setExcludeKeyword('');
    setScope('all');
    setFolderId('');
    setDocumentId('');
    setExtension('');
    setTag('');
    setMatchMode('contains');
    setSort('relevance');
    setFavoriteFilter('');
    setPinnedFilter('');
    setCaseSensitive(false);
    setExactMatch(false);
  };

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h1>문서 검색</h1>
          <p>키워드, 태그, 즐겨찾기, 상세 조건 기반 검색</p>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      <form className="search-panel advanced-search-panel" onSubmit={submit}>
        <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="검색어" />
        <input value={excludeKeyword} onChange={(event) => setExcludeKeyword(event.target.value)} placeholder="제외어" />
        <select value={matchMode} onChange={(event) => setMatchMode(event.target.value)}>
          <option value="contains">일반</option>
          <option value="and">AND</option>
          <option value="or">OR</option>
          <option value="phrase">문구</option>
        </select>
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
            {filteredDocuments.map((document) => (
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
          <option value="pptx">PPTX</option>
          <option value="hwpx">HWPX</option>
        </select>
        <select value={tag} onChange={(event) => setTag(event.target.value)}>
          <option value="">전체 태그</option>
          {tags.map((item) => (
            <option key={item.tag} value={item.tag}>
              {item.tag} ({item.count})
            </option>
          ))}
        </select>
        <select value={favoriteFilter} onChange={(event) => setFavoriteFilter(event.target.value)}>
          <option value="">즐겨찾기 전체</option>
          <option value="true">즐겨찾기만</option>
          <option value="false">즐겨찾기 제외</option>
        </select>
        <select value={pinnedFilter} onChange={(event) => setPinnedFilter(event.target.value)}>
          <option value="">고정 전체</option>
          <option value="true">고정만</option>
          <option value="false">고정 제외</option>
        </select>
        <select value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="relevance">관련도순</option>
          <option value="createdAt">최신순</option>
          <option value="fileName">문서명순</option>
        </select>
        <label className="check-row">
          <input type="checkbox" checked={caseSensitive} onChange={(event) => setCaseSensitive(event.target.checked)} />
          대소문자
        </label>
        <label className="check-row">
          <input type="checkbox" checked={exactMatch} onChange={(event) => setExactMatch(event.target.checked)} />
          정확히
        </label>
        <button className="icon-text-button" type="button" onClick={resetConditions} title="조건 초기화">
          <RotateCcw size={17} />
          초기화
        </button>
        <button className="icon-text-button primary" title="검색">
          <Search size={17} />
          검색
        </button>
      </form>

      <div className="history-layout">
        <section className="panel search-history-panel">
          <div className="section-header">
            <h2>최근 검색</h2>
            <button className="icon-button danger" onClick={clearHistory} disabled={!history.length} title="검색 이력 삭제">
              <Trash2 size={16} />
            </button>
          </div>
          <div className="history-list">
            {history.map((item) => (
              <button className="history-row" key={item.historyId} onClick={() => void applyHistory(item)}>
                <Clock size={15} />
                <span>
                  <strong>{item.keyword}</strong>
                  <small>
                    {formatDate(item.searchedAt)} · {item.resultCount.toLocaleString()}건
                  </small>
                </span>
              </button>
            ))}
            {history.length === 0 && <div className="empty history-empty">검색 이력이 없습니다.</div>}
          </div>
        </section>

        <section className="panel search-result-panel">
          <div className="section-header">
            <h2>검색 결과</h2>
            <div className="section-actions">
              <span>{resultCount.toLocaleString()}건</span>
              <a
                className="icon-button"
                aria-disabled={!resultCount}
                href={resultCount ? api.searchExportUrl(buildParams(), 'csv') : undefined}
                onClick={(event) => {
                  if (!resultCount) event.preventDefault();
                }}
                title="CSV export"
              >
                <Download size={16} />
              </a>
              <a
                className="icon-text-button"
                aria-disabled={!resultCount}
                href={resultCount ? api.searchExportUrl(buildParams(), 'markdown') : undefined}
                onClick={(event) => {
                  if (!resultCount) event.preventDefault();
                }}
                title="Markdown export"
              >
                <Download size={16} />
                MD
              </a>
            </div>
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
                {pagedResults.map((result, index) => (
                  <tr key={`${result.documentId}-${result.pageNumber}-${result.lineNumber}-${result.locationType}-${index}`}>
                    <td>
                      <div className="result-title">
                        <span>{result.displayName}</span>
                        {(result.favorite || result.pinned) && (
                          <small>{[result.favorite ? '즐겨찾기' : '', result.pinned ? '고정' : ''].filter(Boolean).join(' · ')}</small>
                        )}
                      </div>
                      {result.tags.length > 0 && (
                        <div className="tag-chip-row">
                          {result.tags.map((item) => (
                            <span className="tag-chip" key={`${result.documentId}-${item}`}>
                              {item}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>{result.folderName}</td>
                    <td className="uppercase">{result.extension}</td>
                    <td>{formatLocation(result)}</td>
                    <td className="snippet">
                      <HighlightedText text={result.snippet} keyword={resultKeyword} />
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        onClick={() =>
                          setViewerTarget({
                            documentId: result.documentId,
                            keyword: resultKeyword,
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
                {pagedResults.length === 0 && (
                  <tr>
                    <td colSpan={6} className="empty">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={results.length}
            onPageChange={setPage}
            onPageSizeChange={(nextSize) => {
              setPageSize(nextSize);
              setPage(1);
            }}
          />
        </section>
      </div>
      <DocumentViewerModal target={viewerTarget} onClose={() => setViewerTarget(null)} />
    </section>
  );
}

function formatLocation(result: SearchResult) {
  if (result.locationType === 'META') return '문서 정보';
  if (result.locationType === 'SLIDE') return result.pageNumber ? `${result.pageNumber}슬라이드` : '-';
  if (result.locationType === 'SECTION') {
    const section = result.pageNumber ? `${result.pageNumber}섹션` : '';
    const paragraph = result.lineNumber ? `${result.lineNumber}문단` : '';
    return [section, paragraph].filter(Boolean).join(' / ') || '-';
  }
  if (result.pageNumber) return `${result.pageNumber}페이지`;
  if (result.lineNumber) return `${result.lineNumber}줄`;
  return '-';
}

function formatDate(value: string) {
  return value ? value.slice(0, 16).replace('T', ' ') : '';
}
