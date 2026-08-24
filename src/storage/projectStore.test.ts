import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { CAPT_WEEKLY_BRIEF_MANIFEST } from "../demo/captWeeklyBrief";
import { clearProjectStore, listProjectSnapshots, loadProjectSnapshot, saveProjectSnapshot } from "./projectStore";

describe("IndexedDB project snapshots", () => {
  beforeEach(async () => { await clearProjectStore(); });

  it("persists and restores a validated ArtifactManifest without lineage drift", async () => {
    await saveProjectSnapshot(CAPT_WEEKLY_BRIEF_MANIFEST);
    const restored = await loadProjectSnapshot(CAPT_WEEKLY_BRIEF_MANIFEST.project.id);
    expect(restored?.project.id).toBe(CAPT_WEEKLY_BRIEF_MANIFEST.project.id);
    expect(restored?.claims.find((claim) => claim.id === "claim-runtime-identity-gap")?.evidenceIds).toEqual(["ev-installed", "ev-runtime", "ev-pr118"]);
  });

  it("lists stable project metadata without loading every manifest into the caller", async () => {
    await saveProjectSnapshot(CAPT_WEEKLY_BRIEF_MANIFEST);
    const snapshots = await listProjectSnapshots();
    expect(snapshots).toEqual([{ projectId: "project-capt-weekly-2026-08-19", name: "CAPT Core — August 19 Evidence Brief", updatedAt: "2026-08-19T16:29:00-05:00", schemaVersion: "1.0.0" }]);
  });
});
