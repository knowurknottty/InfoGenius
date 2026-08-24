import type { DatasetRecord, EvidenceRecord, SourceAsset } from "../../domain/artifact";
import { parseDelimited, profileRows, type TabularRow } from "../../ingest/tabular";

export interface TextSourceInput {
  name: string;
  mediaType: string;
  text: string;
}

export interface IntakeResult {
  source: SourceAsset;
  evidence: EvidenceRecord[];
  dataset?: DatasetRecord;
  previewRows: Array<Record<string, unknown>>;
  previewTruncated: boolean;
  duplicate: boolean;
  warnings: string[];
}

const PREVIEW_LIMIT = 200;

function extension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot + 1).toLowerCase();
}

function hex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256(text: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("Web Crypto SHA-256 is unavailable in this execution environment.");
  const digest = await subtle.digest("SHA-256", new TextEncoder().encode(text));
  return `sha256:${hex(digest)}`;
}

function tinyDigest(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `fnv1a32:${(h >>> 0).toString(16).padStart(8, "0")}`;
}

function scalarType(values: unknown[]): "string" | "number" | "integer" | "boolean" | "date" | "unknown" {
  const present = values.filter((value) => value !== null && value !== undefined);
  if (present.length === 0) return "unknown";
  if (present.every((value) => typeof value === "number")) return present.every((value) => Number.isInteger(value)) ? "integer" : "number";
  if (present.every((value) => typeof value === "boolean")) return "boolean";
  if (present.every((value) => typeof value === "string" && !Number.isNaN(Date.parse(value)) && /[-/:T]/.test(value))) return "date";
  return "string";
}

function makeJsonDataset(rows: Array<Record<string, unknown>>, source: SourceAsset): { dataset: DatasetRecord; evidence: EvidenceRecord[] } {
  const fields = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const evidence: EvidenceRecord[] = [];
  rows.forEach((row, rowIndex) => {
    for (const field of fields) {
      const value = row[field];
      if (value === null || value === undefined) continue;
      const content = typeof value === "string" ? value : JSON.stringify(value);
      evidence.push({
        id: `ev-${source.id}-r${rowIndex + 1}-${field}`,
        sourceId: source.id,
        locator: { kind: "path", value: `$[${rowIndex}].${field}` },
        contentDigest: tinyDigest(content),
        content,
        extraction: "parsed"
      });
    }
  });
  const missingness = Object.fromEntries(fields.map((field) => [field, rows.length === 0 ? 0 : rows.filter((row) => row[field] === null || row[field] === undefined).length / rows.length]));
  const columns = fields.map((field) => ({ id: field, label: field, type: scalarType(rows.map((row) => row[field])), sourceField: field }));
  return {
    dataset: {
      id: `ds-${source.id}`,
      name: source.name,
      sourceIds: [source.id],
      columns,
      rows,
      rowCount: rows.length,
      representedRowCount: rows.length,
      missingness,
      storage: { strategy: "inline" }
    },
    evidence
  };
}

function parseJsonRows(text: string, jsonLines: boolean): Array<Record<string, unknown>> {
  const value = jsonLines
    ? text.split(/\r?\n/).filter((line) => line.trim() !== "").map((line, index) => {
        try { return JSON.parse(line) as unknown; } catch (error) { throw new Error(`Invalid JSONL record ${index + 1}: ${error instanceof Error ? error.message : "parse error"}`); }
      })
    : JSON.parse(text) as unknown;
  const array = Array.isArray(value) ? value : [value];
  if (!array.every((row) => row && typeof row === "object" && !Array.isArray(row))) throw new Error("JSON ingestion requires an object or array of objects.");
  return array as Array<Record<string, unknown>>;
}

function tabularDataset(rows: TabularRow[], fields: string[], source: SourceAsset): DatasetRecord {
  const profile = profileRows(rows, fields, source.id);
  return {
    id: `ds-${source.id}`,
    name: source.name,
    sourceIds: [source.id],
    columns: profile.columns.map((column) => ({
      id: column.id,
      label: column.id,
      type: column.inferredType,
      inferredConfidence: column.confidence,
      sourceField: column.id
    })),
    rows,
    rowCount: profile.rowCount,
    representedRowCount: profile.rowCount,
    missingness: Object.fromEntries(profile.columns.map((column) => [column.id, column.missingRate])),
    storage: { strategy: "inline" },
    qualityFindings: profile.warnings.map((warning) => ({
      code: warning.code,
      severity: warning.code === "MIXED_UNITS" ? "error" : warning.code === "DUPLICATE_ROWS" ? "info" : "warning",
      columnId: warning.columnId,
      message: warning.message
    }))
  };
}

export async function ingestTextSource(input: TextSourceInput, existingDigests: Set<string> = new Set(), previewLimit = PREVIEW_LIMIT): Promise<IntakeResult> {
  const ext = extension(input.name);
  const supportedDelimited = input.mediaType === "text/csv" || ext === "csv" || input.mediaType === "text/tab-separated-values" || ext === "tsv";
  const supportedJson = input.mediaType === "application/json" || ext === "json";
  const supportedJsonl = input.mediaType === "application/x-ndjson" || input.mediaType === "application/jsonl" || ext === "jsonl" || ext === "ndjson";
  const supportedText = input.mediaType.startsWith("text/") || ["txt", "md", "markdown"].includes(ext);
  if (!supportedDelimited && !supportedJson && !supportedJsonl && !supportedText) throw new Error(`Unsupported source type: ${input.mediaType || ext || "unknown"}.`);

  const digest = await sha256(input.text);
  const sourceId = `src-${digest.slice("sha256:".length, "sha256:".length + 16)}`;
  const source: SourceAsset = {
    id: sourceId,
    name: input.name,
    mediaType: input.mediaType || "text/plain",
    digest,
    byteSize: new TextEncoder().encode(input.text).byteLength,
    origin: "upload",
    parseState: "parsed",
    locatorCapabilities: supportedDelimited ? ["row", "cell"] : supportedJson || supportedJsonl ? ["path"] : ["line"]
  };

  let dataset: DatasetRecord | undefined;
  let evidence: EvidenceRecord[] = [];
  if (supportedDelimited) {
    const parsed = parseDelimited(input.text, source.id, ext === "tsv" || input.mediaType === "text/tab-separated-values" ? "\t" : undefined);
    dataset = tabularDataset(parsed.rows, parsed.fields, source);
    evidence = parsed.evidence;
  } else if (supportedJson || supportedJsonl) {
    const built = makeJsonDataset(parseJsonRows(input.text, supportedJsonl), source);
    dataset = built.dataset;
    evidence = built.evidence;
  } else {
    evidence = input.text.split(/\r?\n/).map((line, index) => ({
      id: `ev-${source.id}-l${index + 1}`,
      sourceId: source.id,
      locator: { kind: "line" as const, value: `L${index + 1}` },
      contentDigest: tinyDigest(line),
      content: line,
      extraction: "verbatim" as const
    }));
  }

  const rows = dataset?.rows ?? [];
  return {
    source,
    evidence,
    dataset,
    previewRows: rows.slice(0, previewLimit),
    previewTruncated: rows.length > previewLimit,
    duplicate: existingDigests.has(digest),
    warnings: dataset?.qualityFindings?.map((finding) => finding.message) ?? []
  };
}


export async function ingestFile(file: File, existingDigests: Set<string> = new Set(), previewLimit = PREVIEW_LIMIT): Promise<IntakeResult> {
  const ext = extension(file.name);
  if (ext !== "xlsx" && ext !== "xls") {
    return ingestTextSource({ name: file.name, mediaType: file.type || "text/plain", text: await file.text() }, existingDigests, previewLimit);
  }
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("Web Crypto SHA-256 is unavailable in this execution environment.");
  const bytes = await file.arrayBuffer();
  const digest = `sha256:${hex(await subtle.digest("SHA-256", bytes))}`;
  const sourceId = `src-${digest.slice("sha256:".length, "sha256:".length + 16)}`;
  const source: SourceAsset = {
    id: sourceId, name: file.name, mediaType: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    digest, byteSize: file.size, origin: "upload", parseState: "parsed", locatorCapabilities: ["path", "cell"]
  };
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(bytes, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("Spreadsheet contains no worksheets.");
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: null, raw: true });
  const built = makeJsonDataset(rows, source);
  return {
    source, evidence: built.evidence, dataset: built.dataset, previewRows: rows.slice(0, previewLimit),
    previewTruncated: rows.length > previewLimit, duplicate: existingDigests.has(digest), warnings: []
  };
}
