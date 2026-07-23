/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Printer, Save, Send, Table2, Upload, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  parseCsv,
  placeholdersIn,
  renderTemplate,
  missingFields,
  type MergeData,
  type MergeRow,
} from "@/lib/mail-merge";
import { saveTemplate, loadSpreadsheetSource, loadSchoolClassSource, sendAsElternbrief } from "../actions";

interface TemplateDTO {
  id: string;
  title: string;
  subject: string;
  body: string;
  sourceType: string;
  sourceRef: string | null;
  sourceData: string | null;
}

type SourceType = "csv" | "spreadsheet" | "schooldata";

export function SerienbriefEditor({
  template,
  spreadsheets,
  classes,
  flash,
}: {
  template: TemplateDTO;
  spreadsheets: { id: string; title: string }[];
  classes: { id: string; name: string }[];
  flash?: { sent?: string; parents?: string; error?: string };
}) {
  const [title, setTitle] = useState(template.title);
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [sourceType, setSourceType] = useState<SourceType>(
    template.sourceType === "spreadsheet" || template.sourceType === "schooldata"
      ? (template.sourceType as SourceType)
      : "csv",
  );
  const [sheetId, setSheetId] = useState(template.sourceType === "spreadsheet" ? (template.sourceRef ?? "") : "");
  const [classId, setClassId] = useState(template.sourceType === "schooldata" ? (template.sourceRef ?? "") : "");
  const [data, setData] = useState<MergeData>(() => {
    if (template.sourceData) {
      try {
        const parsed = JSON.parse(template.sourceData) as MergeData;
        if (Array.isArray(parsed.rows)) return parsed;
      } catch { /* ignore */ }
    }
    return { fields: [], rows: [] };
  });
  const [preview, setPreview] = useState(0);
  const [saving, startSave] = useTransition();
  const [loadingSheet, startSheet] = useTransition();
  const [sending, startSend] = useTransition();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Bei Quellen, die nicht mitgespeichert werden (MasterCalc/Schuldaten), die
  // Daten beim Öffnen einmalig nachladen.
  useEffect(() => {
    if (sourceType === "spreadsheet" && sheetId) {
      startSheet(async () => { const md = await loadSpreadsheetSource(sheetId); setData(md); });
    } else if (sourceType === "schooldata" && classId) {
      startSheet(async () => { const md = await loadSchoolClassSource(classId); setData(md); });
    }
    // Nur beim ersten Rendern.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const usedFields = useMemo(() => placeholdersIn(subject + "\n" + body), [subject, body]);
  const currentRow: MergeRow = data.rows[preview] ?? {};
  const rowCount = data.rows.length;

  // Empfänger mit fehlenden Pflichtfeldern (für die Fehlerliste).
  const problems = useMemo(() => {
    const tpl = subject + "\n" + body;
    return data.rows
      .map((row, i) => ({ i, miss: missingFields(tpl, row) }))
      .filter((p) => p.miss.length > 0);
  }, [data.rows, subject, body]);

  function insertSnippet(token: string) {
    const ta = bodyRef.current;
    if (!ta) { setBody((b) => b + token); return; }
    const start = ta.selectionStart ?? body.length;
    const end = ta.selectionEnd ?? body.length;
    setBody(body.slice(0, start) + token + body.slice(end));
    // Cursor nach dem eingefügten Text positionieren.
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + token.length;
    });
  }

  function insertPlaceholder(field: string) {
    insertSnippet(`{{${field}}}`);
  }

  function onCsvFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseCsv(String(reader.result ?? ""));
      setData(parsed);
      setPreview(0);
    };
    reader.readAsText(file);
  }

  function chooseSheet(id: string) {
    setSheetId(id);
    if (!id) { setData({ fields: [], rows: [] }); return; }
    startSheet(async () => {
      const md = await loadSpreadsheetSource(id);
      setData(md);
      setPreview(0);
    });
  }

  function chooseClass(id: string) {
    setClassId(id);
    if (!id) { setData({ fields: [], rows: [] }); return; }
    startSheet(async () => {
      const md = await loadSchoolClassSource(id);
      setData(md);
      setPreview(0);
    });
  }

  function buildFormData(): FormData {
    const fd = new FormData();
    fd.set("id", template.id);
    fd.set("title", title);
    fd.set("subject", subject);
    fd.set("body", body);
    fd.set("sourceType", sourceType);
    fd.set(
      "sourceRef",
      sourceType === "spreadsheet" ? sheetId : sourceType === "schooldata" ? classId : "",
    );
    // CSV-Daten mitspeichern, damit die Vorschau/Sammeldruck nach Reload bleibt.
    // Schuldaten NICHT einfrieren (DSGVO/Aktualität) — werden live nachgeladen.
    fd.set("sourceData", sourceType === "csv" ? JSON.stringify(data) : "");
    return fd;
  }

  function save() {
    startSave(async () => { await saveTemplate(buildFormData()); });
  }

  const inputCls =
    "w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg outline-none transition-colors placeholder:text-muted-fg focus:border-brand";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      {/* Kopf */}
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/teach/serienbrief" className="text-muted-fg hover:text-fg">
          <ArrowLeft className="size-4" />
        </Link>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1 py-1 text-xl font-bold outline-none hover:border-border focus:border-brand"
        />
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-fg px-3 py-2 text-xs font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Save className="size-3.5" />
          {saving ? "Speichert…" : "Speichern"}
        </button>
      </div>

      {flash?.error && (
        <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {flash.error}
        </div>
      )}
      {flash?.sent && (
        <div className="rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
          {flash.sent} Elternbrief(e) versendet
          {flash.parents ? ` · ${flash.parents} Elternteil(e) benachrichtigt` : ""}.
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* Links: Editor */}
        <div className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-fg">Betreff</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} placeholder="z. B. Einladung zum Elternabend" />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-fg">Text</label>
              <span className="text-[11px] text-muted-fg">Platzhalter unten anklicken zum Einfügen</span>
            </div>
            <textarea
              ref={bodyRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={16}
              className={cn(inputCls, "resize-y font-mono leading-relaxed")}
              placeholder={"Liebe Familie {{Nachname}},\n\nzum Elternabend am {{Datum|DD.MM.YYYY}} laden wir Sie herzlich ein.\n\nMit freundlichen Grüßen"}
            />
          </div>

          {/* Verfügbare Felder */}
          {data.fields.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-fg">Verfügbare Felder</label>
              <div className="flex flex-wrap gap-1.5">
                {data.fields.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => insertPlaceholder(f)}
                    className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium transition-colors hover:border-brand/40 hover:text-brand"
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bedingungsblock einfügen */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-fg">Bedingung</label>
            <button
              type="button"
              onClick={() => insertSnippet("{{#wenn Feld > 10}}\nText, wenn zutrifft\n{{sonst}}\nText sonst\n{{/wenn}}")}
              className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium transition-colors hover:border-brand/40 hover:text-brand"
            >
              wenn/sonst einfügen
            </button>
            <p className="text-[11px] text-muted-fg">
              Beispiel: <code>{"{{#wenn Fehltage > 10}}…{{sonst}}…{{/wenn}}"}</code> · Operatoren: = ≠ &gt; &lt; ≥ ≤, oder nur Feldname (nicht leer).
            </p>
          </div>
        </div>

        {/* Rechts: Datenquelle + Vorschau */}
        <div className="flex flex-col gap-4">
          {/* Quelle */}
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs font-semibold text-muted-fg">Datenquelle</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setSourceType("csv")}
                className={cn("flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors",
                  sourceType === "csv" ? "border-brand bg-brand/10 text-brand" : "border-border text-muted-fg hover:text-fg")}
              >
                <Upload className="mr-1 inline size-3.5" />CSV
              </button>
              <button
                type="button"
                onClick={() => setSourceType("spreadsheet")}
                className={cn("flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors",
                  sourceType === "spreadsheet" ? "border-brand bg-brand/10 text-brand" : "border-border text-muted-fg hover:text-fg")}
              >
                <Table2 className="mr-1 inline size-3.5" />MasterCalc
              </button>
              <button
                type="button"
                onClick={() => setSourceType("schooldata")}
                className={cn("flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors",
                  sourceType === "schooldata" ? "border-brand bg-brand/10 text-brand" : "border-border text-muted-fg hover:text-fg")}
              >
                <Users className="mr-1 inline size-3.5" />Klasse
              </button>
            </div>

            {sourceType === "csv" && (
              <div className="mt-3">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) onCsvFile(f); }}
                  className="w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-surface file:px-2 file:py-1 file:text-xs file:font-semibold"
                />
                <p className="mt-1 text-[11px] text-muted-fg">Erste Zeile = Spaltennamen. Trennzeichen , oder ; wird erkannt.</p>
              </div>
            )}
            {sourceType === "spreadsheet" && (
              <div className="mt-3">
                <select value={sheetId} onChange={(e) => chooseSheet(e.target.value)} className={inputCls}>
                  <option value="">Tabelle wählen…</option>
                  {spreadsheets.map((s) => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
                {loadingSheet && <p className="mt-1 text-[11px] text-muted-fg">Lädt…</p>}
              </div>
            )}
            {sourceType === "schooldata" && (
              <div className="mt-3">
                <select value={classId} onChange={(e) => chooseClass(e.target.value)} className={inputCls}>
                  <option value="">Klasse wählen…</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {loadingSheet && <p className="mt-1 text-[11px] text-muted-fg">Lädt…</p>}
                <p className="mt-1 text-[11px] text-muted-fg">
                  Nur Klassen, die du unterrichtest. Felder: Name, Vorname, Nachname, Klasse.
                  Direktversand nur mit dieser Quelle.
                </p>
              </div>
            )}

            <p className="mt-3 text-xs text-muted-fg">
              {rowCount > 0 ? `${rowCount} Empfänger · ${data.fields.length} Felder` : "Noch keine Daten geladen"}
            </p>
          </div>

          {/* Fehlerliste */}
          {problems.length > 0 && (
            <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs">
              <p className="font-semibold text-warning">{problems.length} Empfänger mit leeren Pflichtfeldern</p>
              <p className="mt-1 text-muted-fg">
                Betroffen u. a.: {problems.slice(0, 3).map((p) => `#${p.i + 1} (${p.miss.join(", ")})`).join("; ")}
                {problems.length > 3 ? " …" : ""}
              </p>
            </div>
          )}

          {/* Vorschau */}
          <div className="rounded-xl border border-border bg-bg p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-fg">Vorschau</p>
              {rowCount > 0 && (
                <div className="flex items-center gap-1 text-xs">
                  <button type="button" onClick={() => setPreview((p) => Math.max(0, p - 1))} disabled={preview === 0}
                    className="rounded p-1 hover:bg-surface disabled:opacity-30"><ChevronLeft className="size-4" /></button>
                  <span className="tabular-nums text-muted-fg">{preview + 1} / {rowCount}</span>
                  <button type="button" onClick={() => setPreview((p) => Math.min(rowCount - 1, p + 1))} disabled={preview >= rowCount - 1}
                    className="rounded p-1 hover:bg-surface disabled:opacity-30"><ChevronRight className="size-4" /></button>
                </div>
              )}
            </div>

            {rowCount === 0 ? (
              <p className="mt-3 text-sm text-muted-fg">Lade eine Datenquelle, um die Vorschau zu sehen.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {subject && (
                  <p className="text-sm font-semibold">{renderTemplate(subject, currentRow)}</p>
                )}
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{renderTemplate(body, currentRow)}</p>
              </div>
            )}
          </div>

          {rowCount > 0 && (
            <button
              type="button"
              onClick={() => startSave(async () => {
                // Erst speichern, dann Sammeldruck öffnen — die Druckseite liest
                // die gespeicherten Daten serverseitig.
                await saveTemplate(buildFormData());
                window.open(`/teach/serienbrief/${template.id}/druck`, "_blank");
              })}
              disabled={saving}
              className="no-print inline-flex items-center justify-center gap-1.5 rounded-lg bg-fg px-3 py-2 text-xs font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Printer className="size-3.5" />
              Alle {rowCount} Briefe drucken / als PDF
            </button>
          )}

          {sourceType === "schooldata" && rowCount > 0 && (
            <button
              type="button"
              onClick={() => startSend(async () => {
                // Erst speichern, dann versenden — der Server rendert je Kind neu.
                await saveTemplate(buildFormData());
                const fd = new FormData();
                fd.set("id", template.id);
                await sendAsElternbrief(fd); // leitet mit Ergebnis zurück
              })}
              disabled={sending}
              className="no-print inline-flex items-center justify-center gap-1.5 rounded-lg pastel-cta px-3 py-2 text-xs font-bold disabled:opacity-50"
            >
              <Send className="size-3.5" />
              {sending ? "Versendet…" : "Als personalisierten Elternbrief senden"}
            </button>
          )}
          {sourceType === "schooldata" && (
            <p className="text-[11px] text-muted-fg">
              Jede Familie sieht nur ihren eigenen Brief. Eltern werden benachrichtigt und
              bestätigen digital.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
