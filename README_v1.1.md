# Document Manager v1.1

로컬 PC에서 PDF, Markdown, TXT 문서를 등록, 검색, 열람, 정리, 백업/복원할 수 있는 Local Web 문서 관리 프로그램입니다.

현재 `dev1.1` 브랜치는 v1.1 개발 순서 제안 기준 1단계부터 6단계까지 반영되어 있습니다.

## 주요 구성

- Backend: Python FastAPI
- Frontend: React + Vite + TypeScript
- Storage: Local File System
- Metadata: JSON Index
- Supported files: PDF, MD, TXT
- Backend URL: `http://127.0.0.1:8000`
- Frontend URL: `http://127.0.0.1:5173`

## v1.1 주요 기능

- 파일 업로드 및 폴더 경로 기반 등록
- 업로드 진행률 표시
- 폴더 가져오기 작업 상태 표시
- PDF, MD, TXT 문서 모달 뷰어
- 검색 키워드 하이라이트
- 폴더/문서 통합 관리
- 문서 이동, 문서명 변경
- 선택 문서 일괄 이동, 휴지통 이동, 인덱스 재생성
- 해시 기반 중복 파일 등록 차단
- 문서 태그, 메모, 즐겨찾기, 고정 관리
- 태그/즐겨찾기/고정 기반 문서 필터
- AND/OR/문구/제외어 기반 상세 검색
- 검색 이력 저장, 재실행, 삭제
- 휴지통 이동, 복원, 영구 삭제, 비우기
- 전체 백업 ZIP 생성, 검증, 다운로드, 복원
- 데이터 무결성 점검과 자동 복구
- 작업 중 메뉴 이동 잠금
- 설정 및 로그 조회

## 실행 준비

### Backend

```powershell
cd C:\dev\document-manager-v1\backend
python -m venv .venv
.\.venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### Frontend

```powershell
cd C:\dev\document-manager-v1\frontend
npm install
```

또는 pnpm을 사용할 수 있습니다.

```powershell
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
npm run dev -- --host 127.0.0.1 --port 5173
```

정상 동작 확인:

```text
Backend:  http://127.0.0.1:8000/health
API Docs: http://127.0.0.1:8000/docs
Frontend: http://127.0.0.1:5173
```

## 서버 중지

각 서버 터미널에서 `Ctrl + C`를 누릅니다.

포트 기준으로 한 번에 중지해야 할 때:

```powershell
Get-NetTCPConnection -LocalPort 8000,5173 -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object { Stop-Process -Id $_ -Force }
```

## 서버 재기동

먼저 서버를 중지합니다.

```powershell
Get-NetTCPConnection -LocalPort 8000,5173 -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object { Stop-Process -Id $_ -Force }
```

그 다음 Backend와 Frontend 기동 명령을 다시 실행합니다.

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
  trash/
    documents/
    trash-index.json
  backup/
    backup-index.json
    document-manager-backup-YYYYMMDD-HHMMSS.zip
```

## 메뉴 구조

```text
대시보드
파일 등록
문서/폴더
검색
인덱스 관리
휴지통
백업/복원
설정
로그
```

## 주요 화면

### 대시보드

- 전체 문서/폴더 현황
- 문서 유형별 현황
- 최근 등록 문서
- 즐겨찾기/고정 문서
- 폴더별 문서 수

### 파일 등록

- 파일 선택 등록
- 폴더 경로 등록
- 업로드 진행률 표시
- 폴더 가져오기 작업 상태 표시
- 해시 기반 중복 파일 등록 차단

### 문서/폴더

- 폴더 생성, 이름 변경, 삭제
- 폴더 선택 시 문서 목록 표시
- 문서 열기
- 문서명 변경
- 문서 휴지통 이동
- 선택 문서 일괄 이동
- 선택 문서 일괄 휴지통 이동
- 선택 문서 일괄 인덱스 재생성
- 문서별 태그/메모 편집
- 문서별 즐겨찾기/고정 토글
- 선택 문서 태그 일괄 적용
- 태그/즐겨찾기/고정 필터
- 중복 파일 그룹 확인

### 검색

- 키워드 검색
- AND 검색
- OR 검색
- 문구 검색
- 제외어 검색
- 폴더/문서/확장자 필터
- 태그/즐겨찾기/고정 필터
- 관련도순, 최신순, 문서명순 정렬
- 검색 결과 하이라이트
- 검색 결과에서 모달 뷰어 열기
- 검색 이력 조회, 재실행, 삭제

### 인덱스 관리

- 인덱스 상태 조회
- 전체 인덱스 재생성
- 파일별 인덱스 재생성
- 데이터 무결성 점검
- 자동 복구
- 복구 결과 리포트
- 작업 중 메뉴 이동 잠금

### 휴지통

- 삭제 문서 목록 조회
- 선택 폴더로 복원
- 영구 삭제
- 휴지통 비우기

### 백업/복원

- 전체 백업 ZIP 생성
- 백업 이력 조회
- 백업 파일 다운로드
- 백업 구조 검증
- 백업 복원
- 복원 전 현재 데이터 자동 안전 백업
- 복원 작업 중 메뉴 이동 잠금

## 주요 API

### Documents

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

### Search

```text
GET    /api/search
GET    /api/search/history
DELETE /api/search/history
```

### Trash

```text
GET    /api/trash
POST   /api/trash/{trash_id}/restore
DELETE /api/trash/{trash_id}
DELETE /api/trash
```

### Backups

```text
GET  /api/backups
POST /api/backups
GET  /api/backups/{backup_id}/download
POST /api/backups/{backup_id}/validate
POST /api/backups/{backup_id}/restore
```

### Maintenance

```text
GET  /api/maintenance/integrity
POST /api/maintenance/repair
```

### Index / Config / Logs

```text
GET  /api/index/status
POST /api/index/rebuild
POST /api/index/documents/{document_id}/rebuild
GET  /api/config
PUT  /api/config
GET  /api/logs/{type}
```

## Git 포함/제외 기준

Git에 포함합니다.

- Backend/Frontend 소스 코드
- README 및 기능 정리 문서
- 설정 예시 파일
- 빈 데이터 디렉터리 유지를 위한 `.gitkeep`

Git에 포함하지 않습니다.

- 실제 업로드 문서
- 로컬 인덱스 JSON
- 로그 파일
- 휴지통 파일
- 백업 ZIP 파일
- 백업 인덱스 파일
- `.env`
- `.venv`
- `node_modules`
- `dist`

## 검증

6단계 적용 후 다음을 확인했습니다.

```text
Backend compileall: OK
Frontend pnpm build: OK
GET /health: OK
GET /api/documents/tags: OK
GET /api/documents/duplicates: OK
GET /api/search/history: OK
GET /api/search?keyword=test&matchMode=and&sort=relevance: OK
Frontend http://127.0.0.1:5173: OK
```

## 다음 단계

남은 v1.1 후속 작업은 7단계 UI/UX 개선입니다.

- 목록 정렬/필터 고도화
- 페이지네이션
- Toast 알림
- 처리 결과 알림 상세화
