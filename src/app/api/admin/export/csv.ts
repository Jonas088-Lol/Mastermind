/* Copyright 2026 Elian Schock, Jonas Schwenk */
// Gemeinsame CSV-Helfer für die Admin-Exporte.
// Semikolon als Trenner (deutsches Excel) + BOM für korrekte Umlaute.

export const CSV_BOM = "\uFEFF";

export function csvRow(values: (string | number | boolean | null | undefined)[]): string {
  return values
    .map((v) => {
      let s = v == null ? "" : String(v);
      // CSV-Formel-Injection verhindern: Zellen, die mit = + - @ (oder Tab/CR)
      // beginnen, würde Excel als Formel ausführen. Führendes Hochkomma
      // neutralisiert das, ohne den Wert sichtbar zu verändern.
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return `"${s.replace(/"/g, '""')}"`;
    })
    .join(";");
}

export function csvResponse(lines: string[], baseName: string): Response {
  const date = new Date().toISOString().slice(0, 10);
  return new Response(CSV_BOM + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${baseName}-${date}.csv"`,
    },
  });
}
