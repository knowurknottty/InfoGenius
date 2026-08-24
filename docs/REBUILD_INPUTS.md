# InfoGenius Evidence Studio — Rebuild Inputs

## Authority order

1. User directive: reconstruct InfoGenius and materially enhance it as Evidence Studio.
2. User-supplied product contract: `02_infogenius_evidence-studio.md`.
3. Demo evidence corpus: shared ChatGPT CAPT Weekly Brief (`https://chatgpt.com/share/6a862225-2074-83ea-8ba8-be7f52b4c3f9`).
4. Repository truth in `knowurknottty/InfoGenius`.

## Repository truth at start

The GitHub repository was empty (`size: 0`, no contents/default-branch tree). Historical InfoGenius source was therefore unavailable for code-level inspection or regression proof. Documented legacy primitives are compatibility requirements, not claims about code observed in this repository.

## Product thesis

InfoGenius Evidence Studio is a quantitative evidence-to-visual-story compiler:

`source asset → deterministic parse/profile → evidence → typed claim → VisualSpec → deterministic renderer → verification → export`

Generative image models may create editorial art, but never authoritative quantitative marks, values, labels, or citations.

## Core stages

1. Intake — multi-source import, fingerprinting, parsing, safety checks.
2. Profile — schema, missingness, units/types, quality warnings, provenance.
3. Ask / Discover — analytical question + inspectable chart-family reasoning.
4. Compose — evidence-linked claims and deterministic visuals.
5. Verify — recomputation, coverage, units/denominators, contradiction/misleading-encoding guards.
6. Export — versioned ArtifactManifest, data/visual state, methodology and print path.

## CAPT demo corpus — structured facts

- main: `4a2eddbf0dbd09b976e2c890ce6f704db3fce8cf`
- PR #117: `5c0bdf02a3eb6d20cb4c33b0ad3ec517a0d11689`
- PR #118: `0dbb9fa467127830089763a22723f44c744ba335`
- Python: 1096 passed / 13 skipped / 12 deselected / 0 failed
- Swift: 63 tests / 7 deliberate opt-in skips / 0 failures
- MCP: 259 passing tests
- security cockpit: PASS 0 / FAIL 0 / NOT_VERIFIED 21 / N/A 26 / `releaseAuthorized:false`
- installed source identity points to PR #118-era code, while the observed RuntimeService start predates that install; the correct conclusion is an unresolved running-process identity/restart verification gap, not a proven source defect.

## Trust constraints

- Uploaded content is untrusted data, not execution authority.
- Stable IDs and cross-references are validated before rendering.
- Verification success is deterministic; model assertion alone cannot produce green.
- Dirty-data transformations/exclusions must remain auditable.
- Large tables must be bounded/virtualized rather than rendered wholesale.
- ZIP traversal, absolute paths, suspicious expansion, and excessive expansion are rejected before extraction.
- Desktop/mobile are sibling reading surfaces; evidence access cannot require hover.
- Missing capabilities are recorded in `docs/CAPT_CAPABILITY_GAPS.md` instead of silently replaced.
