import { describe, expect, it } from "vitest";
import { parseArtifactManifest, type ArtifactManifest } from "./artifact";

const validManifest: ArtifactManifest = {
  schemaVersion: "1.0.0",
  project: { id: "project-capt", name: "CAPT Weekly Brief", createdAt: "2026-08-19T16:29:00-05:00", updatedAt: "2026-08-19T16:29:00-05:00" },
  sources: [{ id: "src-weekly", name: "capt-weekly-brief-2026-08-19.txt", mediaType: "text/plain", digest: "sha256:abc", byteSize: 13593, origin: "chatgpt_share", parseState: "parsed", locatorCapabilities: ["line"] }],
  evidence: [{ id: "ev-python", sourceId: "src-weekly", locator: { kind: "line", value: "Python: 1096 passed / 13 skipped / 12 deselected / 0 failed" }, contentDigest: "sha256:def", content: "Python: 1096 passed / 13 skipped / 12 deselected / 0 failed", extraction: "verbatim" }],
  datasets: [{ id: "ds-tests", name: "Exact-head test evidence", sourceIds: ["src-weekly"], columns: [{ id: "suite", label: "Suite", type: "string" }, { id: "passed", label: "Passed", type: "number", unit: "tests" }], rows: [{ suite: "Python", passed: 1096 }], rowCount: 1, representedRowCount: 1, missingness: { suite: 0, passed: 0 }, storage: { strategy: "inline" } }],
  claims: [{ id: "claim-python", text: "Python exact-head suite passed 1,096 tests with zero failures.", epistemicStatus: "fact", claimType: "descriptive_fact", confidence: 1, evidenceIds: ["ev-python"], datasetIds: ["ds-tests"], caveats: [], contradictionStatus: "none", publishable: true }],
  visuals: [{ id: "visual-tests", title: "Exact-head verification", family: "bar", analyticalJob: "comparison", datasetId: "ds-tests", claimIds: ["claim-python"], evidenceIds: ["ev-python"], encodings: { x: "suite", y: "passed" }, annotations: [], filters: {}, accessibleSummary: "Python exact-head verification shows 1,096 passing tests." }],
  auditEvents: [], warnings: [], exportMetadata: { generatedAt: "2026-08-19T16:29:00-05:00", generator: "InfoGenius Evidence Studio", formatVersion: "1.0.0" }
};

describe("ArtifactManifest", () => {
  it("accepts a manifest whose source→evidence→claim→visual references all resolve", () => { const parsed = parseArtifactManifest(validManifest); expect(parsed.claims[0].evidenceIds).toEqual(["ev-python"]); expect(parsed.visuals[0].claimIds).toEqual(["claim-python"]); });
  it("rejects a claim that points to nonexistent evidence", () => { const broken = structuredClone(validManifest); broken.claims[0].evidenceIds = ["ev-missing"]; expect(() => parseArtifactManifest(broken)).toThrow(/claim-python.*ev-missing/i); });
  it("rejects a visual that points to a nonexistent dataset", () => { const broken = structuredClone(validManifest); broken.visuals[0].datasetId = "ds-missing"; expect(() => parseArtifactManifest(broken)).toThrow(/visual-tests.*ds-missing/i); });
  it("rejects duplicate stable IDs because provenance edges would become ambiguous", () => { const broken = structuredClone(validManifest); broken.evidence.push({ ...broken.evidence[0] }); expect(() => parseArtifactManifest(broken)).toThrow(/duplicate.*ev-python/i); });
});
