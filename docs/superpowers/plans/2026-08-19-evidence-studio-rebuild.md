# InfoGenius Evidence Studio Rebuild Plan

**Goal:** reconstruct InfoGenius as a production-oriented evidence-to-visual-story compiler, demonstrated with the August 19 CAPT Weekly Brief.

**Architecture:** a pure deterministic compiler core owns schemas, parsing/profiling, evidence/claim lineage, analytical-job selection, VisualSpecs, verification, and reproducible export. React is the operator surface. Generative AI, if later configured, is editorial-only.

## Execution checklist

- [x] Establish repository truth and R1→R5 architecture ledger.
- [x] Create versioned ArtifactManifest + cross-reference validation.
- [x] Build deterministic CSV/TSV parsing/profile with raw-value preservation.
- [x] Add pre-extraction ZIP safety inspection.
- [x] Add inspectable analytical-job classifier.
- [x] Add deterministic verification guards and evidence coverage.
- [x] Add canonical manifest export/import roundtrip.
- [x] Encode the CAPT Weekly Brief as a provenance-linked canonical demo.
- [x] Add deterministic SVG/table/status rendering from VisualSpecs.
- [x] Build the six-stage editorial Evidence Studio UI.
- [x] Add SHA-256 browser text intake, digest dedupe, JSON/JSONL, bounded previews.
- [ ] Prove bounded visual/table behavior under large logical row counts.
- [ ] Add real persisted project snapshot/load path and share-state boundary.
- [ ] Add adversarial fixtures for dirty data, mixed units, denominator drift, correlation traps, prompt-injection text, archive attacks.
- [ ] Add explicit unsupported-visual behavior; never silently change analytical semantics.
- [ ] Add/verify spreadsheet, PDF, and image-metadata baseline or record precise R1 exclusions.
- [ ] Run full tests + typecheck + production build on exact head.
- [ ] Run second R1→R5 recursion against built behavior and record remaining release gaps.
- [ ] Reconnect CAPT macOS/RDC, reconcile local bytes/repo state, and run governed review.
- [ ] Deploy verified branch to Netlify and verify deployment identity if connector capability permits it.
- [ ] Update PR with exact evidence and leave draft until unresolved verification gates are explicitly accepted/closed.
