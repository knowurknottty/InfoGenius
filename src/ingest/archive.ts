export interface ZipSafetyPolicy {
  maxEntries: number;
  maxExpandedBytes: number;
  maxCompressionRatio: number;
}

export interface ZipEntrySummary {
  path: string;
  compressedBytes: number;
  expandedBytes: number;
  compressionRatio: number;
  directory: boolean;
}

export interface ZipFinding {
  code: "INVALID_ZIP" | "ZIP64_UNSUPPORTED" | "ENTRY_LIMIT" | "PATH_TRAVERSAL" | "ABSOLUTE_PATH" | "EXPANDED_BYTES_LIMIT" | "COMPRESSION_RATIO_LIMIT";
  severity: "error";
  path?: string;
  message: string;
}

export interface ZipInspection {
  accepted: boolean;
  entries: ZipEntrySummary[];
  totalCompressedBytes: number;
  totalExpandedBytes: number;
  findings: ZipFinding[];
}

const CENTRAL_FILE_SIGNATURE = 0x02014b50;
const END_SIGNATURE = 0x06054b50;
const ZIP64_SENTINEL_16 = 0xffff;
const ZIP64_SENTINEL_32 = 0xffffffff;

function findEndOfCentralDirectory(view: DataView): number {
  const minimum = 22;
  const maxComment = 0xffff;
  const start = Math.max(0, view.byteLength - minimum - maxComment);
  for (let offset = view.byteLength - minimum; offset >= start; offset -= 1) {
    if (view.getUint32(offset, true) === END_SIGNATURE) return offset;
  }
  return -1;
}

function decodeName(bytes: Uint8Array, offset: number, length: number): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes.subarray(offset, offset + length));
}

function classifyPath(rawPath: string): ZipFinding[] {
  const findings: ZipFinding[] = [];
  const normalized = rawPath.replace(/\\/g, "/");
  if (normalized.startsWith("/") || /^[A-Za-z]:\//.test(normalized)) {
    findings.push({ code: "ABSOLUTE_PATH", severity: "error", path: rawPath, message: `Archive entry uses an absolute path: ${rawPath}` });
  }
  if (normalized.split("/").some((segment) => segment === "..")) {
    findings.push({ code: "PATH_TRAVERSAL", severity: "error", path: rawPath, message: `Archive entry attempts parent traversal: ${rawPath}` });
  }
  return findings;
}

export async function inspectZip(input: ArrayBuffer | Uint8Array, policy: ZipSafetyPolicy): Promise<ZipInspection> {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const findings: ZipFinding[] = [];
  const entries: ZipEntrySummary[] = [];
  const eocd = findEndOfCentralDirectory(view);

  if (eocd < 0) {
    return { accepted: false, entries, totalCompressedBytes: 0, totalExpandedBytes: 0, findings: [{ code: "INVALID_ZIP", severity: "error", message: "End-of-central-directory record was not found." }] };
  }

  const entryCount = view.getUint16(eocd + 10, true);
  const centralSize = view.getUint32(eocd + 12, true);
  const centralOffset = view.getUint32(eocd + 16, true);
  if (entryCount === ZIP64_SENTINEL_16 || centralSize === ZIP64_SENTINEL_32 || centralOffset === ZIP64_SENTINEL_32) {
    return { accepted: false, entries, totalCompressedBytes: 0, totalExpandedBytes: 0, findings: [{ code: "ZIP64_UNSUPPORTED", severity: "error", message: "ZIP64 archives require a streaming server-side ingestion path and are not accepted by this browser preflight." }] };
  }
  if (entryCount > policy.maxEntries) {
    findings.push({ code: "ENTRY_LIMIT", severity: "error", message: `Archive contains ${entryCount} entries; policy permits ${policy.maxEntries}.` });
  }
  if (centralOffset + centralSize > bytes.byteLength) {
    findings.push({ code: "INVALID_ZIP", severity: "error", message: "Central directory extends beyond the supplied bytes." });
    return { accepted: false, entries, totalCompressedBytes: 0, totalExpandedBytes: 0, findings };
  }

  let offset = centralOffset;
  let totalCompressedBytes = 0;
  let totalExpandedBytes = 0;
  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > bytes.byteLength || view.getUint32(offset, true) !== CENTRAL_FILE_SIGNATURE) {
      findings.push({ code: "INVALID_ZIP", severity: "error", message: `Central directory entry ${index + 1} is malformed.` });
      break;
    }
    const compressedBytes = view.getUint32(offset + 20, true);
    const expandedBytes = view.getUint32(offset + 24, true);
    const fileNameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const nameOffset = offset + 46;
    if (nameOffset + fileNameLength > bytes.byteLength) {
      findings.push({ code: "INVALID_ZIP", severity: "error", message: `Archive filename ${index + 1} extends beyond the supplied bytes.` });
      break;
    }
    const path = decodeName(bytes, nameOffset, fileNameLength);
    findings.push(...classifyPath(path));
    const compressionRatio = expandedBytes === 0 ? 0 : expandedBytes / Math.max(1, compressedBytes);
    if (compressionRatio > policy.maxCompressionRatio) {
      findings.push({ code: "COMPRESSION_RATIO_LIMIT", severity: "error", path, message: `${path} expands at ${compressionRatio.toFixed(1)}×; policy permits ${policy.maxCompressionRatio}×.` });
    }
    totalCompressedBytes += compressedBytes;
    totalExpandedBytes += expandedBytes;
    entries.push({ path, compressedBytes, expandedBytes, compressionRatio, directory: path.endsWith("/") });
    offset = nameOffset + fileNameLength + extraLength + commentLength;
  }

  if (totalExpandedBytes > policy.maxExpandedBytes) {
    findings.push({ code: "EXPANDED_BYTES_LIMIT", severity: "error", message: `Archive expands to ${totalExpandedBytes} bytes; policy permits ${policy.maxExpandedBytes}.` });
  }

  return { accepted: findings.length === 0, entries: entries.filter((entry) => !entry.directory), totalCompressedBytes, totalExpandedBytes, findings };
}
