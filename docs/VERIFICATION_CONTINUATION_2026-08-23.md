# Evidence Studio continuation verification — 2026-08-23

Authority was reconciled before publishing: remote `origin/feat/evidence-studio-r1` at `0e78bf2` contained a substantially stronger implementation than the stale local line, so the remote branch became the integration base rather than being overwritten.

## Surviving upgrades

- Added `package-lock.json` and exact package versions; CI now uses `npm ci` rather than floating `npm install` resolution.
- Added official SheetJS CE 0.20.3 from the vendor CDN for XLS/XLSX intake. The parser is dynamically imported so spreadsheet support does not inflate the initial application chunk.
- Added XLS/XLSX browser intake with byte-level SHA-256 source identity and deterministic evidence/dataset construction.
- Replaced the CAPT Weekly Brief logical source digest with the measured byte-for-byte Mac capture: 13,593 bytes, SHA-256 `2bcf85fd175edfaa03662f196c84f528e2a73803f7875635945af0e79949507a`.
- Reconciled CAPT/RDC gap status: remote transport is restored; broad permission-aware search and stable native new-task automation remain open.

## Exact local verification

- `npm run test:run` → 11 files, 41 tests passed, 0 failed.
- `npm run typecheck` → PASS.
- `npm run build` → PASS.
  - initial JS: ~328.35 kB (~100.58 kB gzip)
  - lazy SheetJS chunk: ~492.52 kB (~160.52 kB gzip)
- `npm audit --omit=dev` → 0 vulnerabilities.

The artifact-integrity verifier remains intentionally distinct from the CAPT subject release state; `NOT_VERIFIED` is not rewritten as `FAIL` or release authorization.
