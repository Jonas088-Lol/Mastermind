/* Copyright 2026 Elian Schock, Jonas Schwenk */
// Kompetenz-Heatmap — Zellenfarbe anhand der Durchschnittsnote zum Thema
// (1 = hellgrün … 6 = rot), Stil wie die Heatmap auf der Startseite.

export function gradeColor(value: number): string {
  if (value <= 1.5) return "#86efac"; // hellgrün
  if (value <= 2.5) return "#bef264";
  if (value <= 3.5) return "#fde047";
  if (value <= 4.5) return "#fdba74";
  if (value <= 5.5) return "#f87171";
  return "#ef4444"; // rot
}

export type HeatmapRow = {
  label: string;
  cells: (number | null)[]; // Ø-Note pro Thema, null = keine Note
};

export function CompetenceHeatmap({ topics, rows, rowHeader = "Schüler" }: {
  topics: string[];
  rows: HeatmapRow[];
  rowHeader?: string;
}) {
  if (topics.length === 0 || rows.length === 0) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-fg">
        Noch keine Noten mit Thema eingetragen — trage Noten mit Thema ein, um die Heatmap zu füllen.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-4">
      {/* Scrollt horizontal auf Mobile */}
      <div className="overflow-x-auto">
        <table className="w-full border-separate" style={{ borderSpacing: "6px 6px" }}>
          <thead>
            <tr>
              <th className="min-w-28 text-left text-[11px] font-bold uppercase tracking-wider text-muted-fg">
                {rowHeader}
              </th>
              {topics.map((t) => (
                <th key={t} className="min-w-16 max-w-28 truncate px-1 text-center text-[11px] font-semibold text-muted-fg" title={t}>
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="whitespace-nowrap pr-2 text-xs font-semibold">{row.label}</td>
                {row.cells.map((v, i) => (
                  <td key={i}>
                    <div
                      className="grid h-8 w-full min-w-14 place-items-center rounded-md font-mono text-[11px] font-bold"
                      style={
                        v === null
                          ? { backgroundColor: "hsl(var(--muted) / 0.3)", color: "hsl(var(--muted-fg))" }
                          : { backgroundColor: gradeColor(v), color: "#1a2e1a" }
                      }
                      title={v === null ? "Keine Note" : `Ø ${v.toFixed(1).replace(".", ",")} — ${topics[i]}`}
                    >
                      {v === null ? "—" : v.toFixed(1).replace(".", ",")}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Legende */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-muted-fg">
        <span className="flex items-center gap-1"><span className="inline-block size-2.5 rounded-sm" style={{ backgroundColor: "#86efac" }} /> Sicher (Note 1–2)</span>
        <span className="flex items-center gap-1"><span className="inline-block size-2.5 rounded-sm" style={{ backgroundColor: "#fde047" }} /> Unsicher (Note 3–4)</span>
        <span className="flex items-center gap-1"><span className="inline-block size-2.5 rounded-sm" style={{ backgroundColor: "#ef4444" }} /> Lücke (Note 5–6)</span>
        <span className="flex items-center gap-1"><span className="inline-block size-2.5 rounded-sm bg-muted/30" /> Keine Note</span>
      </div>
    </div>
  );
}
