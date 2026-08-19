import Papa from "papaparse";
import type { EvidenceRecord } from "../domain/artifact";

export type TabularRow = Record<string, string | null>;
export interface ProfileWarning { code: "MIXED_UNITS" | "MIXED_TYPES" | "DUPLICATE_ROWS" | "NULL_HEAVY"; columnId?: string; message: string; }
export interface ColumnProfile { id: string; inferredType: "number" | "integer" | "boolean" | "date" | "string" | "unknown"; confidence: number; missingRate: number; uniqueCount: number; unitHints: string[]; min?: number; max?: number; quantiles?: { q25: number; q50: number; q75: number }; }
export interface TabularProfile { sourceId: string; rowCount: number; columnCount: number; duplicateRows: number; columns: ColumnProfile[]; warnings: ProfileWarning[]; }
export interface ParsedDelimited { fields: string[]; rows: TabularRow[]; evidence: EvidenceRecord[]; parserErrors: Array<{ row?: number; code: string; message: string }>; }
function tinyDigest(text: string): string { let h = 0x811c9dc5; for (let i = 0; i < text.length; i += 1) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); } return `fnv1a32:${(h >>> 0).toString(16).padStart(8, "0")}`; }
export function parseDelimited(text: string, sourceId: string, delimiter?: string): ParsedDelimited {
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, delimiter: delimiter ?? "", skipEmptyLines: "greedy", dynamicTyping: false, transformHeader: (header) => header.trim() });
  const fields = parsed.meta.fields ?? [];
  const rows: TabularRow[] = parsed.data.map((row) => { const normalized: TabularRow = {}; for (const field of fields) { const raw = row[field]; normalized[field] = raw === undefined || raw.trim() === "" ? null : raw.trim(); } return normalized; });
  const evidence: EvidenceRecord[] = [];
  rows.forEach((row, rowIndex) => fields.forEach((field, colIndex) => { const value = row[field]; if (value === null) return; evidence.push({ id: `ev-${sourceId}-r${rowIndex + 2}c${colIndex + 1}`, sourceId, locator: { kind: "cell", value: `R${rowIndex + 2}C${colIndex + 1}` }, contentDigest: tinyDigest(value), content: value, extraction: "parsed" }); }));
  return { fields, rows, evidence, parserErrors: parsed.errors.map((error) => ({ row: error.row, code: error.code, message: error.message })) };
}
function numericShape(value: string): { numeric: boolean; unit: string | null; number?: number } { const compact = value.replace(/,/g, "").trim(); if (/^[+-]?[$€£]\s*\d+(?:\.\d+)?$/.test(compact)) return { numeric: true, unit: "currency", number: Number(compact.replace(/[$€£\s]/g, "")) }; if (/^[+-]?\d+(?:\.\d+)?%$/.test(compact)) return { numeric: true, unit: "percent", number: Number(compact.slice(0, -1)) }; if (/^[+-]?\d+(?:\.\d+)?$/.test(compact)) return { numeric: true, unit: "raw_number", number: Number(compact) }; return { numeric: false, unit: null }; }
function quantile(sorted: number[], q: number): number { if (sorted.length === 0) return Number.NaN; const index = (sorted.length - 1) * q; const lo = Math.floor(index); const hi = Math.ceil(index); if (lo === hi) return sorted[lo]; return sorted[lo] + (sorted[hi] - sorted[lo]) * (index - lo); }
function profileColumn(id: string, rows: TabularRow[]): { profile: ColumnProfile; mixedType: boolean } {
  const values = rows.map((row) => row[id]).filter((v): v is string => v !== null && v !== undefined); const shapes = values.map(numericShape); const numericCount = shapes.filter((shape) => shape.numeric).length; const nonNumericCount = values.length - numericCount; const units = Array.from(new Set(shapes.map((shape) => shape.unit).filter((unit): unit is string => Boolean(unit)))); const numbers = shapes.flatMap((shape) => (shape.numeric && shape.number !== undefined ? [shape.number] : [])).sort((a, b) => a - b);
  let inferredType: ColumnProfile["inferredType"] = "string"; if (values.length === 0) inferredType = "unknown"; else if (numericCount === values.length) inferredType = numbers.every(Number.isInteger) ? "integer" : "number"; else if (values.every((v) => /^(true|false)$/i.test(v))) inferredType = "boolean"; else if (values.every((v) => !Number.isNaN(Date.parse(v)) && /[-/:T]/.test(v))) inferredType = "date";
  const confidence = values.length === 0 ? 0 : Math.max(numericCount, nonNumericCount) / values.length; const profile: ColumnProfile = { id, inferredType, confidence, missingRate: rows.length === 0 ? 0 : (rows.length - values.length) / rows.length, uniqueCount: new Set(values).size, unitHints: units };
  if (numbers.length > 0 && numericCount === values.length) { profile.min = numbers[0]; profile.max = numbers.at(-1); profile.quantiles = { q25: quantile(numbers, 0.25), q50: quantile(numbers, 0.5), q75: quantile(numbers, 0.75) }; }
  return { profile, mixedType: numericCount > 0 && nonNumericCount > 0 };
}
export function profileRows(rows: TabularRow[], fields: string[], sourceId: string): TabularProfile {
  const warnings: ProfileWarning[] = []; const columns = fields.map((field) => { const { profile, mixedType } = profileColumn(field, rows); if (profile.unitHints.length > 1) warnings.push({ code: "MIXED_UNITS", columnId: field, message: `${field} contains incompatible unit shapes: ${profile.unitHints.join(", ")}.` }); if (mixedType) warnings.push({ code: "MIXED_TYPES", columnId: field, message: `${field} mixes numeric and non-numeric values; values were preserved verbatim.` }); if (profile.missingRate >= 0.5 && rows.length > 0) warnings.push({ code: "NULL_HEAVY", columnId: field, message: `${field} is ${(profile.missingRate * 100).toFixed(0)}% missing.` }); return profile; });
  const signatures = rows.map((row) => JSON.stringify(fields.map((field) => row[field] ?? null))); const duplicateRows = signatures.length - new Set(signatures).size; if (duplicateRows > 0) warnings.push({ code: "DUPLICATE_ROWS", message: `${duplicateRows} duplicate row${duplicateRows === 1 ? "" : "s"} detected; none removed automatically.` });
  return { sourceId, rowCount: rows.length, columnCount: fields.length, duplicateRows, columns, warnings };
}
