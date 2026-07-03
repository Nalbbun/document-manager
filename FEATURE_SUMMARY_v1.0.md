# Document Manager v1.0 기능 정리

이 문서는 지금까지 구현된 `Document Manager v1.0`의 기능을 기능별로 정리한 문서입니다.

## 1. 전체 구성

- Backend: Python FastAPI
- Frontend: React + Vite + TypeScript
- Storage: 로컬 파일 시스템
- Metadata: JSON 파일 기반 인덱스
- 지원 파일: PDF, Markdown, TXT
- 실행 주소:
  - Backend: `http://127.0.0.1:8000`
  - Frontend: `http://127.0.0.1:5173`

## 2. 대시보드

- 전체 폴더 수, 전체 문서 수, 검색 가능 문서 수, 인덱스 실패 수 표시
- PDF, MD, TXT 유형별 문서 수 표시
- 최근 등록 문서 목록 표시
- 최근 문서 클릭 시 별도 페이지 이동 없이 모달 뷰어로 문서 열람
- 폴더별 문서 개수 요약 표시

## 3. 파일 등록

- PDF, MD, TXT 파일 단일 또는 다중 업로드
- 업로드 대상 폴더 선택
- 파일 업로드 진행률 표시
- 업로드 완료 후 인덱싱 결과 대기 상태 표시
- 서버 로컬 폴더 경로 기반 일괄 등록 지원
- 하위 폴더 포함 옵션 지원
- 폴더 등록 작업 중 진행 상태 표시
- 등록 성공/실패 개수와 실패 사유 표시

## 4. 작업 중 이동 잠금

- 파일 업로드 중 메뉴 이동 차단
- 폴더 가져오기 중 메뉴 이동 차단
- 전체 인덱스 재생성 중 메뉴 이동 차단
- 파일별 인덱스 재생성 중 메뉴 이동 차단
- 작업 중 왼쪽 메뉴 하단에 현재 작업 상태 표시
- 브라우저 새로고침 또는 창 닫기 시 경고 표시
- 작업 완료 후 메뉴 이동 자동 활성화

## 5. 문서/폴더 통합 관리

- 기존 폴더 관리와 문서 관리 기능을 `문서/폴더` 메뉴로 통합
- 폴더 생성
- 폴더 이름 변경
- 폴더 삭제
- 시스템 폴더 삭제 및 이름 변경 제한
- 문서가 있는 폴더 삭제 제한
- 폴더 클릭 시 해당 폴더의 문서 목록 표시
- 전체 문서 보기 지원
- 문서명, 폴더, 확장자, 크기, 등록일, 인덱스 상태 표시
- 문서 삭제
- 문서 열기 버튼으로 모달 뷰어 실행
- `/folders` 주소로 접근해도 통합된 문서/폴더 관리 화면으로 연결

## 6. 문서 뷰어

- 문서 목록, 검색 결과, 폴더 문서 목록, 대시보드에서 모달 형태로 문서 열람
- PDF는 브라우저 내장 PDF 뷰어를 iframe으로 표시
- PDF 파일은 다운로드가 아니라 화면에서 바로 표시되도록 처리
- MD/TXT 문서는 줄 번호와 함께 텍스트로 표시
- 검색 결과에서 열 때 해당 페이지 또는 줄 위치 기준으로 열람
- 모달 바깥 영역 클릭 또는 ESC 키로 닫기
- 원본 파일 새 창 열기 링크 제공

## 7. 검색

- 키워드 검색
- 폴더별 필터
- 문서별 필터
- 확장자별 필터
- 검색 결과에 문서명, 폴더, 유형, 위치, 스니펫 표시
- 검색 키워드 하이라이트 표시
- 검색 결과에서 문서 열기 시 모달 뷰어 실행
- MD/TXT 검색 결과는 해당 줄로 이동
- PDF 검색 결과는 해당 페이지 기준으로 열기

## 8. 인덱스 관리

- 전체 문서 수, 인덱싱 완료 수, 실패 수, 검색 불가 수, 인덱스 항목 수 표시
- 전체 인덱스 재생성
- 전체 인덱스 재생성 중 작업 진행 상태 표시
- 파일별 인덱스 재생성
- 선택 문서 인덱스 재생성
- 파일별 인덱스 상태 목록 표시
- 인덱스 작업 중 메뉴 이동 차단
- 원본 파일이 없을 때 인덱스 실패 상태로 처리

## 9. 설정

- 앱 설정 조회
- 앱 설정 수정
- 저장 경로, 인덱스 경로, 로그 경로, 허용 확장자 등 설정 관리
- 감사 로그 사용 여부 설정
- 검색 하이라이트 사용 여부 설정

## 10. 로그

- 앱 로그 조회
- 오류 로그 조회
- 감사 로그 조회
- 로그 표시 줄 수 지정
- 관리자 점검용 로그 뷰어 제공

## 11. 데이터 저장 구조

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

## 12. 주요 API

### 문서

- `GET /api/documents`
- `GET /api/documents/{document_id}`
- `DELETE /api/documents/{document_id}`
- `GET /api/documents/{document_id}/preview`
- `GET /api/documents/{document_id}/file`
- `POST /api/documents/upload`
- `POST /api/documents/import-folder`

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

## 13. 서버 실행 문서

- `README.md`에 서버 기동, 재기동, 스탑 명령어 추가 완료
- VSCode PowerShell 기준 명령어 제공
- Backend/Frontend 실행 URL과 상태 확인 URL 정리

## 14. 현재 완료된 보완 사항

- PDF가 다운로드되지 않고 화면에서 바로 표시되도록 수정
- 문서 뷰어를 모달 형태로 변경
- 검색 키워드 하이라이트 적용
- 파일 업로드 진행률 표시
- 폴더 등록 진행 상태 표시
- 인덱스 재생성 진행 상태 표시
- 파일별 인덱스 재생성 기능 추가
- 폴더 클릭 시 내부 문서 목록 표시
- 폴더 기능과 문서 관리 기능 통합
- 작업 중 메뉴 이동 차단 및 새로고침 경고 추가

## 15. 향후 보완 후보

- 업로드/인덱싱 작업을 백엔드 Job Queue 방식으로 전환
- 작업 진행률을 서버 이벤트 또는 폴링으로 실시간 표시
- 대용량 PDF 인덱싱 최적화
- 문서 이동 기능
- 폴더별 권한 또는 잠금 기능
- 검색 결과 정렬 옵션
- 문서 메타데이터 편집 기능
