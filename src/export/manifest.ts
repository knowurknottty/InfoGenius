import { parseArtifactManifest, type ArtifactManifest } from "../domain/artifact";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).sort().reduce<Record<string, unknown>>((out, key) => {
      const next = (value as Record<string, unknown>)[key];
      if (next !== undefined) out[key] = canonicalize(next);
      return out;
    }, {});
  }
  return value;
}

export function exportManifest(manifest: ArtifactManifest): string {
  const validated = parseArtifactManifest(manifest);
  return `${JSON.stringify(canonicalize(validated), null, 2)}\n`;
}

export function importManifest(text: string): ArtifactManifest {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch (error) { throw new Error(`ArtifactManifest JSON is invalid: ${error instanceof Error ? error.message : "parse failure"}`); }
  return parseArtifactManifest(parsed);
}
