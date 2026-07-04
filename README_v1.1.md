# Document Manager v1.1

로컬 PC에서 PDF, Markdown, TXT 문서를 등록, 검색, 열람하고 문서를 안전하게 정리할 수 있는 Local Web 문서관리 프로그램입니다.

v1.1은 v1.0의 기본 기능에 문서 이동, 문서명 변경, 일괄 작업, 휴지통/복원, 백업/복원, 데이터 정합성 점검 기능을 추가한 버전입니다.

## 주요 구성

- Backend: Python FastAPI
- Frontend: React + Vite + TypeScript
- Storage: Local File System
- Metadata: JSON Index
- Supported files: PDF, MD, TXT
- Branch: `dev1.1`

## v1.1 주요 기능

- 파일 업로드 및 폴더 경로 기반 등록
- PDF, MD, TXT 문서 열람
- 모달 기반 문서 뷰어
- 키워드 검색 및 하이라이트
- 폴더/문서 통합 관리
- 문서 이동
- 문서명 변경
- 일괄 선택 및 일괄 작업
- 선택 문서 일괄 이동
- 선택 문서 일괄 휴지통 이동
- 선택 문서 일괄 인덱스 재생성
- 삭제 문서 휴지통 이동
- 휴지통 목록 조회
- 문서 복원
- 문서 영구 삭제
- 휴지통 비우기
- 전체 백업 생성
- 백업 ZIP 다운로드
- 백업 검증
- 백업 복원
- 데이터 정합성 점검
- 인덱스 자동 복구
- 복구 결과 리포트
- 작업 중 메뉴 이동 잠금
- 로그 조회
- 환경 설정 관리

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

또는 pnpm을 사용할 수 있는 환경에서는 다음 명령을 사용할 수 있습니다.

```powershell
pnpm install
```

## 서버 기동

Backend 터미널:

```powershell
cd C:\dev\document-manager-v1\backend
.\.venv\Scripts\activate
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Frontend 터미널:

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

## 서버 스탑

각 서버 터미널에서 `Ctrl + C`를 눌러 중지합니다.

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

그 다음 Backend와 Frontend 기동 명령어를 다시 실행합니다.

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
- 폴더별 문서 수

### 파일 등록

- 파일 선택 등록
- 폴더 경로 등록
- 업로드 진행률 표시
- 폴더 가져오기 작업 상태 표시

### 문서/폴더

- 폴더 생성, 이름 변경, 삭제
- 폴더 선택 시 문서 목록 표시
- 문서 열람
- 문서명 변경
- 문서 휴지통 이동
- 문서 체크박스 선택
- 일괄 이동
- 일괄 휴지통 이동
- 일괄 인덱스 재생성

### 검색

- 키워드 검색
- 폴더/문서/확장자 필터
- 검색어 하이라이트
- 검색 결과에서 모달 뷰어 열기

### 인덱스 관리

- 인덱스 상태 조회
- 전체 인덱스 재생성
- 파일별 인덱스 재생성
- 데이터 정합성 점검
- 인덱스 자동 복구
- 복구 결과 리포트
- 인덱스 작업 중 이동 잠금

### 휴지통

- 삭제 문서 목록 조회
- 선택 폴더로 복원
- 영구 삭제
- 휴지통 비우기

### 백업/복원

- 전체 백업 ZIP 생성
- 백업 이력 조회
- 백업 파일 다운로드
- 복원 전 백업 구조 검증
- 백업 복원
- 복원 전 현재 데이터 자동 백업
- 복원 작업 중 메뉴 이동 잠금

### 설정

- 저장 루트
- 인덱스 루트
- 로그 루트
- 휴지통 루트
- 백업 루트
- 허용 확장자
- 최대 업로드 크기
- 기본 폴더명
- 미분류 폴더명
- 하이라이트/감사 로그 사용 여부

## 주요 API

### Documents

```text
GET    /api/documents
GET    /api/documents/{document_id}
GET    /api/documents/{document_id}/preview
GET    /api/documents/{document_id}/file
PATCH  /api/documents/{document_id}/move
PATCH  /api/documents/{document_id}/rename
DELETE /api/documents/{document_id}
POST   /api/documents/bulk/move
POST   /api/documents/bulk/delete
POST   /api/documents/upload
POST   /api/documents/import-folder
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

### Folders

```text
GET    /api/folders
POST   /api/folders
PUT    /api/folders/{folder_id}
DELETE /api/folders/{folder_id}
```

### Index

```text
GET  /api/index/status
POST /api/index/rebuild
POST /api/index/documents/{document_id}/rebuild
```

### Config / Logs

```text
GET /api/config
PUT /api/config
GET /api/logs/{type}
```

## Git 포함/제외 기준

Git에는 다음 항목만 포함합니다.

- Backend/Frontend 소스 코드
- README 및 기능 정리 문서
- 설정 예시 파일
- 빈 런타임 디렉터리 유지를 위한 `.gitkeep`

다음 항목은 Git에 포함하지 않습니다.

- 실제 업로드 문서
- 런타임 인덱스 JSON
- 로그 파일
- 휴지통 데이터 파일
- 백업 ZIP 파일
- 백업 인덱스 파일
- `.env`
- `.venv`
- `node_modules`
- `dist`

## v1.1 구현 커밋

```text
081b366 Implement document manager v1.1 stage 1-3
ecf41b0 Add v1.1 documentation
```

## v1.1 이후 보완 후보

- 해시 기반 중복 파일 검사 UI
- 태그/즐겨찾기/메모 관리 UI
- 검색 조건 확장
- 검색 이력
- 목록 페이지네이션
- Toast 알림
