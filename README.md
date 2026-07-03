# Document Manager v1.0

로컬 PC에서 PDF, Markdown, TXT 문서를 폴더별로 등록하고 JSON 인덱스를 기반으로 검색하는 Local Web 문서관리 프로그램입니다.

## 주요 구성

- Backend: Python FastAPI
- Frontend: React + Vite + TypeScript
- Storage: Local File System
- Metadata: JSON Index
- Supported files: PDF, MD, TXT

## 실행 준비

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Backend 확인:

```text
http://127.0.0.1:8000/health
http://127.0.0.1:8000/docs
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Frontend 확인:

```text
http://127.0.0.1:5173
```

## 서버 기동 / 재기동 / 스탑 명령어

아래 명령어는 VSCode PowerShell 터미널 기준입니다.

### 기동

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

### 스탑

각 터미널에서 `Ctrl + C`를 눌러 중지합니다.

포트 기준으로 한 번에 중지해야 할 때:

```powershell
Get-NetTCPConnection -LocalPort 8000,5173 -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object { Stop-Process -Id $_ -Force }
```

### 재기동

먼저 서버를 스탑한 뒤 다시 기동합니다.

```powershell
Get-NetTCPConnection -LocalPort 8000,5173 -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object { Stop-Process -Id $_ -Force }
```

그 다음 Backend 터미널과 Frontend 터미널에서 기동 명령어를 다시 실행합니다.

정상 동작 확인:

```text
Backend:  http://127.0.0.1:8000/health
Frontend: http://127.0.0.1:5173
```

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
  config/
    app-config.json
  logs/
    app.log
    error.log
    audit.log
```

## v1.0 범위

- 폴더 생성, 조회, 수정, 삭제
- PDF, MD, TXT 단일/다중 등록
- 서버 로컬 폴더 경로 기반 일괄 등록 API
- 문서 목록, 상세, 삭제
- 키워드 검색, 폴더/문서/확장자 필터
- PDF 페이지, MD/TXT 줄 번호 위치 표시
- 문서 미리보기 및 원본 열기
- 인덱스 상태 조회 및 재생성
- 설정 조회/수정, 로그 조회
