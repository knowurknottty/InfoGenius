import { describe, expect, it } from "vitest";
import { parseDelimited, profileRows } from "./tabular";

describe("deterministic tabular ingestion", () => {
  it("profiles nulls, duplicates, mixed units and mixed types without silently coercing them away", () => {
    const text = ["region,revenue,rate,count", "A,$10,10%,5", "A,$12,,5", "B,14,12%,7", "B,$12,oops,9", "B,$12,oops,9"].join("\n");
    const parsed = parseDelimited(text, "src-dirty"); const profile = profileRows(parsed.rows, parsed.fields, "src-dirty");
    expect(profile.rowCount).toBe(5); expect(profile.duplicateRows).toBe(1); expect(profile.columns.find((c) => c.id === "rate")?.missingRate).toBeCloseTo(0.2); expect(profile.columns.find((c) => c.id === "revenue")?.unitHints).toEqual(expect.arrayContaining(["currency", "raw_number"])); expect(profile.columns.find((c) => c.id === "rate")?.inferredType).toBe("string"); expect(profile.warnings.map((w) => w.code)).toEqual(expect.arrayContaining(["MIXED_UNITS", "MIXED_TYPES", "DUPLICATE_ROWS"])); expect(parsed.rows[2].revenue).toBe("14"); expect(parsed.rows[3].rate).toBe("oops");
  });
  it("creates exact row/cell evidence locators from source coordinates", () => { const parsed = parseDelimited("name,value\nalpha,10\nbeta,20", "src-small"); expect(parsed.evidence[1]).toMatchObject({ sourceId: "src-small", locator: { kind: "cell", value: "R2C2" }, content: "10" }); });
});
