import { parseArtifactManifest, type ArtifactManifest, type VerificationFinding, type VerificationReport } from "../domain/artifact";

function findingId(code: string, index: number): string { return `vf-${code.toLowerCase()}-${String(index + 1).padStart(3, "0")}`; }
function causalLanguage(text: string): boolean { return /\b(causes?|caused|drives?|driven by|leads? to|results? in|makes?)\b/i.test(text); }

export function verifyManifest(input: ArtifactManifest, checkedAt: string): VerificationReport {
  const findings: VerificationFinding[] = [];
  try { parseArtifactManifest(input); } catch (error) {
    const message = error instanceof Error ? error.message : "Manifest schema or references are invalid.";
    findings.push({ id: findingId("MANIFEST_INVALID", findings.length), severity: "error", code: "MANIFEST_INVALID", message });
  }

  for (const dataset of input.datasets) {
    for (const quality of dataset.qualityFindings ?? []) {
      findings.push({ id: findingId(quality.code, findings.length), severity: quality.severity, code: quality.code, message: quality.message, datasetId: dataset.id });
    }
  }

  for (const claim of input.claims) {
    if (claim.publishable && claim.evidenceIds.length === 0) {
      findings.push({ id: findingId("MISSING_CLAIM_EVIDENCE", findings.length), severity: "error", code: "MISSING_CLAIM_EVIDENCE", message: `Publishable claim ${claim.id} has no evidence linkage.`, claimId: claim.id });
    }
    if (claim.publishable && (claim.contradictionStatus === "confirmed" || claim.contradictionStatus === "unresolved")) {
      findings.push({ id: findingId("UNRESOLVED_CONTRADICTION", findings.length), severity: "error", code: "UNRESOLVED_CONTRADICTION", message: `Publishable claim ${claim.id} has contradiction status ${claim.contradictionStatus}.`, claimId: claim.id, evidenceIds: claim.evidenceIds });
    } else if (claim.contradictionStatus === "possible") {
      findings.push({ id: findingId("POSSIBLE_CONTRADICTION", findings.length), severity: "warning", code: "POSSIBLE_CONTRADICTION", message: `Claim ${claim.id} has a possible contradiction that should be inspected.`, claimId: claim.id, evidenceIds: claim.evidenceIds });
    }
    const correlationOnly = claim.datasetIds.some((datasetId) => input.datasets.find((dataset) => dataset.id === datasetId)?.qualityFindings?.some((quality) => quality.code === "CORRELATION_ONLY"));
    if (claim.publishable && claim.claimType === "statistical_inference" && correlationOnly && causalLanguage(claim.text)) {
      findings.push({ id: findingId("CAUSAL_LANGUAGE_ON_CORRELATION", findings.length), severity: "error", code: "CAUSAL_LANGUAGE_ON_CORRELATION", message: `Claim ${claim.id} uses causal language while its linked dataset is marked correlation-only.`, claimId: claim.id, evidenceIds: claim.evidenceIds });
    }
  }

  for (const visual of input.visuals) {
    if (visual.evidenceIds.length === 0) {
      findings.push({ id: findingId("MISSING_VISUAL_EVIDENCE", findings.length), severity: "error", code: "MISSING_VISUAL_EVIDENCE", message: `Visual ${visual.id} has no evidence linkage.`, visualId: visual.id });
    }
  }

  const publishableClaims = input.claims.filter((claim) => claim.publishable);
  const evidenceCoverage = {
    publishableClaims: publishableClaims.length,
    claimsWithEvidence: publishableClaims.filter((claim) => claim.evidenceIds.length > 0).length,
    visualsWithEvidence: input.visuals.filter((visual) => visual.evidenceIds.length > 0).length,
    totalVisuals: input.visuals.length
  };
  const state: VerificationReport["state"] = findings.some((f) => f.severity === "error") ? "blocked" : findings.some((f) => f.severity === "warning") ? "warnings" : "verified";
  return { state, checkedAt, findings, evidenceCoverage };
}
