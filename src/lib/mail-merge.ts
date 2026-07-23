/* Copyright 2026 Elian Schock, Jonas Schwenk */

/**
 * Serienbrief-Kernlogik (MasterDoc): Platzhalter füllen und Datenquellen lesen.
 *
 * Bewusst ohne externe Abhängigkeiten — CSV wird selbst geparst, PDFs entstehen
 * wie im Rest des Projekts per Druckansicht (`window.print()`), nicht über eine
 * PDF-Bibliothek.
 */

/** Eine Empfängerzeile: Feldname → Wert. */
export type MergeRow = Record<string, string>;

/** Ergebnis einer geparsten Datenquelle. */
export interface MergeData {
  fields: string[];
  rows: MergeRow[];
}

/**
 * CSV robust parsen: Trennzeichen automatisch (`,` oder `;`), Werte in
 * Anführungszeichen erlaubt, erste Zeile = Kopf. Bewusst simpel, deckt die
 * gängigen Exporte (Excel/LibreOffice) ab.
 */
export function parseCsv(text: string): MergeData {
  const clean = text.replace(/^﻿/, ""); // BOM entfernen
  const lines = clean.split(/\r\n|\n|\r/).filter((l) => l.length > 0);
  if (lines.length === 0) return { fields: [], rows: [] };

  // Trennzeichen anhand der Kopfzeile raten.
  const delim = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";

  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQuotes) {
        if (c === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++; } // escapetes "
          else inQuotes = false;
        } else cur += c;
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === delim) {
        out.push(cur); cur = "";
      } else cur += c;
    }
    out.push(cur);
    return out.map((v) => v.trim());
  };

  const fields = parseLine(lines[0]);
  const rows: MergeRow[] = lines.slice(1).map((line) => {
    const cells = parseLine(line);
    const row: MergeRow = {};
    fields.forEach((f, i) => { row[f] = cells[i] ?? ""; });
    return row;
  });
  return { fields, rows };
}

/**
 * MasterCalc-Tabelle (JSON aus `Spreadsheet.data`) in Merge-Daten umwandeln.
 * Erste belegte Zeile = Feldnamen. Format: { cells: { "A1": "..." }, cols, rows }.
 */
export function spreadsheetToMergeData(dataJson: string): MergeData {
  let parsed: { cells?: Record<string, string>; cols?: number; rows?: number } = {};
  try { parsed = JSON.parse(dataJson); } catch { return { fields: [], rows: [] }; }
  const cells = parsed.cells ?? {};
  const cols = Math.min(parsed.cols ?? 0, 100);
  const rows = Math.min(parsed.rows ?? 0, 5000);
  if (cols === 0 || rows === 0) return { fields: [], rows: [] };

  const colLetter = (n: number): string => {
    // 0 → A, 25 → Z, 26 → AA …
    let s = "";
    n += 1;
    while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
    return s;
  };
  const cell = (c: number, r: number): string => (cells[`${colLetter(c)}${r + 1}`] ?? "").trim();

  const fields: string[] = [];
  for (let c = 0; c < cols; c++) fields.push(cell(c, 0) || colLetter(c));

  const out: MergeRow[] = [];
  for (let r = 1; r < rows; r++) {
    const row: MergeRow = {};
    let any = false;
    for (let c = 0; c < cols; c++) {
      const v = cell(c, r);
      if (v) any = true;
      row[fields[c]] = v;
    }
    if (any) out.push(row);
  }
  return { fields, rows: out };
}

/**
 * Wert eines Platzhalters formatieren. Unterstützt `{{Feld|DD.MM.YYYY}}` für
 * Datumsangaben und `{{Feld|0.0}}`-artige Zahlformate (Nachkommastellen).
 */
function formatValue(raw: string, fmt?: string): string {
  if (!fmt) return raw;
  const f = fmt.trim();

  // Datum
  if (/[DMY]/.test(f) && /[.\-/]/.test(f)) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      const pad = (n: number) => String(n).padStart(2, "0");
      return f
        .replace(/YYYY/g, String(d.getFullYear()))
        .replace(/MM/g, pad(d.getMonth() + 1))
        .replace(/DD/g, pad(d.getDate()));
    }
    return raw;
  }

  // Zahl mit fester Nachkommastelle: "0.0" → 1 Stelle
  const dec = f.match(/^0[.,](0+)$/);
  if (dec) {
    const n = Number(raw.replace(",", "."));
    if (Number.isFinite(n)) return n.toFixed(dec[1].length).replace(".", ",");
  }
  return raw;
}

/**
 * Eine einzelne Bedingung auswerten, z. B. `Fehltage > 10`, `Zweig = M` oder
 * `Bemerkung` (nicht leer). Vergleiche numerisch, wenn beide Seiten Zahlen sind.
 */
function evalCondition(expr: string, row: MergeRow): boolean {
  const m = expr.match(/^\s*(.+?)\s*(>=|<=|!=|=|>|<)\s*(.*?)\s*$/);
  if (!m) {
    // Kein Operator → wahr, wenn das Feld einen nicht-leeren Wert hat.
    return Boolean((row[expr.trim()] ?? "").trim());
  }
  const [, field, op, rawWanted] = m;
  const got = (row[field.trim()] ?? "").trim();
  const wanted = rawWanted.trim();

  const gotNum = Number(got.replace(",", "."));
  const wantedNum = Number(wanted.replace(",", "."));
  const numeric = Number.isFinite(gotNum) && Number.isFinite(wantedNum);

  switch (op) {
    case "=":  return numeric ? gotNum === wantedNum : got.toLowerCase() === wanted.toLowerCase();
    case "!=": return numeric ? gotNum !== wantedNum : got.toLowerCase() !== wanted.toLowerCase();
    case ">":  return numeric && gotNum > wantedNum;
    case "<":  return numeric && gotNum < wantedNum;
    case ">=": return numeric && gotNum >= wantedNum;
    case "<=": return numeric && gotNum <= wantedNum;
    default:   return false;
  }
}

/**
 * Bedingungsblöcke auflösen (wenn/sonst/ende), auch verschachtelt:
 *   {{#wenn Fehltage > 10}}…{{sonst}}…{{/wenn}}
 * Der `{{sonst}}`-Zweig ist optional. Wird vor der Platzhalter-Ersetzung
 * ausgeführt, damit nur der zutreffende Zweig übrig bleibt.
 */
function resolveConditionals(template: string, row: MergeRow): string {
  const open = /\{\{#wenn\s+([^}]+?)\}\}/;
  let guard = 0;
  while (guard++ < 1000) {
    const start = template.search(open);
    if (start === -1) break;
    const openMatch = template.slice(start).match(open)!;
    const condExpr = openMatch[1];
    const afterOpen = start + openMatch[0].length;

    // Passendes {{/wenn}} finden (Verschachtelung mitzählen).
    let depth = 1;
    let i = afterOpen;
    let elseAt = -1;
    const tokenRe = /\{\{#wenn\s+[^}]+?\}\}|\{\{\/wenn\}\}|\{\{sonst\}\}/g;
    tokenRe.lastIndex = afterOpen;
    let closeAt = -1;
    let m: RegExpExecArray | null;
    while ((m = tokenRe.exec(template))) {
      if (m[0].startsWith("{{#wenn")) depth++;
      else if (m[0] === "{{/wenn}}") { depth--; if (depth === 0) { closeAt = m.index; break; } }
      else if (m[0] === "{{sonst}}" && depth === 1 && elseAt === -1) elseAt = m.index;
      i = m.index;
    }
    if (closeAt === -1) break; // unvollständig → unverändert lassen

    const inner = template.slice(afterOpen, closeAt);
    const closeLen = "{{/wenn}}".length;
    let chosen: string;
    if (elseAt !== -1) {
      const thenPart = template.slice(afterOpen, elseAt);
      const elsePart = template.slice(elseAt + "{{sonst}}".length, closeAt);
      chosen = evalCondition(condExpr, row) ? thenPart : elsePart;
    } else {
      chosen = evalCondition(condExpr, row) ? inner : "";
    }
    template = template.slice(0, start) + chosen + template.slice(closeAt + closeLen);
  }
  return template;
}

/** Alle `{{Feld}}` bzw. `{{Feld|Format}}` in einer Zeile ersetzen (inkl. Bedingungen). */
export function renderTemplate(template: string, row: MergeRow): string {
  const resolved = resolveConditionals(template, row);
  return resolved.replace(/\{\{\s*([^}|]+?)\s*(?:\|\s*([^}]+?)\s*)?\}\}/g, (_m, field: string, fmt?: string) => {
    const key = field.trim();
    const val = row[key];
    if (val == null) return `⟨${key}?⟩`; // fehlendes Feld sichtbar markieren
    return formatValue(val, fmt);
  });
}

/** Alle in einem Text vorkommenden Platzhalter-Feldnamen. */
export function placeholdersIn(template: string): string[] {
  const set = new Set<string>();
  for (const m of template.matchAll(/\{\{\s*([^}|]+?)\s*(?:\|[^}]+)?\}\}/g)) {
    const key = m[1].trim();
    // Steuer-Tokens der Bedingungsblöcke sind keine Datenfelder.
    if (key.startsWith("#wenn") || key === "sonst" || key === "/wenn") continue;
    set.add(key);
  }
  return [...set];
}

/** Pflichtfelder, die in einer Zeile leer sind (für die Fehlerliste der Vorschau). */
export function missingFields(template: string, row: MergeRow): string[] {
  return placeholdersIn(template).filter((f) => !((row[f] ?? "").trim()));
}

/** Dateinamen aus Platzhaltern bauen und dateisystemsicher machen. */
export function fileNameFromTemplate(pattern: string, row: MergeRow): string {
  const raw = renderTemplate(pattern, row);
  return raw.replace(/[^\p{L}\p{N}._-]+/gu, "_").replace(/_+/g, "_").slice(0, 120) || "Serienbrief";
}
