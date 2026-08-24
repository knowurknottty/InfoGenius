import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { inspectZip } from "./archive";

async function makeZip(entries: Record<string, string>, compression: "STORE" | "DEFLATE" = "DEFLATE") { const zip = new JSZip(); for (const [path, content] of Object.entries(entries)) zip.file(path, content); return zip.generateAsync({ type: "uint8array", compression }); }

describe("ZIP safety preflight", () => {
  it("rejects traversal paths even when the ZIP library sanitizes the exposed name", async () => { const bytes = await makeZip({ "../escape.txt": "evil" }); const result = await inspectZip(bytes, { maxEntries: 100, maxExpandedBytes: 1_000_000, maxCompressionRatio: 100 }); expect(result.accepted).toBe(false); expect(result.findings.map((f) => f.code)).toContain("PATH_TRAVERSAL"); });
  it("rejects absolute paths", async () => { const bytes = await makeZip({ "/tmp/escape.txt": "evil" }); const result = await inspectZip(bytes, { maxEntries: 100, maxExpandedBytes: 1_000_000, maxCompressionRatio: 100 }); expect(result.accepted).toBe(false); expect(result.findings.map((f) => f.code)).toContain("ABSOLUTE_PATH"); });
  it("rejects an archive whose expanded content exceeds policy", async () => { const bytes = await makeZip({ "huge.txt": "x".repeat(10_000) }, "STORE"); const result = await inspectZip(bytes, { maxEntries: 100, maxExpandedBytes: 1_000, maxCompressionRatio: 100 }); expect(result.accepted).toBe(false); expect(result.findings.map((f) => f.code)).toContain("EXPANDED_BYTES_LIMIT"); });
  it("accepts a benign archive and reports its manifest without extracting to disk", async () => { const bytes = await makeZip({ "data/report.csv": "a,b\n1,2", "notes.md": "# Notes" }); const result = await inspectZip(bytes, { maxEntries: 100, maxExpandedBytes: 1_000_000, maxCompressionRatio: 100 }); expect(result.accepted).toBe(true); expect(result.entries.map((e) => e.path)).toEqual(["data/report.csv", "notes.md"]); expect(result.totalExpandedBytes).toBeGreaterThan(0); });
});
