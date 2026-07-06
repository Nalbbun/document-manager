# Changelog

## v1.1 Stabilization

### Added

- Search result export API and UI for CSV and Markdown.
- Backup preview API and UI.
- Backup restore dry-run API and UI.
- Backup SHA-256 validation.
- Log search, download, archive, and clear APIs and UI.
- Trash restore conflict policy support.
- Import path security settings.
- Settings screen fields for retention and stabilization policies.
- `TROUBLESHOOTING.md`.
- `TEST_CHECKLIST_v1.1.md`.
- `RELEASE_NOTES_v1.1.1.md`.

### Changed

- JSON store writes now validate temporary JSON before replacing the target file.
- Runtime config writes now create a backup file and validate temporary JSON before replacement.
- Folder import now defaults to a controlled import root and reports skipped files with reasons.
- Search history retention now follows the configured limit.
- Backup restore now creates a safety backup and attempts rollback on restore failure.

### Verified

- Backend compile: `python -m compileall backend\app`
- Frontend build: `pnpm run build`

## v1.1 PPTX Support

### Added

- PPTX upload support.
- PPTX slide text extraction for indexing and search.
- PPTX text preview through the existing document viewer.
- PPTX extension filters in document and search screens.
- PPTX dashboard statistics.

### Notes

- Legacy PPT files are intentionally not supported.
- Users should convert PPT files to PPTX before upload.

### Verified

- Backend compile: `python -m compileall backend\app`
- Frontend build: `pnpm run build`
