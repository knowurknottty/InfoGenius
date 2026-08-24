import { parseArtifactManifest, type ArtifactManifest, type DatasetRecord, type VerificationFinding, type VerificationReport } from "../domain/artifact";

function findingId(code: string, index: number): string { return `vf-${code.toLowerCase()}-${String(index + 1).padStart(3, "0")}`; }
function causalLanguage(text: string): boolean { return /\b(causes?|caused|drives?|driven by|leads? to|results? in|makes?)\b/i.test(text); }
function rateLike(id: string, unit?: string): boolean { return unit === "percent" || /(^|_)(rate|ratio|percent|percentage|pct)($|_)/i.test(id); }
function denominatorLike(id: string): boolean { return /(^|_)(population|denominator|sample_size|sample|base|eligible|exposure|n_total|total_population)($|_)/i.test(id); }

function hasChangingDenominator(dataset: DatasetRecord, yKey?: string): { denominatorId: string; uniqueCount: number } | undefined {
  if (!yKey || !dataset.rows || dataset.rows.length < 2) return undefined;
  const yColumn = dataset.columns.find((column) => column.id === yKey);
  if (!yColumn || !rateLike(yColumn.id, yColumn.unit)) return undefined;
  const denominator = dataset.columns.find((column) => denominatorLike(column.id));
  if (!denominator) return undefined;
  const values = dataset.rows
    .map((row) => row[denominator.id])
    .filter((value) => value !== null && value !== undefined && value !== "")
    .map((value) => String(value));
  const uniqueCount = new Set(values).size;
  return uniqueCount > 1 ? { denominatorId: denominator.id, uniqueCount } : undefined;
}

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

  for (const visual of input.visuals) {
    if (visual.evidenceIds.length === 0) {
      findings.push({ id: findingId("MISSING_VISUAL_EVIDENCE", findings.length), severity: "error", code: "MISSING_VISUAL_EVIDENCE", message: `Visual ${visual.id} has no evidence linkage.`, visualId: visual.id });
    }
    const dataset = input.datasets.find((candidate) => candidate.id === visual.datasetId);
    const denominatorDrift = dataset ? hasChangingDenominator(dataset, visual.encodings.y ?? visual.encodings.value) : undefined;
    const alreadyDeclared = dataset?.qualityFindings?.some((quality) => quality.code === "CHANGING_DENOMINATOR");
    if (dataset && denominatorDrift && !alreadyDeclared) {
      findings.push({
        id: findingId("CHANGING_DENOMINATOR", findings.length),
        severity: "warning",
        code: "CHANGING_DENOMINATOR",
        message: `Visual ${visual.id} encodes a rate while denominator column ${denominatorDrift.denominatorId} changes across ${denominatorDrift.uniqueCount} observed values. Confirm that comparisons remain meaningful and disclose the denominator change.`,
        visualId: visual.id,
        datasetId: dataset.id,
        evidenceIds: visual.evidenceIds
      });
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

    const correlationFlag = claim.datasetIds.some((datasetId) => input.datasets.find((dataset) => dataset.id === datasetId)?.qualityFindings?.some((quality) => quality.code === "CORRELATION_ONLY"));
    const relationshipVisual = input.visuals.some((visual) => visual.claimIds.includes(claim.id) && visual.analyticalJob === "relationship");
    if (claim.publishable && claim.claimType === "statistical_inference" && causalLanguage(claim.text) && (correlationFlag || relationshipVisual)) {
      findings.push({
        id: findingId("CAUSAL_LANGUAGE_ON_CORRELATION", findings.length),
        severity: "error",
        code: "CAUSAL_LANGUAGE_ON_CORRELATION",
        message: `Claim ${claim.id} uses causal language while its evidence only establishes a relationship/association. Causal publication requires an explicit causal design or stronger evidence contract.`,
        claimId: claim.id,
        evidenceIds: claim.evidenceIds
      });
    }
  }

  const publishableClaims = input.claims.filter((claim) => claim.publishable);
  const evidenceCoverage = {
    publishableClaims: publishableClaims.length,
    claimsWithEvidence: publishableClaims.filter((claim) => claim.evidenceIds.length > 0).length,
    visualsWithEvidence: input.visuals.filter((visual) => visual.evidenceIds.length > 0).length,
    totalVisuals: input.visuals.length
  };
  const state: VerificationReport["state"] = findings.some((finding) => finding.severity === "error") ? "blocked" : findings.some((finding) => finding.severity === "warning") ? "warnings" : "verified";
  return { state, checkedAt, findings, evidenceCoverage };
}
