import type { VisualSpec } from "../domain/artifact";

export interface AnalyticalColumn { id: string; type: "string" | "number" | "integer" | "boolean" | "date" | "datetime" | "category" | "unknown"; uniqueCount: number; }
export interface AnalyticalShape { columns: AnalyticalColumn[]; question?: string; }
export interface AnalyticalDecision { job: VisualSpec["analyticalJob"]; preferredFamilies: VisualSpec["family"][]; reasons: string[]; }

const hasWords = (text: string, pattern: RegExp) => pattern.test(text.toLowerCase());

export function classifyAnalyticalJob(input: AnalyticalShape): AnalyticalDecision {
  const question = input.question ?? "";
  const quantitative = input.columns.filter((c) => c.type === "number" || c.type === "integer");
  const temporal = input.columns.filter((c) => c.type === "date" || c.type === "datetime" || /(^|_)(date|time|year|month|day)($|_)/i.test(c.id));
  const categorical = input.columns.filter((c) => c.type === "string" || c.type === "category");

  if (hasWords(question, /\b(exact|lookup|show the exact|list rows?|table)\b/) && quantitative.length === 0) {
    return { job: "table_lookup", preferredFamilies: ["table"], reasons: ["The request asks for exact textual lookup and has no quantitative field that benefits from chart encoding."] };
  }
  if (quantitative.length >= 2 && hasWords(question, /\b(relationship|related|correlat|association|versus|vs\.?|effect)\b/)) {
    return { job: "relationship", preferredFamilies: ["scatter"], reasons: ["Two quantitative variables plus relationship language support a positional comparison on x/y axes."] };
  }
  if (temporal.length >= 1 && quantitative.length >= 1) {
    return { job: "change_over_time", preferredFamilies: ["line", "area"], reasons: [`Temporal field ${temporal[0].id} and quantitative field ${quantitative[0].id} establish an ordered time series.`] };
  }
  if (categorical.length >= 1 && quantitative.length >= 1 && hasWords(question, /\b(rank|top|bottom|highest|lowest|largest|smallest|most|least)\b/)) {
    return { job: "ranking", preferredFamilies: ["bar", "dot"], reasons: ["A categorical dimension, quantitative measure, and ranking intent favor aligned lengths or positions."] };
  }
  if (quantitative.length >= 1 && hasWords(question, /\b(distribution|spread|histogram|frequency|range|outliers?)\b/)) {
    return { job: "distribution", preferredFamilies: ["histogram", "dot"], reasons: ["Distribution language over a quantitative field requires showing shape rather than only an aggregate."] };
  }
  if (categorical.length >= 1 && quantitative.length >= 1 && hasWords(question, /\b(share|composition|part of|portion|percent of total)\b/)) {
    return { job: "composition", preferredFamilies: ["bar", "area"], reasons: ["Part-to-whole intent is present; aligned bar lengths preserve quantitative readability."] };
  }
  if (categorical.length >= 1 && quantitative.length >= 1) {
    return { job: "comparison", preferredFamilies: ["bar", "dot"], reasons: ["A categorical dimension and quantitative measure support direct comparison."] };
  }
  if (quantitative.length >= 2) {
    return { job: "relationship", preferredFamilies: ["scatter"], reasons: ["Two quantitative fields support a relationship view; the decision remains inspectable rather than model-implied."] };
  }
  return { job: "table_lookup", preferredFamilies: ["table"], reasons: ["No chart family is more truthful than exact tabular lookup for the available shape."] };
}
