import {
  FileSearch,
  Files,
  Gauge,
  History,
  ListChecks,
  Search,
  Settings,
  Trash2,
  UploadCloud
} from 'lucide-react';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useOperation } from '../contexts/OperationContext';

const items = [
  { to: '/', label: '대시보드', icon: Gauge },
  { to: '/upload', label: '등록', icon: UploadCloud },
  { to: '/documents', label: '문서/폴더', icon: Files },
  { to: '/search', label: '검색', icon: Search },
  { to: '/index', label: '인덱스', icon: ListChecks },
  { to: '/trash', label: '휴지통', icon: Trash2 },
  { to: '/settings', label: '설정', icon: Settings },
  { to: '/logs', label: '로그', icon: History }
];

export function Layout({ children }: { children: ReactNode }) {
  const { isBusy, label: operationLabel } = useOperation();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <FileSearch size={24} />
          <span>문서관리 v1.1</span>
        </div>
        <nav>
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              aria-disabled={isBusy}
              className={({ isActive }) =>
                ['nav-link', isActive ? 'active' : '', isBusy ? 'disabled' : ''].filter(Boolean).join(' ')
              }
              onClick={(event) => {
                if (isBusy) event.preventDefault();
              }}
              title={isBusy ? `${operationLabel || '작업'} 완료 후 이동할 수 있습니다.` : label}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        {isBusy && (
          <div className="operation-lock" role="status" aria-live="polite">
            <strong>작업 중</strong>
            <span>{operationLabel}</span>
            <small>완료 전까지 메뉴 이동이 잠깁니다.</small>
          </div>
        )}
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
