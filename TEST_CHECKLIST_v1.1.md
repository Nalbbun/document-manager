# Test Checklist v1.1

## Backend

- [x] Python 문법 검증: `python -m compileall backend\app`
- [ ] `/health` 응답 확인
- [ ] 파일 업로드 성공/실패 케이스 확인
- [ ] PPTX 업로드 및 인덱싱 확인
- [ ] PPTX 검색 결과와 텍스트 미리보기 확인
- [ ] PPT 파일 업로드 차단 확인
- [ ] 폴더 가져오기 허용 루트 확인
- [ ] 폴더 가져오기 절대 경로 차단 확인
- [ ] 숨김 파일 제외 확인
- [ ] 심볼릭 링크 차단 확인
- [ ] 검색 API 기본/AND/OR/문구/제외어 확인
- [ ] 검색 결과 CSV export 확인
- [ ] 검색 결과 Markdown export 확인
- [ ] 휴지통 복원 `block` 정책 확인
- [ ] 휴지통 복원 `auto_rename` 정책 확인
- [ ] 백업 생성 확인
- [ ] 백업 검증 확인
- [ ] 백업 미리보기 확인
- [ ] 백업 복원 dry-run 확인
- [ ] 로그 검색/다운로드/보관/삭제 확인
- [ ] 설정 저장 후 앱 재시작 확인

## Frontend

- [x] Frontend 빌드: `pnpm run build`
- [ ] 업로드 진행률 표시 확인
- [ ] 폴더 가져오기 작업 상태 표시 확인
- [ ] 작업 중 메뉴 이동 차단 확인
- [ ] 문서/폴더 통합 메뉴 확인
- [ ] 폴더 클릭 시 문서 목록 변경 확인
- [ ] 문서 모달 뷰어 확인
- [ ] 검색어 하이라이트 확인
- [ ] 검색 결과 내보내기 버튼 확인
- [ ] 백업 미리보기 패널 확인
- [ ] 로그 관리 버튼 확인
- [ ] 설정 화면 신규 필드 저장 확인

## Release

- [ ] `README_v1.1.md` 확인
- [ ] `FEATURE_SUMMARY_v1.1.md` 확인
- [ ] `CHANGELOG.md` 확인
- [ ] `TROUBLESHOOTING.md` 확인
- [ ] `RELEASE_NOTES_v1.1.1.md` 확인
- [ ] Git status에서 의도하지 않은 파일 포함 여부 확인
