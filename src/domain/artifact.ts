import { z } from "zod";

const stableId = z.string().min(1);
const digest = z.string().min(1);

export const SourceAssetSchema = z.object({
  id: stableId,
  name: z.string().min(1),
  mediaType: z.string().min(1),
  digest,
  byteSize: z.number().int().nonnegative(),
  origin: z.enum(["upload", "chatgpt_share", "web_research", "generated", "local_file", "fixture"]),
  parseState: z.enum(["pending", "parsed", "partial", "rejected", "error"]),
  locatorCapabilities: z.array(z.enum(["line", "page", "row", "cell", "path", "symbol", "timestamp", "region"])),
  warnings: z.array(z.string()).optional()
});

export const EvidenceLocatorSchema = z.object({ kind: z.enum(["line", "page", "row", "cell", "path", "symbol", "timestamp", "region"]), value: z.string().min(1) });
export const EvidenceRecordSchema = z.object({ id: stableId, sourceId: stableId, locator: EvidenceLocatorSchema, contentDigest: digest, content: z.string(), extraction: z.enum(["verbatim", "parsed", "derived", "model_interpretation"]) });
export const ColumnSchema = z.object({ id: stableId, label: z.string().min(1), type: z.enum(["string", "number", "integer", "boolean", "date", "datetime", "category", "unknown"]), unit: z.string().optional(), inferredConfidence: z.number().min(0).max(1).optional(), sourceField: z.string().optional() });
export const DatasetRecordSchema = z.object({
  id: stableId, name: z.string().min(1), sourceIds: z.array(stableId).min(1), columns: z.array(ColumnSchema).min(1), rows: z.array(z.record(z.string(), z.unknown())).optional(), rowCount: z.number().int().nonnegative(), representedRowCount: z.number().int().nonnegative(), missingness: z.record(z.string(), z.number().min(0).max(1)),
  storage: z.object({ strategy: z.enum(["inline", "indexeddb", "external_ref", "derived"]), reference: z.string().optional() }), warnings: z.array(z.string()).optional(),
  transformations: z.array(z.object({ id: stableId, operation: z.string().min(1), expression: z.string().optional(), inputDatasetIds: z.array(stableId), notes: z.string().optional() })).optional()
});
export const ClaimRecordSchema = z.object({
  id: stableId, text: z.string().min(1), epistemicStatus: z.enum(["fact", "derived", "inference", "estimate", "hypothesis", "user_assertion"]), claimType: z.enum(["descriptive_fact", "derived_metric", "statistical_inference", "model_interpretation", "external_context", "hypothesis", "user_assertion"]), confidence: z.number().min(0).max(1).optional(), evidenceIds: z.array(stableId), datasetIds: z.array(stableId), formula: z.string().optional(), caveats: z.array(z.string()), contradictionStatus: z.enum(["none", "possible", "confirmed", "unresolved"]), publishable: z.boolean()
});
export const VisualSpecSchema = z.object({
  id: stableId, title: z.string().min(1), family: z.enum(["bar", "dot", "line", "area", "scatter", "histogram", "status", "table", "flow", "network", "map", "interval"]), analyticalJob: z.enum(["comparison", "ranking", "change_over_time", "distribution", "relationship", "composition", "flow", "geography", "hierarchy_network", "uncertainty", "table_lookup"]), datasetId: stableId, claimIds: z.array(stableId), evidenceIds: z.array(stableId), encodings: z.record(z.string(), z.string()), annotations: z.array(z.object({ text: z.string(), datumKey: z.string().optional(), claimId: z.string().optional() })), filters: z.record(z.string(), z.unknown()), accessibleSummary: z.string().min(1), reasons: z.array(z.string()).optional()
});
export const AuditEventSchema = z.object({ id: stableId, operation: z.string().min(1), timestamp: z.string().min(1), actor: z.enum(["user", "deterministic_tool", "model", "system"]), toolOrModel: z.string().optional(), configDigest: z.string().optional(), warnings: z.array(z.string()).optional(), failures: z.array(z.string()).optional() });
export const VerificationFindingSchema = z.object({ id: stableId, severity: z.enum(["info", "warning", "error"]), code: z.string().min(1), message: z.string().min(1), claimId: z.string().optional(), visualId: z.string().optional(), datasetId: z.string().optional(), evidenceIds: z.array(z.string()).optional() });
export const VerificationReportSchema = z.object({ state: z.enum(["verified", "warnings", "blocked"]), checkedAt: z.string(), findings: z.array(VerificationFindingSchema), evidenceCoverage: z.object({ publishableClaims: z.number().int().nonnegative(), claimsWithEvidence: z.number().int().nonnegative(), visualsWithEvidence: z.number().int().nonnegative(), totalVisuals: z.number().int().nonnegative() }) });
export const ArtifactManifestSchema = z.object({
  schemaVersion: z.literal("1.0.0"), project: z.object({ id: stableId, name: z.string().min(1), createdAt: z.string().min(1), updatedAt: z.string().min(1) }), sources: z.array(SourceAssetSchema), evidence: z.array(EvidenceRecordSchema), datasets: z.array(DatasetRecordSchema), claims: z.array(ClaimRecordSchema), visuals: z.array(VisualSpecSchema), auditEvents: z.array(AuditEventSchema), verification: VerificationReportSchema.optional(), warnings: z.array(z.string()), exportMetadata: z.object({ generatedAt: z.string().min(1), generator: z.string().min(1), formatVersion: z.literal("1.0.0") })
});

export type SourceAsset = z.infer<typeof SourceAssetSchema>;
export type EvidenceRecord = z.infer<typeof EvidenceRecordSchema>;
export type DatasetRecord = z.infer<typeof DatasetRecordSchema>;
export type ClaimRecord = z.infer<typeof ClaimRecordSchema>;
export type VisualSpec = z.infer<typeof VisualSpecSchema>;
export type VerificationFinding = z.infer<typeof VerificationFindingSchema>;
export type VerificationReport = z.infer<typeof VerificationReportSchema>;
export type ArtifactManifest = z.infer<typeof ArtifactManifestSchema>;

function assertUniqueIds<T extends { id: string }>(label: string, values: T[]): void { const seen = new Set<string>(); for (const value of values) { if (seen.has(value.id)) throw new Error(`Duplicate ${label} ID: ${value.id}`); seen.add(value.id); } }
function requireRef(owner: string, refKind: string, ref: string, known: Set<string>): void { if (!known.has(ref)) throw new Error(`${owner} references missing ${refKind}: ${ref}`); }

export function parseArtifactManifest(input: unknown): ArtifactManifest {
  const manifest = ArtifactManifestSchema.parse(input);
  assertUniqueIds("source", manifest.sources); assertUniqueIds("evidence", manifest.evidence); assertUniqueIds("dataset", manifest.datasets); assertUniqueIds("claim", manifest.claims); assertUniqueIds("visual", manifest.visuals); assertUniqueIds("audit event", manifest.auditEvents);
  const sourceIds = new Set(manifest.sources.map((x) => x.id)); const evidenceIds = new Set(manifest.evidence.map((x) => x.id)); const datasetIds = new Set(manifest.datasets.map((x) => x.id)); const claimIds = new Set(manifest.claims.map((x) => x.id));
  for (const evidence of manifest.evidence) requireRef(evidence.id, "source", evidence.sourceId, sourceIds);
  for (const dataset of manifest.datasets) { for (const sourceId of dataset.sourceIds) requireRef(dataset.id, "source", sourceId, sourceIds); for (const transformation of dataset.transformations ?? []) for (const inputId of transformation.inputDatasetIds) requireRef(`${dataset.id}/${transformation.id}`, "input dataset", inputId, datasetIds); }
  for (const claim of manifest.claims) { for (const evidenceId of claim.evidenceIds) requireRef(claim.id, "evidence", evidenceId, evidenceIds); for (const datasetId of claim.datasetIds) requireRef(claim.id, "dataset", datasetId, datasetIds); }
  for (const visual of manifest.visuals) { requireRef(visual.id, "dataset", visual.datasetId, datasetIds); for (const claimId of visual.claimIds) requireRef(visual.id, "claim", claimId, claimIds); for (const evidenceId of visual.evidenceIds) requireRef(visual.id, "evidence", evidenceId, evidenceIds); for (const annotation of visual.annotations) if (annotation.claimId) requireRef(`${visual.id} annotation`, "claim", annotation.claimId, claimIds); }
  return manifest;
}
