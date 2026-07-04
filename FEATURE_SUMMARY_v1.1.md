# Document Manager v1.1 기능 정리

이 문서는 `Document Manager v1.1`에서 현재 구현된 기능을 단계별로 정리합니다.

기준 문서: `document_manager_v1.1_feature_recommendations.md`의 `11. v1.1 개발 순서 제안`

## 1. 적용 범위

v1.1 개발 순서 제안 기준으로 1단계부터 6단계까지 구현되었습니다.

```text
1단계. 데이터 구조 확장
2단계. 문서 정리 기능 구현
3단계. 삭제 보호 기능 구현
4단계. 데이터 보호 기능 구현
5단계. 운영 안정화 기능 구현
6단계. 검색/분류 편의 기능 구현
```

## 2. 데이터 구조 확장

`document-index.json` 문서 메타데이터에 다음 필드를 확장했습니다.

- `fileHash`: SHA-256 파일 해시
- `tags`: 문서 태그 목록
- `favorite`: 즐겨찾기 여부
- `pinned`: 고정 여부
- `memo`: 문서 메모

추가 JSON 저장소:

- `data/trash/trash-index.json`
- `data/backup/backup-index.json`
- `data/index/search-history.json`

기존 데이터와 호환되도록 누락 필드는 읽기 시 기본값으로 보정됩니다.

## 3. 문서 정리 기능

- 문서 이동
- 문서명 변경
- 실제 파일명 변경
- 문서 선택 체크박스
- 선택 문서 일괄 이동
- 선택 문서 일괄 휴지통 이동
- 선택 문서 일괄 인덱스 재생성
- 폴더 선택 시 해당 폴더의 문서 목록 표시
- 작업 중 메뉴 이동 잠금

문서 이동/이름 변경 시 `document-index.json`과 `search-index.json`의 폴더명, 파일명, 경로 정보가 함께 갱신됩니다.

## 4. 삭제 보호 기능

일반 문서 삭제는 즉시 영구 삭제하지 않고 휴지통 이동으로 처리합니다.

- 휴지통 이동
- 휴지통 목록 조회
- 원래 폴더 또는 선택 폴더로 복원
- 복원 시 검색 인덱스 재생성
- 휴지통 문서 영구 삭제
- 휴지통 비우기

휴지통 데이터는 `data/trash/documents/`와 `trash-index.json`으로 관리합니다.

## 5. 데이터 보호 기능

백업/복원 기능이 구현되었습니다.

- 전체 백업 ZIP 생성
- 백업 이력 조회
- 백업 ZIP 다운로드
- 백업 파일 구조 검증
- 백업 복원
- 복원 전 현재 데이터 자동 안전 백업
- 복원 작업 감사 로그 기록

백업 대상:

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

## 6. 운영 안정화 기능

인덱스 관리 화면에서 데이터 무결성 점검과 자동 복구를 수행할 수 있습니다.

점검 항목:

- 문서 메타데이터는 있으나 실제 파일이 없는 경우
- 검색 가능한 문서인데 검색 인덱스가 없는 경우
- 문서가 없는 검색 인덱스 항목
- 폴더 문서 수 불일치
- 스토리지에 있으나 등록되지 않은 파일
- 휴지통 메타데이터와 실제 휴지통 파일 불일치
- 파일 해시 누락

자동 복구 항목:

- 누락된 검색 인덱스 재생성
- 문서가 없는 검색 인덱스 제거
- 폴더 문서 수 재계산
- 누락된 휴지통 메타데이터 정리
- 누락된 파일 해시 재계산
- 복구 전 자동 안전 백업

## 7. 검색/분류 편의 기능

6단계 기능이 구현되었습니다.

### 해시 기반 중복 검사

- 업로드/폴더 가져오기 시 파일 내용을 SHA-256으로 계산합니다.
- 같은 해시의 문서가 이미 있으면 신규 등록을 차단합니다.
- 기존 문서 중 `fileHash`가 비어 있으면 중복 조회/인덱스 재생성/무결성 복구 과정에서 보정됩니다.
- 문서/폴더 화면에서 현재 중복 파일 그룹을 확인할 수 있습니다.

### 태그

- 문서별 태그 저장
- 문서별 태그/메모 편집
- 선택 문서 태그 일괄 추가
- 태그 목록 집계
- 문서 목록 태그 필터
- 검색 조건 태그 필터

### 즐겨찾기/고정

- 문서별 즐겨찾기 토글
- 문서별 고정 토글
- 문서 목록 즐겨찾기/고정 필터
- 검색 조건 즐겨찾기/고정 필터
- 대시보드 즐겨찾기 문서 목록 표시

### 검색 조건 확장

검색 화면에 다음 조건이 추가되었습니다.

- 일반 포함 검색
- AND 검색
- OR 검색
- 문구 검색
- 제외어 검색
- 태그 필터
- 즐겨찾기 필터
- 고정 필터
- 관련도순, 최신순, 문서명순 정렬
- 문서명, 폴더명, 태그, 메모 검색 포함

### 검색 이력

- 검색 조건과 결과 수를 `search-history.json`에 저장
- 최근 검색 목록 조회
- 최근 검색 조건 재실행
- 검색 이력 삭제

## 8. 메뉴 구조

현재 메뉴 구조:

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

## 10. 검증 결과

6단계 적용 후 다음 검증을 완료했습니다.

- Backend `compileall` 성공
- Frontend `pnpm build` 성공
- `/health` 정상 응답
- `/api/documents/tags` 정상 응답
- `/api/documents/duplicates` 정상 응답
- `/api/search?keyword=test&matchMode=and&sort=relevance` 정상 응답
- `/api/search/history` 저장/조회/삭제 정상 응답
- Frontend `http://127.0.0.1:5173` 정상 응답

## 11. 남은 v1.1 후속 단계

남은 주요 단계는 7단계 UI/UX 개선입니다.

- 목록 정렬/필터 고도화
- 페이지네이션
- Toast 알림
- 처리 결과 알림 상세화
