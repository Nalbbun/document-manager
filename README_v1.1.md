# Document Manager v1.1

로컬 PC에서 PDF, Markdown, TXT, PPTX, HWPX 문서를 업로드, 폴더 등록, 검색, 보기, 분류, 백업/복원할 수 있는 FastAPI + React 기반 문서 관리 도구입니다.

현재 `dev1.1` 브랜치는 v1.1 개발 순서 제안의 1단계부터 7단계까지 적용했고, 안정화 가이드 기준 보강 작업까지 포함합니다.

## 주요 구성

- Backend: Python FastAPI
- Frontend: React + Vite + TypeScript
- Storage: Local File System
- Metadata: JSON Index
- Supported files: PDF, MD, TXT, PPTX, HWPX
- Backend URL: `http://127.0.0.1:8000`
- Frontend URL: `http://127.0.0.1:5173`

## v1.1 주요 기능

- 파일 업로드 및 서버 폴더 경로 등록
- PowerPoint `pptx` 및 한글 `hwpx` 업로드, 텍스트 인덱싱, 검색, 텍스트 미리보기
- 업로드 진행률 및 폴더 가져오기 작업 상태 표시
- 문서/폴더 통합 관리
- 폴더 선택 시 폴더 안의 문서 목록 표시
- PDF, Markdown, TXT, PPTX, HWPX 문서 모달 뷰어
- 검색어 하이라이트
- 검색 조건 확장: AND, OR, 문구, 제외어, 태그, 즐겨찾기, 고정
- 검색 결과 CSV/Markdown 내보내기
- 문서 이동, 문서명 변경, 일괄 이동, 일괄 삭제, 일괄 태그
- 파일 해시 기반 중복 등록 차단
- 휴지통 이동, 복원, 영구 삭제, 비우기
- 휴지통 복원 충돌 정책: 차단, 자동 이름 변경, 선택 폴더 복원
- 전체 백업 ZIP 생성, 검증, 미리보기, 드라이런, 다운로드, 복원
- 복원 실패 시 사전 안전 백업 기반 롤백 시도
- 데이터 무결성 검사 및 복구
- 로그 검색, 다운로드, 보관, 삭제
- 환경 설정 확장: 가져오기 경로, 보존 기간, 로그/백업/휴지통 정책
- 작업 중 메뉴 이동 잠금
- 성공/경고/오류/정보 Toast 알림

## 실행 준비

Backend:

```powershell
cd C:\dev\document-manager-v1\backend
python -m venv .venv
.\.venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Frontend:

```powershell
cd C:\dev\document-manager-v1\frontend
pnpm install
```

## 서버 기동

Backend:

```powershell
cd C:\dev\document-manager-v1\backend
.\.venv\Scripts\activate
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Frontend:

```powershell
cd C:\dev\document-manager-v1\frontend
pnpm run dev
```

확인 URL:

```text
Backend:  http://127.0.0.1:8000/health
API Docs: http://127.0.0.1:8000/docs
Frontend: http://127.0.0.1:5173
```

## 서버 중지

각 터미널에서 `Ctrl + C`를 누릅니다.

포트 기준으로 강제 중지해야 하면:

```powershell
Get-NetTCPConnection -LocalPort 8000,5173 -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object { Stop-Process -Id $_ -Force }
```

## 서버 재기동

1. 위의 서버 중지 명령으로 8000, 5173 포트를 비웁니다.
2. Backend 기동 명령을 다시 실행합니다.
3. Frontend 기동 명령을 다시 실행합니다.
4. `/health`와 Frontend 화면을 확인합니다.

## 저장 구조

```text
data/
  storage/
    default/
    unclassified/
  index/
    folder-index.json
    document-index.json
    search-index.json
    search-history.json
  config/
    app-config.json
  logs/
    app.log
    error.log
    audit.log
    archive/
  trash/
    documents/
    trash-index.json
  backup/
    backup-index.json
    document-manager-backup-YYYYMMDD-HHMMSS.zip
  import/
```

## 주요 API

Documents:

```text
GET    /api/documents
GET    /api/documents/tags
GET    /api/documents/duplicates
GET    /api/documents/{document_id}
GET    /api/documents/{document_id}/preview
GET    /api/documents/{document_id}/file
PATCH  /api/documents/{document_id}/move
PATCH  /api/documents/{document_id}/rename
PATCH  /api/documents/{document_id}/metadata
DELETE /api/documents/{document_id}
POST   /api/documents/bulk/move
POST   /api/documents/bulk/delete
POST   /api/documents/bulk/tags
POST   /api/documents/upload
POST   /api/documents/import-folder
```

Search:

```text
GET    /api/search
GET    /api/search/export
GET    /api/search/history
DELETE /api/search/history
```

Trash:

```text
GET    /api/trash
POST   /api/trash/{trash_id}/restore
DELETE /api/trash/{trash_id}
DELETE /api/trash
```

Backups:

```text
GET  /api/backups
POST /api/backups
GET  /api/backups/{backup_id}/download
POST /api/backups/{backup_id}/validate
GET  /api/backups/{backup_id}/preview
POST /api/backups/{backup_id}/restore/dry-run
POST /api/backups/{backup_id}/restore
```

Logs:

```text
GET    /api/logs/{type}
GET    /api/logs/{type}/download
POST   /api/logs/{type}/archive
DELETE /api/logs/{type}
```

Index / Maintenance / Config:

```text
GET  /api/index/status
POST /api/index/rebuild
POST /api/index/documents/{document_id}/rebuild
GET  /api/maintenance/integrity
POST /api/maintenance/repair
GET  /api/config
PUT  /api/config
```

## 안정화 보강

- JSON 저장소는 임시 파일 작성 후 JSON 재읽기 검증을 거쳐 교체합니다.
- 설정 파일도 임시 파일 검증 및 백업 파일을 사용합니다.
- 서버 폴더 가져오기는 기본적으로 `data/import` 아래 경로만 허용합니다.
- 절대 경로 가져오기는 설정에서 명시적으로 허용해야 합니다.
- Windows 시스템 폴더 가져오기는 차단합니다.
- 숨김 파일, 심볼릭 링크, 파일 개수, 전체 용량 제한을 설정할 수 있습니다.
- 백업 파일은 SHA-256 해시를 기록하고 검증합니다.
- 백업 복원 전 preview와 dry-run으로 복원 가능 여부를 확인할 수 있습니다.
- 백업 복원 실패 시 `PRE_RESTORE` 안전 백업으로 롤백을 시도합니다.
- 로그는 조회뿐 아니라 검색, 다운로드, 보관, 삭제를 지원합니다.
- PowerPoint는 `pptx`만 지원합니다. 구형 `ppt` 바이너리 파일은 검색/미리보기 품질을 보장하기 어려워 지원 대상에서 제외했습니다.
- 한글 문서는 XML 기반 `hwpx`만 지원합니다. 구형 `hwp` 바이너리 파일은 이번 버전 지원 대상에서 제외했습니다.

## 검증

이번 안정화 작업 후 확인한 항목:

```text
Backend: python -m compileall backend\app
Frontend: pnpm run build
```

둘 다 정상 통과했습니다.
