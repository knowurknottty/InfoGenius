import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("Evidence Studio shell", () => {
  it("opens the real CAPT brief as an inspectable six-stage project and exposes claim lineage", async () => {
    const user = userEvent.setup();
    render(<App />);
    for (const stage of ["Intake", "Profile", "Ask", "Compose", "Verify", "Export"]) expect(screen.getByRole("button", { name: stage })).toBeInTheDocument();
    expect(screen.getByText("CAPT Core — August 19 Evidence Brief")).toBeInTheDocument();
    expect(screen.getByText("Verified execution volume by suite")).toBeInTheDocument();
    expect(screen.getByText("1,096")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /CAPT Core has strong convergence evidence while release authority remains incomplete/i }));
    expect(screen.getByRole("heading", { name: "Evidence lineage" })).toBeInTheDocument();
    expect(screen.getByText(/PR #117 branch integration\/capt-core-terminal-convergence-r2/i)).toBeInTheDocument();
  });

  it("keeps artifact verification separate from the CAPT release gate", async () => {
    const user = userEvent.setup(); render(<App />);
    await user.click(screen.getByRole("button", { name: "Verify" }));
    expect(screen.getByText("Artifact verified")).toBeInTheDocument();
    expect(screen.getByText(/releaseAuthorized:false/i)).toBeInTheDocument();
    expect(screen.getByText(/NOT_VERIFIED 21/i)).toBeInTheDocument();
  });
});
