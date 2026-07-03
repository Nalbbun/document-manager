# Document Manager v1.1 기능 정리

이 문서는 `Document Manager v1.1`에서 구현된 기능을 기능별로 정리한 문서입니다.

v1.1은 v1.0의 기본 문서 등록, 검색, 열람 기능 위에 문서 정리 기능과 삭제 보호 기능을 강화한 버전입니다.

## 1. 전체 구성

- Backend: Python FastAPI
- Frontend: React + Vite + TypeScript
- Storage: 로컬 파일 시스템
- Metadata: JSON 파일 기반 인덱스
- 지원 파일: PDF, Markdown, TXT
- Backend 주소: `http://127.0.0.1:8000`
- Frontend 주소: `http://127.0.0.1:5173`
- Git 브랜치: `dev1.1`

## 2. v1.1 개발 반영 범위

문서 `document_manager_v1.1_feature_recommendations.md`의 개발 순서 제안을 기준으로 1단계부터 3단계까지 구현했습니다.

```text
1단계. 데이터 구조 확장
2단계. 문서 정리 기능 구현
3단계. 삭제 보호 기능 구현
```

## 3. 1단계 - 데이터 구조 확장

### document-index 확장

문서 메타정보에 다음 필드를 추가했습니다.

- `fileHash`: SHA-256 파일 해시
- `tags`: 태그 목록
- `favorite`: 즐겨찾기 여부
- `pinned`: 고정 여부
- `memo`: 문서 메모

기존 v1.0 데이터와의 호환을 위해 `document-index.json`을 읽을 때 누락된 필드는 기본값으로 보정합니다.

### 신규 JSON 저장소

다음 JSON 저장소 구조를 추가했습니다.

- `data/trash/trash-index.json`
- `data/backup/backup-index.json`
- `data/index/search-history.json`

런타임 JSON 파일은 앱 시작 시 자동 생성되며 Git에는 포함하지 않습니다.

### 신규 디렉터리

```text
data/
  trash/
    documents/
  backup/
```

Git에는 디렉터리 유지를 위한 `.gitkeep`만 포함합니다.

## 4. 2단계 - 문서 정리 기능

### 문서 이동

- 문서를 다른 폴더로 이동할 수 있습니다.
- 실제 파일 위치도 함께 이동됩니다.
- `document-index.json`의 `folderId`, `folderName`, `filePath`가 갱신됩니다.
- `search-index.json`의 폴더명, 파일명, 파일 경로도 함께 갱신됩니다.
- 대상 폴더에 같은 파일명이 있으면 이동을 차단합니다.
- 이동 성공 시 감사 로그를 기록합니다.

### 문서명 변경

- 문서명을 변경할 수 있습니다.
- 실제 로컬 파일명도 함께 변경됩니다.
- 기존 확장자는 유지됩니다.
- 같은 폴더에 동일 파일명이 있으면 변경을 차단합니다.
- 문서 메타정보와 검색 인덱스의 파일명/경로를 갱신합니다.

### 일괄 선택 / 일괄 작업

문서/폴더 화면에 문서 체크박스를 추가했습니다.

- 현재 목록 전체 선택
- 선택 해제
- 선택 문서 일괄 이동
- 선택 문서 일괄 휴지통 이동
- 선택 문서 일괄 인덱스 재생성

일괄 작업 중에는 기존 작업 잠금 정책을 적용하여 메뉴 이동을 차단합니다.

## 5. 3단계 - 삭제 보호 기능

### 휴지통 이동

v1.1부터 일반 문서 삭제는 실제 삭제가 아니라 휴지통 이동으로 처리합니다.

- `DELETE /api/documents/{document_id}` 호출 시 휴지통으로 이동
- 원본 파일은 `data/trash/documents/` 아래로 이동
- 문서 목록에서는 제거
- 검색 인덱스에서도 제거
- 휴지통 메타정보는 `trash-index.json`에 저장

### 휴지통 목록

새 메뉴 `휴지통`을 추가했습니다.

- 삭제 문서 목록 조회
- 원래 폴더 표시
- 삭제일 표시
- 원래 경로 표시

### 문서 복원

- 휴지통 문서를 선택한 폴더로 복원할 수 있습니다.
- 복원 시 파일을 다시 `data/storage` 아래로 이동합니다.
- 문서 메타정보를 문서 목록에 다시 추가합니다.
- 검색 인덱스를 다시 생성합니다.
- 폴더 문서 수를 다시 계산합니다.

### 영구 삭제

- 휴지통 문서를 영구 삭제할 수 있습니다.
- 영구 삭제 시 실제 파일과 휴지통 메타정보가 삭제됩니다.
- 휴지통 비우기 기능으로 전체 영구 삭제도 가능합니다.

## 6. 메뉴 구조

v1.1 기준 메뉴는 다음과 같습니다.

```text
대시보드
등록
문서/폴더
검색
인덱스
휴지통
설정
로그
```

`문서/폴더` 메뉴에는 폴더 관리와 문서 정리 기능이 통합되어 있습니다.

## 7. 주요 API

### 문서

- `GET /api/documents`
- `GET /api/documents/{document_id}`
- `GET /api/documents/{document_id}/preview`
- `GET /api/documents/{document_id}/file`
- `PATCH /api/documents/{document_id}/move`
- `PATCH /api/documents/{document_id}/rename`
- `DELETE /api/documents/{document_id}`
- `POST /api/documents/bulk/move`
- `POST /api/documents/bulk/delete`
- `POST /api/documents/upload`
- `POST /api/documents/import-folder`

### 휴지통

- `GET /api/trash`
- `POST /api/trash/{trash_id}/restore`
- `DELETE /api/trash/{trash_id}`
- `DELETE /api/trash`

### 폴더

- `GET /api/folders`
- `POST /api/folders`
- `PUT /api/folders/{folder_id}`
- `DELETE /api/folders/{folder_id}`

### 검색

- `GET /api/search`

### 인덱스

- `GET /api/index/status`
- `POST /api/index/rebuild`
- `POST /api/index/documents/{document_id}/rebuild`

### 설정/로그

- `GET /api/config`
- `PUT /api/config`
- `GET /api/logs/{type}`

## 8. 설정 확장

v1.1에서 설정에 다음 경로가 추가되었습니다.

- `trashRootPath`: 휴지통 데이터 경로
- `backupRootPath`: 백업 데이터 경로

기본값은 다음과 같습니다.

```text
trashRootPath = data/trash
backupRootPath = data/backup
```

설정 화면에서도 휴지통 루트와 백업 루트를 확인하고 수정할 수 있습니다.

## 9. Git 제외 정책

다음 런타임 데이터는 Git에 포함하지 않습니다.

- 업로드된 실제 문서 파일
- 검색 인덱스 JSON
- 휴지통 인덱스 JSON
- 백업 인덱스 JSON
- 로그 파일
- `.env`
- `.venv`
- `node_modules`
- `dist`

Git에는 소스 코드, 문서, 설정 예시, 디렉터리 유지용 `.gitkeep`만 포함합니다.

## 10. 검증 결과

v1.1 1~3단계 구현 후 다음 검증을 완료했습니다.

- Backend `compileall` 성공
- Frontend `pnpm build` 성공
- `/api/trash` 정상 응답
- `/api/config`에서 `trashRootPath`, `backupRootPath` 정상 응답
- Frontend `http://127.0.0.1:5173` 정상 응답

## 11. v1.1 남은 개발 후보

문서의 개발 순서 제안 기준으로 남은 단계는 다음과 같습니다.

- 4단계: 백업 생성, 백업 다운로드, 백업 복원, 복원 전 검증
- 5단계: 데이터 정합성 점검, 인덱스 자동 복구, 결과 리포트
- 6단계: 해시 기반 중복 검사, 태그, 즐겨찾기, 검색 조건 확장, 검색 이력
- 7단계: 목록 정렬, 필터, 페이지네이션, Toast 알림
