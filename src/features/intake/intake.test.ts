import { describe, expect, it } from "vitest";
import { ingestTextSource } from "./intake";

describe("source intake", () => {
  it("computes a cryptographic digest and creates a deterministic dataset from CSV", async () => {
    const result = await ingestTextSource({ name: "metrics.csv", mediaType: "text/csv", text: "suite,passed\nPython,1096\nMCP,259" });
    expect(result.source.digest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(result.dataset?.rowCount).toBe(2);
    expect(result.evidence.length).toBe(4);
    expect(result.duplicate).toBe(false);
  });

  it("detects duplicates by digest rather than filename", async () => {
    const first = await ingestTextSource({ name: "a.csv", mediaType: "text/csv", text: "x\n1" });
    const second = await ingestTextSource({ name: "different-name.csv", mediaType: "text/csv", text: "x\n1" }, new Set([first.source.digest]));
    expect(second.duplicate).toBe(true);
  });

  it("keeps a bounded preview while profiling the full supplied row set", async () => {
    const rows = Array.from({ length: 500 }, (_, i) => `${i},${i * 2}`).join("\n");
    const result = await ingestTextSource({ name: "large.csv", mediaType: "text/csv", text: `x,y\n${rows}` });
    expect(result.dataset?.rowCount).toBe(500);
    expect(result.previewRows).toHaveLength(200);
    expect(result.previewTruncated).toBe(true);
  });

  it("parses JSONL objects deterministically", async () => {
    const result = await ingestTextSource({ name: "events.jsonl", mediaType: "application/x-ndjson", text: '{"event":"a","value":1}\n{"event":"b","value":2}' });
    expect(result.dataset?.rowCount).toBe(2);
    expect(result.dataset?.rows?.[1]).toEqual({ event: "b", value: 2 });
  });

  it("rejects executable/unsupported content instead of treating it as analyzable data", async () => {
    await expect(ingestTextSource({ name: "payload.exe", mediaType: "application/octet-stream", text: "MZ..." })).rejects.toThrow(/unsupported/i);
  });
});
