"use client";

import { useState } from "react";
import { BarChart3, LineChart, PieChart, Trash2, X } from "lucide-react";

/**
 * Diagramme für den Tabellen-Editor.
 * Datenmodell: ein rechteckiger Bereich (z. B. A1:C5) — erste Spalte = Beschriftungen,
 * weitere Spalten = Datenreihen. Ist die erste Zeile nicht numerisch, wird sie als
 * Reihen-Überschrift verwendet (wie in Excel).
 *
 * Farben: validierte kategoriale Palette (fixe Slot-Reihenfolge, CVD-geprüft).
 */

export type ChartType = "bar" | "line" | "pie";

export interface ChartDef {
  id: string;
  type: ChartType;
  title: string;
  range: string;
}

// Kategoriale Palette (Light-Werte — Diagramme liegen immer auf dem weißen Blatt)
const SERIES_COLORS = ["#2a78d6", "#1baf7a", "#eda100", "#008300", "#4a3aa7", "#e34948", "#e87ba4", "#eb6834"];
const TEXT_PRIMARY = "#0b0b0b";
const TEXT_SECONDARY = "#52514e";
const GRID_COLOR = "#e5e5e2";

export interface ChartData {
  labels: string[];
  series: { name: string; values: number[] }[];
}

/** Extrahiert Diagrammdaten aus einem Bereich. `getVal` liefert den ausgewerteten Zellwert. */
export function extractChartData(
  range: string,
  getVal: (row: number, col: number) => string,
): ChartData | null {
  const m = range.trim().toUpperCase().match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
  if (!m) return null;
  const colToIndex = (col: string) => {
    let idx = 0;
    for (const ch of col) idx = idx * 26 + (ch.charCodeAt(0) - 64);
    return idx - 1;
  };
  let r1 = parseInt(m[2]) - 1, c1 = colToIndex(m[1]);
  let r2 = parseInt(m[4]) - 1, c2 = colToIndex(m[3]);
  if (r2 < r1) [r1, r2] = [r2, r1];
  if (c2 < c1) [c1, c2] = [c2, c1];
  if (r2 - r1 > 500 || c2 - c1 > 20) return null;

  // Einspaltiger Bereich: Werte ohne Beschriftungen
  const valueCols = c2 > c1 ? Array.from({ length: c2 - c1 }, (_, i) => c1 + 1 + i) : [c1];
  const labelCol = c2 > c1 ? c1 : null;

  // Kopfzeile erkennen: erste Zeile in allen Wertespalten nicht numerisch?
  const firstRowNumeric = valueCols.every((c) => {
    const v = getVal(r1, c);
    return v !== "" && !isNaN(Number(v));
  });
  const dataStart = firstRowNumeric ? r1 : r1 + 1;

  const labels: string[] = [];
  for (let r = dataStart; r <= r2; r++) {
    labels.push(labelCol !== null ? getVal(r, labelCol) || `Zeile ${r + 1}` : `Zeile ${r + 1}`);
  }

  const series = valueCols.map((c, i) => {
    const headerName = !firstRowNumeric ? getVal(r1, c) : "";
    const values: number[] = [];
    for (let r = dataStart; r <= r2; r++) {
      const n = Number(getVal(r, c));
      values.push(isNaN(n) ? 0 : n);
    }
    return { name: headerName || `Reihe ${i + 1}`, values };
  });

  if (labels.length === 0 || series.length === 0) return null;
  return { labels, series };
}

// ── SVG-Renderer ────────────────────────────────────────────────────────────

const W = 360, H = 220, PAD = { top: 12, right: 12, bottom: 34, left: 42 };
const PW = W - PAD.left - PAD.right;
const PH = H - PAD.top - PAD.bottom;

function niceMax(n: number): number {
  if (n <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(n)));
  const f = n / pow;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow;
}

function YAxis({ max }: { max: number }) {
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  return (
    <>
      {ticks.map((t, i) => {
        const y = PAD.top + PH - (t / max) * PH;
        return (
          <g key={i}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke={GRID_COLOR} strokeWidth={1} />
            <text x={PAD.left - 6} y={y + 3} textAnchor="end" fontSize={9} fill={TEXT_SECONDARY}>
              {t.toLocaleString("de-DE", { maximumFractionDigits: 1 })}
            </text>
          </g>
        );
      })}
    </>
  );
}

function XLabels({ labels }: { labels: string[] }) {
  const step = PW / labels.length;
  const every = Math.ceil(labels.length / 8);
  return (
    <>
      {labels.map((l, i) =>
        i % every === 0 ? (
          <text key={i} x={PAD.left + step * (i + 0.5)} y={H - PAD.bottom + 14} textAnchor="middle" fontSize={9} fill={TEXT_SECONDARY}>
            {l.length > 9 ? l.slice(0, 8) + "…" : l}
          </text>
        ) : null
      )}
    </>
  );
}

function BarSvg({ data }: { data: ChartData }) {
  const max = niceMax(Math.max(...data.series.flatMap((s) => s.values), 0));
  const groupW = PW / data.labels.length;
  const barW = Math.max(3, Math.min(28, (groupW - 6) / data.series.length - 2));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
      <YAxis max={max} />
      {data.labels.map((label, li) =>
        data.series.map((s, si) => {
          const v = s.values[li] ?? 0;
          const h = Math.max(0, (v / max) * PH);
          const groupX = PAD.left + groupW * li + (groupW - (barW + 2) * data.series.length) / 2;
          const x = groupX + si * (barW + 2);
          const y = PAD.top + PH - h;
          return (
            <rect key={`${li}-${si}`} x={x} y={y} width={barW} height={h} rx={3} fill={SERIES_COLORS[si % SERIES_COLORS.length]}>
              <title>{`${label} · ${s.name}: ${v.toLocaleString("de-DE")}`}</title>
            </rect>
          );
        })
      )}
      <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + PH} y2={PAD.top + PH} stroke={TEXT_SECONDARY} strokeWidth={1} />
      <XLabels labels={data.labels} />
    </svg>
  );
}

function LineSvg({ data }: { data: ChartData }) {
  const max = niceMax(Math.max(...data.series.flatMap((s) => s.values), 0));
  const step = PW / data.labels.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
      <YAxis max={max} />
      {data.series.map((s, si) => {
        const pts = s.values.map((v, i) => `${PAD.left + step * (i + 0.5)},${PAD.top + PH - (v / max) * PH}`);
        return (
          <g key={si}>
            <polyline points={pts.join(" ")} fill="none" stroke={SERIES_COLORS[si % SERIES_COLORS.length]} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {s.values.map((v, i) => (
              <circle key={i} cx={PAD.left + step * (i + 0.5)} cy={PAD.top + PH - (v / max) * PH} r={3} fill={SERIES_COLORS[si % SERIES_COLORS.length]} stroke="#ffffff" strokeWidth={2}>
                <title>{`${data.labels[i]} · ${s.name}: ${v.toLocaleString("de-DE")}`}</title>
              </circle>
            ))}
          </g>
        );
      })}
      <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + PH} y2={PAD.top + PH} stroke={TEXT_SECONDARY} strokeWidth={1} />
      <XLabels labels={data.labels} />
    </svg>
  );
}

function PieSvg({ data }: { data: ChartData }) {
  // Kreisdiagramm: nur erste Reihe, max. 8 Segmente (Rest → "Sonstige")
  const values = data.series[0]?.values ?? [];
  let entries = data.labels.map((l, i) => ({ label: l, value: Math.max(0, values[i] ?? 0) }));
  if (entries.length > 8) {
    const rest = entries.slice(7).reduce((s, e) => s + e.value, 0);
    entries = [...entries.slice(0, 7), { label: "Sonstige", value: rest }];
  }
  const total = entries.reduce((s, e) => s + e.value, 0) || 1;
  const cx = 110, cy = H / 2, R = 78;
  let angle = -Math.PI / 2;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
      {entries.map((e, i) => {
        const frac = e.value / total;
        const a0 = angle, a1 = angle + frac * Math.PI * 2;
        angle = a1;
        const large = frac > 0.5 ? 1 : 0;
        const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0);
        const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
        const path = frac >= 0.999
          ? `M ${cx - R} ${cy} A ${R} ${R} 0 1 1 ${cx + R} ${cy} A ${R} ${R} 0 1 1 ${cx - R} ${cy}`
          : `M ${cx} ${cy} L ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} Z`;
        return (
          <path key={i} d={path} fill={SERIES_COLORS[i % SERIES_COLORS.length]} stroke="#ffffff" strokeWidth={2}>
            <title>{`${e.label}: ${e.value.toLocaleString("de-DE")} (${Math.round(frac * 100)} %)`}</title>
          </path>
        );
      })}
      {/* Legende rechts — Identität nie nur über Farbe */}
      {entries.map((e, i) => (
        <g key={`l-${i}`}>
          <rect x={215} y={26 + i * 20} width={9} height={9} rx={2} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />
          <text x={229} y={34 + i * 20} fontSize={9.5} fill={TEXT_PRIMARY}>
            {e.label.length > 14 ? e.label.slice(0, 13) + "…" : e.label} · {Math.round((e.value / total) * 100)} %
          </text>
        </g>
      ))}
    </svg>
  );
}

function Legend({ data }: { data: ChartData }) {
  if (data.series.length < 2) return null;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 px-1 pb-1">
      {data.series.map((s, i) => (
        <span key={i} className="flex items-center gap-1.5 text-[10px]" style={{ color: TEXT_SECONDARY }}>
          <span className="inline-block size-2 rounded-sm" style={{ backgroundColor: SERIES_COLORS[i % SERIES_COLORS.length] }} />
          {s.name}
        </span>
      ))}
    </div>
  );
}

export function ChartCard({
  chart, data, onDelete,
}: { chart: ChartDef; data: ChartData | null; onDelete: () => void }) {
  return (
    <div className="office-page w-90 shrink-0 rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
      <div className="flex items-center justify-between px-1 pb-1">
        <p className="truncate text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>
          {chart.title || chart.range}
        </p>
        <button type="button" onClick={onDelete} className="grid size-6 place-items-center rounded text-gray-400 hover:text-red-500" title="Diagramm löschen">
          <Trash2 className="size-3" />
        </button>
      </div>
      {data ? (
        <>
          {chart.type === "bar" && <BarSvg data={data} />}
          {chart.type === "line" && <LineSvg data={data} />}
          {chart.type === "pie" && <PieSvg data={data} />}
          {chart.type !== "pie" && <Legend data={data} />}
        </>
      ) : (
        <p className="px-1 py-8 text-center text-[11px] text-gray-400">
          Ungültiger Bereich „{chart.range}" — Format: A1:C5
        </p>
      )}
    </div>
  );
}

// ── Dialog zum Erstellen ────────────────────────────────────────────────────

const TYPES: { value: ChartType; label: string; Icon: typeof BarChart3 }[] = [
  { value: "bar", label: "Balken", Icon: BarChart3 },
  { value: "line", label: "Linie", Icon: LineChart },
  { value: "pie", label: "Kreis", Icon: PieChart },
];

export function ChartDialog({
  initialRange, onInsert, onClose,
}: { initialRange: string; onInsert: (c: Omit<ChartDef, "id">) => void; onClose: () => void }) {
  const [type, setType] = useState<ChartType>("bar");
  const [range, setRange] = useState(initialRange);
  const [title, setTitle] = useState("");
  return (
    <div className="fixed inset-0 z-100 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800">Diagramm einfügen</h3>
          <button type="button" onClick={onClose} className="grid size-7 place-items-center rounded text-gray-400 hover:text-gray-700"><X className="size-4" /></button>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {TYPES.map((t) => (
            <button key={t.value} type="button" onClick={() => setType(t.value)}
              className={`flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-3 text-[11px] font-semibold transition-colors ${type === t.value ? "border-brand bg-brand/8 text-brand" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
              <t.Icon className="size-5" strokeWidth={1.75} />
              {t.label}
            </button>
          ))}
        </div>
        <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">Datenbereich</label>
        <input value={range} onChange={(e) => setRange(e.target.value)} placeholder="z. B. A1:C5"
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm text-gray-800 focus:border-brand focus:outline-none" />
        <p className="mt-1 text-[10px] text-gray-400">Erste Spalte = Beschriftungen, weitere Spalten = Datenreihen. Erste Zeile kann Überschriften enthalten.</p>
        <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">Titel (optional)</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Diagrammtitel"
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-brand focus:outline-none" />
        <button
          type="button"
          onClick={() => { if (/^[A-Za-z]+\d+:[A-Za-z]+\d+$/.test(range.trim())) { onInsert({ type, range: range.trim().toUpperCase(), title: title.trim() }); onClose(); } }}
          className="mt-5 w-full rounded-xl bg-brand py-2.5 text-sm font-bold text-white transition-all hover:brightness-105 active:scale-[0.98]"
        >
          Einfügen
        </button>
      </div>
    </div>
  );
}
