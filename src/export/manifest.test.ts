import { describe, expect, it } from "vitest";
import type { ArtifactManifest } from "../domain/artifact";
import { exportManifest, importManifest } from "./manifest";

const manifest: ArtifactManifest = {
  schemaVersion: "1.0.0", project: { id: "p", name: "Roundtrip", createdAt: "2026-08-19T00:00:00Z", updatedAt: "2026-08-19T00:00:00Z" },
  sources: [{ id: "s", name: "data.csv", mediaType: "text/csv", digest: "sha256:s", byteSize: 5, origin: "fixture", parseState: "parsed", locatorCapabilities: ["cell"] }],
  evidence: [{ id: "e", sourceId: "s", locator: { kind: "cell", value: "R2C2" }, contentDigest: "sha256:e", content: "42", extraction: "parsed" }],
  datasets: [{ id: "d", name: "Data", sourceIds: ["s"], columns: [{ id: "value", label: "Value", type: "number" }], rows: [{ value: 42 }], rowCount: 1, representedRowCount: 1, missingness: { value: 0 }, storage: { strategy: "inline" } }],
  claims: [{ id: "c", text: "Value is 42.", epistemicStatus: "fact", claimType: "descriptive_fact", evidenceIds: ["e"], datasetIds: ["d"], caveats: [], contradictionStatus: "none", publishable: true }],
  visuals: [{ id: "v", title: "Value", family: "bar", analyticalJob: "comparison", datasetId: "d", claimIds: ["c"], evidenceIds: ["e"], encodings: { y: "value" }, annotations: [], filters: {}, accessibleSummary: "Value is 42." }],
  auditEvents: [], warnings: [], exportMetadata: { generatedAt: "2026-08-19T00:00:00Z", generator: "InfoGenius Evidence Studio", formatVersion: "1.0.0" }
};

describe("manifest export/import", () => {
  it("round-trips without ID, value, evidence-link or VisualSpec drift", () => {
    const first = exportManifest(manifest); const restored = importManifest(first); const second = exportManifest(restored);
    expect(second).toBe(first); expect(restored.visuals[0].claimIds).toEqual(["c"]); expect(restored.datasets[0].rows?.[0]).toEqual({ value: 42 });
  });
});
