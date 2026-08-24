import { describe, expect, it } from "vitest";
import { verifyManifest } from "../verification/verifyManifest";
import { CAPT_WEEKLY_BRIEF_MANIFEST } from "./captWeeklyBrief";

describe("CAPT Weekly Brief canonical demo", () => {
  it("preserves the exact August 19 convergence metrics and release gate state", () => {
    const tests = CAPT_WEEKLY_BRIEF_MANIFEST.datasets.find((d) => d.id === "ds-test-evidence");
    const security = CAPT_WEEKLY_BRIEF_MANIFEST.datasets.find((d) => d.id === "ds-security-closure");
    expect(tests?.rows).toEqual(expect.arrayContaining([{ suite: "Python", passed: 1096, skipped: 13, deselected: 12, failed: 0 }, { suite: "Swift", passed: 63, skipped: 7, deselected: 0, failed: 0 }, { suite: "MCP", passed: 259, skipped: 0, deselected: 0, failed: 0 }]));
    expect(security?.rows).toEqual([{ status: "PASS", controls: 0 }, { status: "FAIL", controls: 0 }, { status: "NOT_VERIFIED", controls: 21 }, { status: "N/A", controls: 26 }]);
  });

  it("keeps source identity facts separate from the derived runtime mismatch conclusion", () => {
    const derived = CAPT_WEEKLY_BRIEF_MANIFEST.claims.find((c) => c.id === "claim-runtime-identity-gap");
    expect(derived?.epistemicStatus).toBe("derived");
    expect(derived?.formula).toMatch(/process_start.*install/i);
    expect(derived?.evidenceIds.length).toBeGreaterThanOrEqual(2);
  });

  it("is itself a fully evidenced artifact even though the CAPT release described by it is not authorized", () => {
    const report = verifyManifest(CAPT_WEEKLY_BRIEF_MANIFEST, "2026-08-19T22:00:00Z");
    expect(report.state).toBe("verified");
    const releaseClaim = CAPT_WEEKLY_BRIEF_MANIFEST.claims.find((c) => c.id === "claim-release-authorization");
    expect(releaseClaim?.text).toMatch(/releaseAuthorized.*false/i);
  });
});
