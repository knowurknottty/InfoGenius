import { describe, expect, it } from "vitest";
import type { ArtifactManifest } from "../domain/artifact";
import { verifyManifest } from "./verifyManifest";

function baseManifest(): ArtifactManifest {
  return {
    schemaVersion: "1.0.0",
    project: { id: "p", name: "Verification fixture", createdAt: "2026-08-19T00:00:00Z", updatedAt: "2026-08-19T00:00:00Z" },
    sources: [{ id: "s", name: "fixture.csv", mediaType: "text/csv", digest: "sha256:s", byteSize: 10, origin: "fixture", parseState: "parsed", locatorCapabilities: ["cell"] }],
    evidence: [{ id: "e", sourceId: "s", locator: { kind: "cell", value: "R2C2" }, contentDigest: "sha256:e", content: "10", extraction: "parsed" }],
    datasets: [{ id: "d", name: "fixture", sourceIds: ["s"], columns: [{ id: "group", label: "Group", type: "string" }, { id: "value", label: "Value", type: "number" }], rows: [{ group: "A", value: 10 }], rowCount: 1, representedRowCount: 1, missingness: { group: 0, value: 0 }, storage: { strategy: "inline" } }],
    claims: [{ id: "c", text: "Group A has value 10.", epistemicStatus: "fact", claimType: "descriptive_fact", confidence: 1, evidenceIds: ["e"], datasetIds: ["d"], caveats: [], contradictionStatus: "none", publishable: true }],
    visuals: [{ id: "v", title: "Value", family: "bar", analyticalJob: "comparison", datasetId: "d", claimIds: ["c"], evidenceIds: ["e"], encodings: { x: "group", y: "value" }, annotations: [], filters: {}, accessibleSummary: "Group A has value 10." }],
    auditEvents: [], warnings: [], exportMetadata: { generatedAt: "2026-08-19T00:00:00Z", generator: "InfoGenius Evidence Studio", formatVersion: "1.0.0" }
  };
}

describe("manifest verification", () => {
  it("blocks a publishable claim with no evidence", () => {
    const manifest = baseManifest(); manifest.claims[0].evidenceIds = [];
    const report = verifyManifest(manifest, "2026-08-19T00:00:00Z");
    expect(report.state).toBe("blocked");
    expect(report.findings.map((f) => f.code)).toContain("MISSING_CLAIM_EVIDENCE");
  });

  it("blocks a factual visual with no evidence linkage", () => {
    const manifest = baseManifest(); manifest.visuals[0].evidenceIds = [];
    const report = verifyManifest(manifest, "2026-08-19T00:00:00Z");
    expect(report.state).toBe("blocked");
    expect(report.findings.map((f) => f.code)).toContain("MISSING_VISUAL_EVIDENCE");
  });

  it("flags mixed units and changing denominators instead of blessing the chart", () => {
    const manifest = baseManifest();
    manifest.datasets[0].qualityFindings = [
      { code: "MIXED_UNITS", severity: "error", columnId: "value", message: "USD and raw unitless values coexist." },
      { code: "CHANGING_DENOMINATOR", severity: "warning", columnId: "value", message: "Population denominator changes across periods." }
    ];
    const report = verifyManifest(manifest, "2026-08-19T00:00:00Z");
    expect(report.state).toBe("blocked");
    expect(report.findings.map((f) => f.code)).toEqual(expect.arrayContaining(["MIXED_UNITS", "CHANGING_DENOMINATOR"]));
  });

  it("detects denominator drift directly from rate + denominator-shaped columns", () => {
    const manifest = baseManifest();
    manifest.datasets[0] = {
      ...manifest.datasets[0],
      columns: [{ id: "period", label: "Period", type: "integer" }, { id: "events", label: "Events", type: "integer" }, { id: "population", label: "Population", type: "integer" }, { id: "rate", label: "Rate", type: "number", unit: "percent" }],
      rows: [{ period: 2024, events: 10, population: 100, rate: 10 }, { period: 2025, events: 15, population: 300, rate: 5 }, { period: 2026, events: 20, population: 250, rate: 8 }],
      rowCount: 3, representedRowCount: 3, missingness: { period: 0, events: 0, population: 0, rate: 0 }
    };
    manifest.visuals[0] = { ...manifest.visuals[0], datasetId: "d", encodings: { x: "period", y: "rate" } };
    const report = verifyManifest(manifest, "2026-08-19T00:00:00Z");
    expect(report.state).toBe("warnings");
    expect(report.findings.map((f) => f.code)).toContain("CHANGING_DENOMINATOR");
  });

  it("blocks causal language when evidence is explicitly correlation-only", () => {
    const manifest = baseManifest();
    manifest.claims[0] = { ...manifest.claims[0], text: "Higher coverage causes fewer failures.", epistemicStatus: "inference", claimType: "statistical_inference" };
    manifest.datasets[0].qualityFindings = [{ code: "CORRELATION_ONLY", severity: "warning", message: "Observational association only." }];
    const report = verifyManifest(manifest, "2026-08-19T00:00:00Z");
    expect(report.state).toBe("blocked");
    expect(report.findings.map((f) => f.code)).toContain("CAUSAL_LANGUAGE_ON_CORRELATION");
  });

  it("blocks causal language for a relationship visual even without a hand-authored correlation flag", () => {
    const manifest = baseManifest();
    manifest.claims[0] = { ...manifest.claims[0], text: "Higher coverage causes fewer failures.", epistemicStatus: "inference", claimType: "statistical_inference" };
    manifest.visuals[0] = { ...manifest.visuals[0], family: "scatter", analyticalJob: "relationship", claimIds: ["c"] };
    const report = verifyManifest(manifest, "2026-08-19T00:00:00Z");
    expect(report.state).toBe("blocked");
    expect(report.findings.map((f) => f.code)).toContain("CAUSAL_LANGUAGE_ON_CORRELATION");
  });

  it("verifies a fully evidenced deterministic artifact", () => {
    const report = verifyManifest(baseManifest(), "2026-08-19T00:00:00Z");
    expect(report.state).toBe("verified");
    expect(report.evidenceCoverage).toEqual({ publishableClaims: 1, claimsWithEvidence: 1, visualsWithEvidence: 1, totalVisuals: 1 });
  });
});
