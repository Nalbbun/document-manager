# Troubleshooting

## 서버가 켜지지 않을 때

1. 8000, 5173 포트가 이미 사용 중인지 확인합니다.
2. 필요하면 기존 프로세스를 종료합니다.

```powershell
Get-NetTCPConnection -LocalPort 8000,5173 -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object { Stop-Process -Id $_ -Force }
```

3. Backend와 Frontend를 다시 기동합니다.

## 업로드 또는 폴더 가져오기가 실패할 때

- 확장자가 `pdf`, `md`, `txt` 중 하나인지 확인합니다.
- 설정의 `maxUploadSizeMB`를 확인합니다.
- 같은 파일 내용이 이미 등록되어 있으면 해시 중복으로 차단됩니다.
- 서버 폴더 가져오기는 기본적으로 `data/import` 아래 경로만 허용됩니다.
- 절대 경로를 가져오려면 설정에서 `allowAbsoluteImportPath`를 켜야 합니다.
- Windows 시스템 폴더는 가져올 수 없습니다.
- 숨김 파일 또는 심볼릭 링크는 설정에 따라 제외될 수 있습니다.

## 검색 결과가 나오지 않을 때

- 문서의 `indexStatus`가 `INDEXED`인지 확인합니다.
- 인덱스 관리 화면에서 해당 파일 인덱스를 재생성합니다.
- 전체 인덱스 상태에서 실패 건수를 확인합니다.
- 검색 조건의 제외어, 태그, 즐겨찾기, 고정 필터를 해제해 봅니다.

## 백업 복원이 불안할 때

- 먼저 백업 검증을 실행합니다.
- 백업 미리보기에서 문서/폴더/인덱스/휴지통 개수를 확인합니다.
- 복원 버튼은 dry-run을 먼저 실행합니다.
- 실제 복원 전 `PRE_RESTORE` 안전 백업이 자동 생성됩니다.
- 복원 중 오류가 발생하면 안전 백업 기반 롤백을 시도하고 감사 로그에 남깁니다.

## 로그가 너무 클 때

- 로그 화면에서 키워드 또는 레벨로 필터링합니다.
- 다운로드로 보관합니다.
- Archive 버튼으로 `data/logs/archive`에 복사한 뒤 현재 로그를 비웁니다.
- Clear 버튼은 현재 로그 파일만 비웁니다.

## 화면 이동이 막힐 때

업로드, 인덱스 재생성, 백업 복원 등 긴 작업 중에는 메뉴 이동이 잠깁니다. 작업이 끝나면 자동으로 풀립니다.
