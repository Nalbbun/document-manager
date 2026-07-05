import { ChevronLeft, ChevronRight } from 'lucide-react';

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
};

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [20, 50, 100]
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(total, safePage * pageSize);

  return (
    <div className="pagination-bar">
      <span>
        {start.toLocaleString()}-{end.toLocaleString()} / {total.toLocaleString()}
      </span>
      <div className="pagination-controls">
        <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
          {pageSizeOptions.map((option) => (
            <option key={option} value={option}>
              {option}개
            </option>
          ))}
        </select>
        <button className="icon-button" disabled={safePage <= 1} onClick={() => onPageChange(safePage - 1)} title="이전">
          <ChevronLeft size={16} />
        </button>
        <strong>
          {safePage} / {totalPages}
        </strong>
        <button
          className="icon-button"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          title="다음"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
