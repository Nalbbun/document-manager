# Document Manager v1.1 기능 정리

이 문서는 `Document Manager v1.1`에서 구현된 기능을 기능별로 정리한 문서입니다.

v1.1은 v1.0의 기본 문서 등록, 검색, 열람 기능 위에 문서 정리, 삭제 보호, 백업/복원, 운영 안정성 기능을 강화한 버전입니다.

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

문서 `document_manager_v1.1_feature_recommendations.md`의 개발 순서 제안을 기준으로 1단계부터 5단계까지 구현했습니다.

```text
1단계. 데이터 구조 확장
2단계. 문서 정리 기능 구현
3단계. 삭제 보호 기능 구현
4단계. 데이터 보호 기능 구현
5단계. 운영 안정성 기능 구현
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

- `data/trash/trash-index.json`
- `data/backup/backup-index.json`
- `data/index/search-history.json`

런타임 JSON 파일은 앱 시작 시 자동 생성되며 Git에는 포함하지 않습니다.

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

### 휴지통 목록 / 복원 / 영구 삭제

- 삭제 문서 목록 조회
- 원래 폴더와 삭제일 표시
- 선택 폴더로 문서 복원
- 복원 시 검색 인덱스 재생성
- 휴지통 문서 영구 삭제
- 휴지통 비우기

## 6. 4단계 - 데이터 보호 기능

### 전체 백업

다음 데이터를 ZIP 파일로 백업합니다.

```text
data/storage/
data/index/
data/config/
data/logs/
data/trash/
```

백업 파일명 규칙:

```text
document-manager-backup-YYYYMMDD-HHMMSS.zip
```

백업 생성 시 `backup-index.json`에 백업 이력을 저장합니다.

### 백업 다운로드

백업/복원 화면에서 생성된 ZIP 백업 파일을 다운로드할 수 있습니다.

### 복원 전 검증

복원 전에 백업 ZIP 파일을 검증합니다.

- ZIP 손상 여부
- 필수 데이터 디렉터리 존재 여부
- ZIP 내부 항목 수

### 백업 복원

선택한 백업으로 데이터를 복원할 수 있습니다.

복원 흐름:

```text
백업 ZIP 검증
  -> 현재 데이터 자동 안전 백업
  -> storage/index/config/logs/trash 복원
  -> 감사 로그 기록
```

로그 파일은 서버가 파일 핸들을 잡고 있을 수 있어 삭제 후 교체가 아니라 덮어쓰기 방식으로 복원합니다.

## 7. 5단계 - 운영 안정성 기능

### 데이터 정합성 점검

인덱스 관리 화면에서 데이터 정합성 점검을 실행할 수 있습니다.

점검 항목:

- 문서 메타정보는 있으나 실제 파일이 없는 경우
- 검색 가능한 문서이나 검색 인덱스가 없는 경우
- 문서가 없는 검색 인덱스 항목
- 폴더 문서 수 불일치
- 실제 파일은 있으나 문서 메타정보가 없는 경우
- 휴지통 메타정보는 있으나 휴지통 파일이 없는 경우
- 휴지통 파일은 있으나 휴지통 메타정보가 없는 경우

### 인덱스 자동 복구

자동 복구 전 현재 데이터를 자동 백업합니다.

자동 조치 항목:

- 없는 원본 파일 문서를 인덱스 실패 상태로 표시
- 없는 원본 파일의 검색 인덱스 제거
- 누락된 검색 인덱스 재생성
- 문서 없는 검색 인덱스 제거
- 폴더 문서 수 재계산
- 실제 파일이 없는 휴지통 메타정보 제거

### 결과 리포트

정합성 점검과 자동 복구 결과는 다음 정보를 제공합니다.

- 전체 오류 수
- 자동 복구 가능 수
- 수동 조치 필요 수
- 오류 유형별 건수
- 오류 목록
- 자동 복구 작업 목록
- 복구 전 안전 백업 정보

## 8. 메뉴 구조

v1.1 기준 메뉴는 문서의 메뉴 구조 제안에 맞춰 다음과 같이 보완했습니다.

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

## 9. 주요 API

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

### 백업/복원

- `GET /api/backups`
- `POST /api/backups`
- `GET /api/backups/{backup_id}/download`
- `POST /api/backups/{backup_id}/validate`
- `POST /api/backups/{backup_id}/restore`

### 운영 안정성

- `GET /api/maintenance/integrity`
- `POST /api/maintenance/repair`

### 폴더 / 검색 / 인덱스 / 설정 / 로그

- `GET /api/folders`
- `POST /api/folders`
- `PUT /api/folders/{folder_id}`
- `DELETE /api/folders/{folder_id}`
- `GET /api/search`
- `GET /api/index/status`
- `POST /api/index/rebuild`
- `POST /api/index/documents/{document_id}/rebuild`
- `GET /api/config`
- `PUT /api/config`
- `GET /api/logs/{type}`

## 10. Git 제외 정책

다음 런타임 데이터는 Git에 포함하지 않습니다.

- 업로드된 실제 문서 파일
- 검색 인덱스 JSON
- 휴지통 인덱스 JSON
- 백업 인덱스 JSON
- 백업 ZIP 파일
- 로그 파일
- `.env`
- `.venv`
- `node_modules`
- `dist`

Git에는 소스 코드, 문서, 설정 예시, 디렉터리 유지용 `.gitkeep`만 포함합니다.

## 11. 검증 결과

v1.1 1~5단계 구현 후 다음 검증을 완료했습니다.

- Backend `compileall` 성공
- Frontend `pnpm build` 성공
- `/api/backups` 정상 응답
- `/api/maintenance/integrity` 정상 응답
- `/api/trash` 정상 응답
- `/api/config`에서 `trashRootPath`, `backupRootPath` 정상 응답
- Frontend `http://127.0.0.1:5173` 정상 응답

## 12. v1.1 남은 개발 후보

문서의 개발 순서 제안 기준으로 남은 주요 단계는 다음과 같습니다.

- 6단계: 해시 기반 중복 검사, 태그, 즐겨찾기, 검색 조건 확장, 검색 이력
- 7단계: 목록 정렬, 필터, 페이지네이션, Toast 알림
