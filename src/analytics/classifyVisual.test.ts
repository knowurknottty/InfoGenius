import { describe, expect, it } from "vitest";
import { classifyAnalyticalJob } from "./classifyVisual";

const column = (id: string, type: "string" | "number" | "date", uniqueCount: number) => ({ id, type, uniqueCount });

describe("analytical-job classifier", () => {
  it("selects a line family for change over time when temporal + quantitative fields exist", () => {
    const result = classifyAnalyticalJob({ columns: [column("date", "date", 12), column("confidence", "number", 12)], question: "How did release confidence change over time?" });
    expect(result.job).toBe("change_over_time");
    expect(result.preferredFamilies).toContain("line");
    expect(result.reasons.join(" ")).toMatch(/temporal/i);
  });

  it("selects bar/dot for categorical ranking", () => {
    const result = classifyAnalyticalJob({ columns: [column("suite", "string", 3), column("passed", "number", 3)], question: "Rank the suites by passed tests" });
    expect(result.job).toBe("ranking");
    expect(result.preferredFamilies).toEqual(expect.arrayContaining(["bar", "dot"]));
  });

  it("selects scatter for a relationship between two quantitative variables", () => {
    const result = classifyAnalyticalJob({ columns: [column("coverage", "number", 40), column("failures", "number", 35)], question: "Is coverage related to failures?" });
    expect(result.job).toBe("relationship");
    expect(result.preferredFamilies[0]).toBe("scatter");
  });

  it("falls back to a table for exact lookup rather than inventing chart semantics", () => {
    const result = classifyAnalyticalJob({ columns: [column("sha", "string", 20), column("note", "string", 20)], question: "Show the exact SHA and note" });
    expect(result.job).toBe("table_lookup");
    expect(result.preferredFamilies).toEqual(["table"]);
  });
});
