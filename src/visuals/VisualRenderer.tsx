import type { DatasetRecord, VisualSpec } from "../domain/artifact";

interface Props {
  spec: VisualSpec;
  dataset: DatasetRecord;
}

const format = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const supportedFamilies = new Set<VisualSpec["family"]>(["bar", "dot", "line", "area", "scatter", "histogram", "status", "table"]);

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value)) ? Number(value) : null;
}

function label(value: unknown): string {
  if (typeof value === "number") return format.format(value);
  if (value === null || value === undefined) return "—";
  return String(value);
}

function TableVisual({ spec, dataset }: Props) {
  const requested = (spec.encodings.columns ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  const columns = requested.length > 0 ? requested : dataset.columns.map((column) => column.id);
  const rows = dataset.rows ?? [];
  return (
    <div className="table-wrap" role="region" aria-label={spec.accessibleSummary} tabIndex={0}>
      <table className="evidence-table">
        <thead><tr>{columns.map((column) => <th key={column} scope="col">{dataset.columns.find((item) => item.id === column)?.label ?? column}</th>)}</tr></thead>
        <tbody>{rows.slice(0, 200).map((row, index) => <tr key={index}>{columns.map((column) => <td key={column}>{label(row[column])}</td>)}</tr>)}</tbody>
      </table>
      {dataset.rowCount > 200 && <p className="table-note">Showing 200 of {format.format(dataset.rowCount)} rows.</p>}
    </div>
  );
}

function BarVisual({ spec, dataset }: Props) {
  const categoryKey = spec.encodings.x ?? spec.encodings.category ?? dataset.columns[0]?.id;
  const valueKey = spec.encodings.y ?? spec.encodings.value ?? dataset.columns.find((column) => column.type === "number" || column.type === "integer")?.id;
  const rows = (dataset.rows ?? []).map((row) => ({ category: label(row[categoryKey]), value: number(row[valueKey]) ?? 0 }));
  const max = Math.max(1, ...rows.map((row) => Math.abs(row.value)));
  const width = 720;
  const left = 160;
  const chartWidth = 430;
  const rowHeight = 58;
  const height = Math.max(140, rows.length * rowHeight + 42);
  return (
    <svg className="chart-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={spec.accessibleSummary}>
      <title>{spec.title}</title>
      {rows.map((row, index) => {
        const y = 26 + index * rowHeight;
        const markWidth = Math.max(row.value === 0 ? 2 : 0, Math.abs(row.value) / max * chartWidth);
        return <g key={`${row.category}-${index}`}>
          <text x={0} y={y + 20} className="chart-category">{row.category}</text>
          <rect x={left} y={y} width={markWidth} height={28} rx={2} data-mark="bar" data-value={String(row.value)} className="chart-bar" />
          <text x={left + markWidth + 10} y={y + 20} className="chart-value">{format.format(row.value)}</text>
        </g>;
      })}
    </svg>
  );
}

function StatusVisual({ spec, dataset }: Props) {
  const categoryKey = spec.encodings.category ?? dataset.columns[0]?.id;
  const valueKey = spec.encodings.value ?? dataset.columns[1]?.id;
  return (
    <div className="status-grid" role="img" aria-label={spec.accessibleSummary}>
      {(dataset.rows ?? []).map((row, index) => {
        const status = label(row[categoryKey]);
        const value = number(row[valueKey]) ?? 0;
        return <div className="status-cell" data-status={status} key={`${status}-${index}`}>
          <span className="status-value">{format.format(value)}</span>
          <span className="status-name">{status}</span>
        </div>;
      })}
    </div>
  );
}

function ScatterVisual({ spec, dataset }: Props) {
  const xKey = spec.encodings.x ?? dataset.columns.find((column) => column.type === "number" || column.type === "integer")?.id;
  const yKey = spec.encodings.y ?? dataset.columns.filter((column) => column.type === "number" || column.type === "integer")[1]?.id;
  const points = (dataset.rows ?? []).flatMap((row) => {
    const x = number(row[xKey]); const y = number(row[yKey]);
    return x === null || y === null ? [] : [{ x, y }];
  });
  const maxX = Math.max(1, ...points.map((point) => Math.abs(point.x)));
  const maxY = Math.max(1, ...points.map((point) => Math.abs(point.y)));
  return <svg className="chart-svg" viewBox="0 0 720 360" role="img" aria-label={spec.accessibleSummary}><title>{spec.title}</title>{points.map((point, index) => <circle key={index} cx={50 + point.x / maxX * 620} cy={320 - point.y / maxY * 270} r={6} data-mark="point" />)}</svg>;
}

function LineVisual({ spec, dataset }: Props) {
  const xKey = spec.encodings.x ?? dataset.columns[0]?.id;
  const yKey = spec.encodings.y ?? dataset.columns.find((column) => column.type === "number" || column.type === "integer")?.id;
  const rows = (dataset.rows ?? []).flatMap((row, index) => {
    const value = number(row[yKey]); return value === null ? [] : [{ x: index, value, label: label(row[xKey]) }];
  });
  const max = Math.max(1, ...rows.map((row) => Math.abs(row.value)));
  const step = rows.length <= 1 ? 0 : 620 / (rows.length - 1);
  const points = rows.map((row) => `${50 + row.x * step},${310 - row.value / max * 250}`).join(" ");
  return <svg className="chart-svg" viewBox="0 0 720 360" role="img" aria-label={spec.accessibleSummary}><title>{spec.title}</title><polyline points={points} fill="none" className="chart-line" />{rows.map((row) => <g key={row.x}><circle cx={50 + row.x * step} cy={310 - row.value / max * 250} r={5} /><text x={50 + row.x * step} y={340} textAnchor="middle" className="chart-axis-label">{row.label}</text></g>)}</svg>;
}

function UnsupportedVisual({ spec }: Pick<Props, "spec">) {
  return (
    <div className="visual-blocked" role="note" aria-label={`${spec.family} visual rendering blocked`}>
      <strong>{spec.family} visual family is not available in this deterministic renderer.</strong>
      <span>Semantic fallback could change the analytical meaning, so rendering blocked.</span>
    </div>
  );
}

export function VisualRenderer(props: Props) {
  if (!supportedFamilies.has(props.spec.family)) return <UnsupportedVisual spec={props.spec} />;
  if (props.spec.family === "table") return <TableVisual {...props} />;
  if (props.spec.family === "status") return <StatusVisual {...props} />;
  if (props.spec.family === "bar" || props.spec.family === "dot" || props.spec.family === "histogram") return <BarVisual {...props} />;
  if (props.spec.family === "scatter") return <ScatterVisual {...props} />;
  return <LineVisual {...props} />;
}
