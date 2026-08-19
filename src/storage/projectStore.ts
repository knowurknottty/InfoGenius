import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { parseArtifactManifest, type ArtifactManifest } from "../domain/artifact";

interface ProjectSnapshotRecord {
  projectId: string;
  name: string;
  updatedAt: string;
  schemaVersion: "1.0.0";
  manifest: ArtifactManifest;
}

export interface ProjectSnapshotSummary {
  projectId: string;
  name: string;
  updatedAt: string;
  schemaVersion: "1.0.0";
}

interface EvidenceStudioDB extends DBSchema {
  projects: {
    key: string;
    value: ProjectSnapshotRecord;
    indexes: { "by-updated": string };
  };
}

const DB_NAME = "infogenius-evidence-studio";
const DB_VERSION = 1;
let dbPromise: Promise<IDBPDatabase<EvidenceStudioDB>> | undefined;

function database(): Promise<IDBPDatabase<EvidenceStudioDB>> {
  dbPromise ??= openDB<EvidenceStudioDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("projects")) {
        const store = db.createObjectStore("projects", { keyPath: "projectId" });
        store.createIndex("by-updated", "updatedAt");
      }
    }
  });
  return dbPromise;
}

export async function saveProjectSnapshot(input: ArtifactManifest): Promise<ProjectSnapshotSummary> {
  const manifest = parseArtifactManifest(input);
  const record: ProjectSnapshotRecord = {
    projectId: manifest.project.id,
    name: manifest.project.name,
    updatedAt: manifest.project.updatedAt,
    schemaVersion: manifest.schemaVersion,
    manifest
  };
  const db = await database();
  await db.put("projects", record);
  return { projectId: record.projectId, name: record.name, updatedAt: record.updatedAt, schemaVersion: record.schemaVersion };
}

export async function loadProjectSnapshot(projectId: string): Promise<ArtifactManifest | undefined> {
  const db = await database();
  const record = await db.get("projects", projectId);
  return record ? parseArtifactManifest(record.manifest) : undefined;
}

export async function listProjectSnapshots(): Promise<ProjectSnapshotSummary[]> {
  const db = await database();
  const records = await db.getAll("projects");
  return records
    .map(({ projectId, name, updatedAt, schemaVersion }) => ({ projectId, name, updatedAt, schemaVersion }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.projectId.localeCompare(b.projectId));
}

export async function deleteProjectSnapshot(projectId: string): Promise<void> {
  const db = await database();
  await db.delete("projects", projectId);
}

export async function clearProjectStore(): Promise<void> {
  const db = await database();
  await db.clear("projects");
}
