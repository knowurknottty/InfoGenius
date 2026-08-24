import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { DatasetRecord, VisualSpec } from "../domain/artifact";
import { CAPT_WEEKLY_BRIEF_MANIFEST } from "../demo/captWeeklyBrief";
import { VisualRenderer } from "./VisualRenderer";

function renderVisual(id: string) {
  const spec = CAPT_WEEKLY_BRIEF_MANIFEST.visuals.find((visual) => visual.id === id)!;
  const dataset = CAPT_WEEKLY_BRIEF_MANIFEST.datasets.find((candidate) => candidate.id === spec.datasetId)!;
  return render(<VisualRenderer spec={spec} dataset={dataset} />);
}

describe("deterministic visual renderer", () => {
  it("renders bar geometry and direct labels from dataset values", () => {
    const { container } = renderVisual("visual-tests");
    expect(screen.getByRole("img", { name: /Python shows 1,096 passing tests/i })).toBeInTheDocument();
    expect(screen.getByText("1,096")).toBeInTheDocument();
    const python = container.querySelector('[data-mark="bar"][data-value="1096"]');
    const mcp = container.querySelector('[data-mark="bar"][data-value="259"]');
    expect(Number(python?.getAttribute("width"))).toBeGreaterThan(Number(mcp?.getAttribute("width")));
  });

  it("renders zero and unresolved security states instead of hiding zero values", () => {
    renderVisual("visual-security");
    expect(screen.getByText("NOT_VERIFIED")).toBeInTheDocument();
    expect(screen.getByText("21")).toBeInTheDocument();
    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(2);
  });

  it("renders exact table values for lookup visuals", () => {
    renderVisual("visual-lineage");
    expect(screen.getByText("5c0bdf02a3eb6d20cb4c33b0ad3ec517a0d11689")).toBeInTheDocument();
    expect(screen.getByText("terminal convergence")).toBeInTheDocument();
  });

  it("bounds table DOM even when the logical dataset represents one million rows", () => {
    const rows = Array.from({ length: 1000 }, (_, i) => ({ id: i + 1, value: i * 2 }));
    const dataset: DatasetRecord = {
      id: "million", name: "Million-row stress fixture", sourceIds: ["fixture"],
      columns: [{ id: "id", label: "ID", type: "integer" }, { id: "value", label: "Value", type: "integer" }],
      rows, rowCount: 1_000_000, representedRowCount: 1000, missingness: { id: 0, value: 0 }, storage: { strategy: "external_ref", reference: "fixture://million" }
    };
    const spec: VisualSpec = {
      id: "million-table", title: "Bounded table", family: "table", analyticalJob: "table_lookup", datasetId: "million", claimIds: [], evidenceIds: [], encodings: { columns: "id,value" }, annotations: [], filters: {}, accessibleSummary: "A bounded preview of a one-million-row logical dataset."
    };
    const { container } = render(<VisualRenderer spec={spec} dataset={dataset} />);
    expect(container.querySelectorAll("tbody tr")).toHaveLength(200);
    expect(screen.getByText("Showing 200 of 1,000,000 rows.")).toBeInTheDocument();
  });

  it("blocks unsupported semantic families instead of silently rendering them as a table", () => {
    const dataset = CAPT_WEEKLY_BRIEF_MANIFEST.datasets[0];
    const spec: VisualSpec = {
      id: "network-unsupported", title: "Dependency graph", family: "network", analyticalJob: "hierarchy_network", datasetId: dataset.id, claimIds: [], evidenceIds: [], encodings: {}, annotations: [], filters: {}, accessibleSummary: "Dependency graph is not available in this renderer."
    };
    render(<VisualRenderer spec={spec} dataset={dataset} />);
    expect(screen.getByRole("note")).toHaveTextContent(/network.*not available.*rendering blocked/i);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
