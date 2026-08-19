import { useMemo, useState } from "react";
import { Database, FileCheck2, FlaskConical, LayoutDashboard, Search, Share2, ShieldCheck, UploadCloud } from "lucide-react";
import { CAPT_WEEKLY_BRIEF_MANIFEST } from "./demo/captWeeklyBrief";
import type { ArtifactManifest, ClaimRecord } from "./domain/artifact";
import { exportManifest } from "./export/manifest";
import { ingestTextSource } from "./features/intake/intake";
import { classifyAnalyticalJob } from "./analytics/classifyVisual";
import { verifyManifest } from "./verification/verifyManifest";
import { VisualRenderer } from "./visuals/VisualRenderer";
import "./styles.css";

type Stage = "Intake" | "Profile" | "Ask" | "Compose" | "Verify" | "Export";
const stages: Array<{ name: Stage; icon: typeof UploadCloud }> = [
  { name: "Intake", icon: UploadCloud }, { name: "Profile", icon: Database }, { name: "Ask", icon: Search }, { name: "Compose", icon: LayoutDashboard }, { name: "Verify", icon: ShieldCheck }, { name: "Export", icon: Share2 }
];

function StageNav({ stage, onChange }: { stage: Stage; onChange: (stage: Stage) => void }) {
  return <nav className="stage-nav" aria-label="Evidence Studio stages">{stages.map(({ name, icon: Icon }, index) => <button key={name} className={stage === name ? "stage-button active" : "stage-button"} aria-current={stage === name ? "step" : undefined} onClick={() => onChange(name)}><span className="stage-index">0{index + 1}</span><Icon size={15} aria-hidden="true" /><span>{name}</span></button>)}</nav>;
}

function SourceRail({ manifest }: { manifest: ArtifactManifest }) {
  return <aside className="source-rail" aria-label="Sources and datasets">
    <div className="rail-kicker">SOURCE FIELD</div>
    <h2>Evidence inventory</h2>
    <p className="rail-intro">Every datum remains addressable back to an imported source.</p>
    <section><div className="section-label">Sources · {manifest.sources.length}</div>{manifest.sources.map((source) => <div className="source-item" key={source.id}><FileCheck2 size={15} aria-hidden="true" /><div><strong>{source.name}</strong><small>{source.parseState} · {source.byteSize.toLocaleString()} bytes</small><code>{source.digest.slice(0, 30)}…</code></div></div>)}</section>
    <section><div className="section-label">Datasets · {manifest.datasets.length}</div>{manifest.datasets.map((dataset) => <div className="dataset-item" key={dataset.id}><strong>{dataset.name}</strong><small>{dataset.rowCount.toLocaleString()} rows · {dataset.columns.length} fields</small></div>)}</section>
  </aside>;
}

function EvidenceInspector({ claim, manifest }: { claim: ClaimRecord | null; manifest: ArtifactManifest }) {
  const evidence = claim ? manifest.evidence.filter((item) => claim.evidenceIds.includes(item.id)) : [];
  return <aside className="evidence-inspector" aria-label="Claim and evidence inspector">
    <div className="rail-kicker">CLAIM LEDGER</div>
    <h2>Evidence lineage</h2>
    {!claim ? <p className="empty-state">Select a claim on the canvas to inspect its source-level support.</p> : <>
      <div className="epistemic-row"><span className={`epistemic ${claim.epistemicStatus}`}>{claim.epistemicStatus}</span><span>{claim.claimType.replaceAll("_", " ")}</span></div>
      <p className="claim-inspector-text">{claim.text}</p>
      {claim.formula && <div className="formula"><span>Derivation</span><code>{claim.formula}</code></div>}
      {claim.caveats.length > 0 && <div className="caveats"><span>Caveats</span>{claim.caveats.map((caveat) => <p key={caveat}>{caveat}</p>)}</div>}
      <div className="section-label">Linked evidence · {evidence.length}</div>
      <div className="evidence-stack">{evidence.map((item) => <article key={item.id} className="evidence-record"><div><span>{item.locator.kind}</span><code>{item.locator.value}</code></div><p>{item.content}</p></article>)}</div>
    </>}
  </aside>;
}

function ComposeStage({ manifest, onClaim }: { manifest: ArtifactManifest; onClaim: (claim: ClaimRecord) => void }) {
  return <div className="compose-stage">
    <header className="project-heading"><div><div className="eyebrow">CANONICAL DEMO · CAPT CORE</div><h1>{manifest.project.name}</h1><p>Convergence strength and release authority are shown as separate propositions, from the same inspectable evidence graph.</p></div><div className="schema-stamp"><span>MANIFEST</span><strong>v{manifest.schemaVersion}</strong><small>{manifest.evidence.length} evidence records</small></div></header>
    <section className="claim-strip" aria-label="Key claims">{manifest.claims.map((claim) => <button key={claim.id} onClick={() => onClaim(claim)} className="claim-button"><span className={`claim-status ${claim.epistemicStatus}`}>{claim.epistemicStatus}</span><span>{claim.text}</span></button>)}</section>
    <div className="visual-grid">{manifest.visuals.map((visual) => { const dataset = manifest.datasets.find((item) => item.id === visual.datasetId)!; return <article className={visual.family === "table" ? "visual-card wide" : "visual-card"} key={visual.id}><header><div><div className="visual-job">{visual.analyticalJob.replaceAll("_", " ")}</div><h2>{visual.title}</h2></div><span className="family-tag">{visual.family}</span></header><VisualRenderer spec={visual} dataset={dataset} />{visual.annotations.map((annotation) => <p className="annotation" key={annotation.text}>{annotation.text}</p>)}</article>; })}</div>
  </div>;
}

function ProfileStage({ manifest }: { manifest: ArtifactManifest }) {
  return <div className="stage-document"><header><div className="eyebrow">PROFILE</div><h1>Shape before story.</h1><p>Schema, missingness, storage strategy, and quality findings are visible before a chart is chosen.</p></header>{manifest.datasets.map((dataset) => <section className="profile-block" key={dataset.id}><div className="profile-title"><h2>{dataset.name}</h2><span>{dataset.rowCount.toLocaleString()} × {dataset.columns.length}</span></div><div className="column-grid">{dataset.columns.map((column) => <div key={column.id}><strong>{column.label}</strong><span>{column.type}{column.unit ? ` · ${column.unit}` : ""}</span><small>missing {Math.round((dataset.missingness[column.id] ?? 0) * 100)}%</small></div>)}</div>{(dataset.qualityFindings?.length ?? 0) === 0 ? <p className="quality-clear">No deterministic quality findings recorded for this dataset.</p> : dataset.qualityFindings?.map((finding) => <p className={`quality-finding ${finding.severity}`} key={`${finding.code}-${finding.columnId}`}>{finding.code}: {finding.message}</p>)}</section>)}</div>;
}

function AskStage({ manifest }: { manifest: ArtifactManifest }) {
  const [question, setQuestion] = useState("Rank the verification suites by passing test count");
  const dataset = manifest.datasets[0];
  const decision = useMemo(() => classifyAnalyticalJob({ columns: dataset.columns.map((column) => ({ id: column.id, type: column.type, uniqueCount: new Set((dataset.rows ?? []).map((row) => row[column.id])).size })), question }), [dataset, question]);
  return <div className="stage-document ask-stage"><header><div className="eyebrow">ASK / DISCOVER</div><h1>Interrogate the evidence, not a painted answer.</h1><p>The local classifier chooses an analytical job from data shape + question intent and explains its decision.</p></header><label className="question-box"><span>Question</span><textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows={3} /></label><div className="decision-panel"><span className="section-label">Recommended analytical job</span><strong>{decision.job.replaceAll("_", " ")}</strong><div className="family-list">{decision.preferredFamilies.map((family) => <span key={family}>{family}</span>)}</div>{decision.reasons.map((reason) => <p key={reason}>{reason}</p>)}</div></div>;
}

function VerifyStage({ manifest }: { manifest: ArtifactManifest }) {
  const report = verifyManifest(manifest, "2026-08-19T22:00:00Z");
  const security = manifest.datasets.find((dataset) => dataset.id === "ds-security-closure")!;
  const byStatus = Object.fromEntries((security.rows ?? []).map((row) => [String(row.status), Number(row.controls)]));
  const releaseClaim = manifest.claims.find((claim) => claim.id === "claim-release-authorization")!;
  return <div className="stage-document verify-stage"><header><div className="eyebrow">VERIFY</div><h1>{report.state === "verified" ? "Artifact verified" : report.state === "warnings" ? "Artifact has warnings" : "Artifact blocked"}</h1><p>Verification recomputes lineage and deterministic guards. It does not inherit the release state of the system being described.</p></header><div className="verification-grid"><section className="verification-card"><ShieldCheck aria-hidden="true" /><span>ARTIFACT INTEGRITY</span><strong>{report.state.toUpperCase()}</strong><p>{report.evidenceCoverage.claimsWithEvidence}/{report.evidenceCoverage.publishableClaims} publishable claims evidenced · {report.evidenceCoverage.visualsWithEvidence}/{report.evidenceCoverage.totalVisuals} visuals evidenced</p></section><section className="verification-card subject"><FlaskConical aria-hidden="true" /><span>SUBJECT RELEASE STATE</span><strong>releaseAuthorized:false</strong><p>NOT_VERIFIED {byStatus.NOT_VERIFIED} · N/A {byStatus["N/A"]} · FAIL {byStatus.FAIL} · PASS {byStatus.PASS}</p></section></div><blockquote>{releaseClaim.text}</blockquote>{report.findings.length === 0 ? <p className="quality-clear">No deterministic publication blockers in this Evidence Studio artifact.</p> : <div>{report.findings.map((finding) => <p key={finding.id} className={`quality-finding ${finding.severity}`}>{finding.code}: {finding.message}</p>)}</div>}<p className="verification-note"><strong>Critical distinction:</strong> this means the Evidence Studio representation is internally evidenced and structurally valid. It does not upgrade CAPT's own release authorization.</p></div>;
}

function IntakeStage({ manifest, onImport }: { manifest: ArtifactManifest; onImport: (result: Awaited<ReturnType<typeof ingestTextSource>>) => void }) {
  const [state, setState] = useState("Drop CSV, TSV, JSON, JSONL, TXT, or Markdown. Uploaded content is data, never instruction authority.");
  const digests = new Set(manifest.sources.map((source) => source.digest));
  async function files(list: FileList | null) {
    if (!list?.length) return;
    for (const file of Array.from(list)) {
      try {
        const result = await ingestTextSource({ name: file.name, mediaType: file.type || "text/plain", text: await file.text() }, digests);
        onImport(result);
        setState(result.duplicate ? `${file.name}: duplicate content digest detected; source was not silently merged.` : `${file.name}: parsed ${result.dataset?.rowCount ?? result.evidence.length} addressable record(s).`);
      } catch (error) { setState(error instanceof Error ? error.message : "Source ingestion failed."); }
    }
  }
  return <div className="stage-document"><header><div className="eyebrow">INTAKE</div><h1>Bring evidence. Keep authority.</h1><p>Content is fingerprinted and parsed deterministically before it is allowed into the claim graph.</p></header><label className="drop-zone"><UploadCloud size={30} aria-hidden="true" /><strong>Drop source files here</strong><span>or choose files from this device</span><input type="file" multiple accept=".csv,.tsv,.json,.jsonl,.ndjson,.txt,.md,text/csv,text/tab-separated-values,application/json,text/plain" onChange={(event) => void files(event.currentTarget.files)} /></label><p className="intake-state" role="status">{state}</p><div className="intake-policies"><div><strong>Fingerprint</strong><span>SHA-256 dedupe</span></div><div><strong>Parse</strong><span>verbatim + typed</span></div><div><strong>Authority</strong><span>uploaded instructions ignored</span></div></div></div>;
}

function ExportStage({ manifest }: { manifest: ArtifactManifest }) {
  function downloadManifest() {
    const blob = new Blob([exportManifest(manifest)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = href; anchor.download = "infogenius-artifact-manifest.json"; anchor.click(); URL.revokeObjectURL(href);
  }
  return <div className="stage-document"><header><div className="eyebrow">EXPORT</div><h1>Ship the picture with its proof.</h1><p>The reproducible artifact is the manifest + evidence graph + deterministic visual specification—not a screenshot alone.</p></header><div className="export-actions"><button className="primary-action" onClick={downloadManifest}>Download ArtifactManifest</button><button className="secondary-action" onClick={() => window.print()}>Print / save PDF</button></div><section className="methodology"><h2>Methodology package</h2><dl><div><dt>Schema</dt><dd>{manifest.schemaVersion}</dd></div><div><dt>Sources</dt><dd>{manifest.sources.length}</dd></div><div><dt>Evidence records</dt><dd>{manifest.evidence.length}</dd></div><div><dt>Claims</dt><dd>{manifest.claims.length}</dd></div><div><dt>VisualSpecs</dt><dd>{manifest.visuals.length}</dd></div></dl></section></div>;
}

export default function App() {
  const [stage, setStage] = useState<Stage>("Compose");
  const [manifest, setManifest] = useState<ArtifactManifest>(CAPT_WEEKLY_BRIEF_MANIFEST);
  const [claim, setClaim] = useState<ClaimRecord | null>(null);
  function importResult(result: Awaited<ReturnType<typeof ingestTextSource>>) {
    if (result.duplicate) return;
    setManifest((current) => ({ ...current, project: { ...current.project, updatedAt: new Date().toISOString() }, sources: [...current.sources, result.source], evidence: [...current.evidence, ...result.evidence], datasets: result.dataset ? [...current.datasets, result.dataset] : current.datasets, auditEvents: [...current.auditEvents, { id: `audit-import-${result.source.id}`, operation: "source_ingest", timestamp: new Date().toISOString(), actor: "deterministic_tool", toolOrModel: "InfoGenius browser ingest" }] }));
  }
  return <div className="app-shell"><header className="app-header"><a href="#main" className="skip-link">Skip to evidence canvas</a><div className="brand"><span className="brand-mark">IG</span><div><strong>InfoGenius</strong><small>Evidence Studio</small></div></div><StageNav stage={stage} onChange={setStage} /><div className="header-state"><span className="state-dot" /> deterministic core</div></header><div className="workspace"><SourceRail manifest={manifest} /><main id="main" className="main-canvas" tabIndex={-1}>{stage === "Compose" && <ComposeStage manifest={manifest} onClaim={setClaim} />}{stage === "Profile" && <ProfileStage manifest={manifest} />}{stage === "Ask" && <AskStage manifest={manifest} />}{stage === "Verify" && <VerifyStage manifest={manifest} />}{stage === "Intake" && <IntakeStage manifest={manifest} onImport={importResult} />}{stage === "Export" && <ExportStage manifest={manifest} />}</main><EvidenceInspector claim={claim} manifest={manifest} /></div></div>;
}
