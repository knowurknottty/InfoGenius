import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
});
