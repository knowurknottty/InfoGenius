# InfoGenius Evidence Studio — 5× Upgrade Ledger

Date: 2026-08-19  
Branch: `feat/evidence-studio-r1`

## R1 — Repository truth and invariants

- The repository was empty at reconstruction start; no historical implementation is claimed as observed.
- The user-supplied Evidence Studio contract is normative.
- The CAPT Weekly Brief is the canonical built-in demonstration corpus.
- Documented legacy compatibility goals: easy topic/research entry, complexity/style/language controls, source cards, editorial image generation/editing, infographic-centered output.

**Candidate 1:** React/Vite/TypeScript instrument with Intake → Profile → Ask → Compose → Verify → Export and a versioned `ArtifactManifest`.

## R2 — Adversarial gap analysis

Candidate 1 fails if parser coercion erases source truth, if model suggestions become evidence, if missing evidence can still verify green, if uploaded instructions gain authority, or if large row sets are emitted directly into the DOM.

Epistemic states are explicit: fact, derived, inference, estimate, hypothesis, user assertion.

**Candidate 2:** move authority into pure tested domain modules; UI consumes validated graphs and verification findings rather than inventing status.

## R3 — Evidence and scale architecture

Provenance graph:

`SourceAsset → EvidenceRecord → ClaimRecord → VisualSpec → VerificationFinding → ExportEvent`

Raw assets are fingerprinted; manifests contain structured references rather than duplicating arbitrary binary payloads. Browser rendering is bounded. Archive inspection occurs before extraction.

**Candidate 3:** domain-first compiler core + thin React instrument shell.

## R4 — Product and information design

Reading path: `intake → understand → interrogate → compose → verify → export`.

Desktop: source/data rail → dominant evidence canvas → claim/evidence inspector.  
Mobile: central artifact remains primary; rails become stacked/sheet-like surfaces; no hover-only evidence.

Visual language: editorial data laboratory—neutral paper/canvas, typography-led hierarchy, restrained focal accent, semantic state colors, direct labels, minimal chrome.

**Candidate 4:** one coherent analytical instrument, not dashboard-card soup.

## R5 — Red-team implementation contract

Fail closed or warn explicitly when:

- claim/evidence/dataset/visual references do not resolve;
- factual claims or visuals lack evidence;
- units/types make aggregation misleading;
- denominators change without disclosure;
- correlation is upgraded to causation;
- archives escape root or exceed expansion policy;
- export/import changes IDs, values, evidence links, or VisualSpecs;
- source text contains instruction-like content;
- a table would require unbounded DOM output;
- an unavailable capability would otherwise be simulated.

Implementation order: contracts → deterministic ingest → archive safety → classifier → verification → roundtrip → CAPT canonical demo → code renderer → six-stage UI → bounded intake/persistence → accessibility/mobile → adversarial recursion → deployment.

## Forced deviations / open verification gaps

- Historical upgrade-in-place regression proof is impossible because the original repository had no source history.
- No image-generation tool is exposed in this chat; the supplied art-direction contract is design authority, and no generated concept is falsely claimed.
- CAPT macOS was dogfooded and exposed native operator defects, but cannot currently perform final governed review because the Mac/RDC transport is offline. See the gap ledger.
