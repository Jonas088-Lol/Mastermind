"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, ArrowLeft,
  Bold, ChevronDown, Italic, List, ListOrdered, Printer, Redo,
  Strikethrough, Trash2, Underline, Undo, ZoomIn, ZoomOut,
} from "lucide-react";
import { saveDocumentContent, renameDocument, deleteDocument } from "../actions";

// ── Constants ──────────────────────────────────────────────────────────────

const FONTS = ["Calibri", "Arial", "Times New Roman", "Georgia", "Verdana", "Courier New", "Trebuchet MS", "Helvetica"];
const SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];
const STYLES = [
  { label: "Normal",       tag: "p" },
  { label: "Überschrift 1", tag: "h1" },
  { label: "Überschrift 2", tag: "h2" },
  { label: "Überschrift 3", tag: "h3" },
  { label: "Überschrift 4", tag: "h4" },
  { label: "Zitat",        tag: "blockquote" },
];
const TEXT_COLORS = [
  "#000000","#374151","#6b7280","#ef4444","#f97316","#f59e0b",
  "#10b981","#3b82f6","#8b5cf6","#ec4899","#ffffff","#1e293b",
];
const HILITE_COLORS = [
  "#fef08a","#bbf7d0","#bfdbfe","#fecaca","#e9d5ff","#fed7aa","transparent",
];

type Tab = "start" | "einfuegen" | "layout" | "verweise";

// ── Helpers ────────────────────────────────────────────────────────────────

function countWords(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text ? text.split(" ").length : 0;
}

function exec(cmd: string, val?: string) {
  document.execCommand(cmd, false, val ?? undefined);
}

function isActive(cmd: string): boolean {
  try { return document.queryCommandState(cmd); } catch { return false; }
}

function applyFontSize(px: number) {
  exec("fontSize", "7");
  const fonts = document.querySelectorAll("font[size='7']");
  fonts.forEach((el) => {
    const span = document.createElement("span");
    span.style.fontSize = `${px}pt`;
    el.replaceWith(span);
    while (el.firstChild) span.appendChild(el.firstChild);
  });
}

function buildTableHtml(rows: number, cols: number): string {
  const cell = `<td style="border:1px solid #d1d5db;padding:6px 8px;min-width:60px">&nbsp;</td>`;
  const row = `<tr>${cell.repeat(cols)}</tr>`;
  return `<table style="border-collapse:collapse;width:100%;margin:8px 0">${row.repeat(rows)}</table><p><br></p>`;
}

// ── Micro-components ───────────────────────────────────────────────────────

function Btn({ active, onClick, title, children, className = "" }: {
  active?: boolean; onClick: () => void; title?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`grid min-w-6.5 place-items-center rounded px-1.5 py-1 text-sm transition-colors
        ${active ? "bg-brand/15 text-brand" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"} ${className}`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="mx-1 h-5 w-px shrink-0 bg-gray-200" />;
}

function ColorPop({ colors, onPick, onClose }: { colors: string[]; onPick: (c: string) => void; onClose: () => void }) {
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest("[data-colorpop]")) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);
  return (
    <div data-colorpop className="absolute top-full left-0 z-50 mt-1 rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
      <div className="flex flex-wrap gap-1" style={{ width: 130 }}>
        {colors.map((c) => (
          <button
            key={c}
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onPick(c); onClose(); }}
            className="size-5 rounded border border-gray-200 hover:scale-110 transition-transform"
            style={{
              backgroundColor: c === "transparent" ? "white" : c,
              backgroundImage: c === "transparent"
                ? "linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%),linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%)"
                : undefined,
              backgroundSize: "8px 8px",
              backgroundPosition: "0 0,4px 4px",
            }}
            title={c}
          />
        ))}
      </div>
    </div>
  );
}

function DDrop<T>({ value, options, onSelect, className = "" }: {
  value: string; options: { label: string; value: T }[]; onSelect: (v: T) => void; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        className="flex h-7 items-center gap-1 rounded border border-gray-200 bg-white px-2 text-xs hover:border-gray-300 hover:bg-gray-50"
      >
        <span className="truncate">{value}</span>
        <ChevronDown className="size-3 shrink-0 text-gray-400" />
      </button>
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 max-h-52 min-w-full overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
          {options.map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onSelect(opt.value); setOpen(false); }}
              className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

interface Props {
  documentId: string;
  initialTitle: string;
  initialContent: string;
}

export function DocumentEditor({ documentId, initialTitle, initialContent }: Props) {
  const [tab, setTab] = useState<Tab>("start");
  const [title, setTitle] = useState(initialTitle);
  const [editingTitle, setEditingTitle] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [wordCount, setWordCount] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [showTextColorPop, setShowTextColorPop] = useState(false);
  const [showHilitePop, setShowHilitePop] = useState(false);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [tableHover, setTableHover] = useState({ r: 0, c: 0 });
  const [showHeader, setShowHeader] = useState(false);
  const [showFooter, setShowFooter] = useState(false);
  const [pageNumEnabled, setPageNumEnabled] = useState(false);
  const [footnoteCount, setFootnoteCount] = useState(0);
  const [fmt, setFmt] = useState({ bold: false, italic: false, underline: false, strike: false, jL: true, jC: false, jR: false, jF: false, ul: false, ol: false });
  const [, startTransition] = useTransition();
  const editorRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef<string>("");

  useEffect(() => {
    if (!editorRef.current) return;
    let html = initialContent;
    if (html.trimStart().startsWith("[")) {
      try {
        const blocks = JSON.parse(html) as Array<{ text?: string; content?: string }>;
        html = blocks.map((b) => `<p>${b.text ?? b.content ?? ""}</p>`).join("");
      } catch { html = ""; }
    }
    editorRef.current.innerHTML = html || "<p><br></p>";
    setWordCount(countWords(html));
    lastSaved.current = html;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshFmt = useCallback(() => {
    setFmt({
      bold: isActive("bold"), italic: isActive("italic"),
      underline: isActive("underline"), strike: isActive("strikeThrough"),
      jL: isActive("justifyLeft") || (!isActive("justifyCenter") && !isActive("justifyRight") && !isActive("justifyFull")),
      jC: isActive("justifyCenter"), jR: isActive("justifyRight"), jF: isActive("justifyFull"),
      ul: isActive("insertUnorderedList"), ol: isActive("insertOrderedList"),
    });
  }, []);

  const triggerSave = useCallback((html: string) => {
    if (html === lastSaved.current) return;
    setSaveStatus("unsaved");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSaveStatus("saving");
      lastSaved.current = html;
      startTransition(async () => {
        await saveDocumentContent(documentId, html);
        setSaveStatus("saved");
      });
    }, 1200);
  }, [documentId]);

  function handleInput() {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    setWordCount(countWords(html));
    triggerSave(html);
    refreshFmt();
  }

  function commitTitle() {
    const val = title.trim() || "Unbenanntes Dokument";
    setTitle(val);
    setEditingTitle(false);
    if (val !== initialTitle) startTransition(() => renameDocument(documentId, val));
  }

  function handleDelete() {
    if (!confirm(`Dokument "${title}" wirklich löschen?`)) return;
    startTransition(() => deleteDocument(documentId));
  }

  function insertTOC() {
    if (!editorRef.current) return;
    const headings = Array.from(editorRef.current.querySelectorAll("h1,h2,h3,h4"));
    if (headings.length === 0) {
      alert("Keine Überschriften gefunden. Verwende zuerst Überschrift-Formatvorlagen (Überschrift 1–4) im Start-Tab.");
      return;
    }
    const items = headings.map((h) => {
      const level = parseInt(h.tagName[1]);
      const text = h.textContent ?? "";
      return `<div style="margin-left:${(level - 1) * 20}px;padding:2px 0;font-size:${level === 1 ? 12 : level === 2 ? 11 : 10}pt">${text}</div>`;
    });
    exec("insertHTML", `<div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;margin:8px 0;background:#f9fafb"><p style="font-weight:bold;font-size:12pt;margin-bottom:8px">Inhaltsverzeichnis</p>${items.join("")}</div><p><br></p>`);
    fe();
  }

  function insertFootnote() {
    const n = footnoteCount + 1;
    setFootnoteCount(n);
    exec("insertHTML", `<sup style="color:#2563eb;cursor:default" title="Fußnote ${n}">[${n}]</sup>`);
    if (editorRef.current) {
      const area = editorRef.current.querySelector("[data-footnotes]") as HTMLElement | null;
      if (!area) {
        exec("insertHTML", `<div style="margin-top:24px;padding-top:8px;border-top:1px solid #e5e7eb;font-size:9pt;color:#6b7280" data-footnotes>[${n}]&#x2003;</div>`);
      } else {
        area.insertAdjacentHTML("beforeend", `<br>[${n}]&#x2003;`);
      }
    }
    fe();
  }

  const fe = () => editorRef.current?.focus();

  // ── Ribbon tabs ────────────────────────────────────────────────────────────

  const StartTab = (
    <div className="flex flex-wrap items-center gap-0.5 px-3 py-1.5">
      <Btn onClick={() => { exec("undo"); fe(); }} title="Rückgängig"><Undo className="size-3.5" /></Btn>
      <Btn onClick={() => { exec("redo"); fe(); }} title="Wiederholen"><Redo className="size-3.5" /></Btn>
      <Sep />
      <DDrop value="Stil" options={STYLES.map((s) => ({ label: s.label, value: s.tag }))} onSelect={(t) => { exec("formatBlock", t); fe(); }} className="w-32" />
      <DDrop value="Calibri" options={FONTS.map((f) => ({ label: f, value: f }))} onSelect={(f) => { exec("fontName", f); fe(); }} className="w-36" />
      <DDrop value="12" options={SIZES.map((s) => ({ label: String(s), value: s }))} onSelect={(s) => { applyFontSize(s); fe(); }} className="w-14" />
      <Sep />
      <Btn active={fmt.bold}      onClick={() => { exec("bold");          refreshFmt(); }} title="Fett"><Bold className="size-3.5" /></Btn>
      <Btn active={fmt.italic}    onClick={() => { exec("italic");        refreshFmt(); }} title="Kursiv"><Italic className="size-3.5" /></Btn>
      <Btn active={fmt.underline} onClick={() => { exec("underline");     refreshFmt(); }} title="Unterstreichen"><Underline className="size-3.5" /></Btn>
      <Btn active={fmt.strike}    onClick={() => { exec("strikeThrough"); refreshFmt(); }} title="Durchstreichen"><Strikethrough className="size-3.5" /></Btn>
      <Sep />
      <div className="relative">
        <Btn onClick={() => setShowTextColorPop((v) => !v)} title="Textfarbe">
          <span className="flex flex-col items-center gap-px"><span className="font-bold text-xs leading-none">A</span><span className="h-1 w-4 rounded-full bg-brand" /></span>
        </Btn>
        {showTextColorPop && <ColorPop colors={TEXT_COLORS} onPick={(c) => { exec("foreColor", c); fe(); }} onClose={() => setShowTextColorPop(false)} />}
      </div>
      <div className="relative">
        <Btn onClick={() => setShowHilitePop((v) => !v)} title="Markierung">
          <span className="flex flex-col items-center gap-px"><span className="text-xs leading-none">ab</span><span className="h-1 w-4 rounded-full bg-yellow-300" /></span>
        </Btn>
        {showHilitePop && <ColorPop colors={HILITE_COLORS} onPick={(c) => { exec("hiliteColor", c); fe(); }} onClose={() => setShowHilitePop(false)} />}
      </div>
      <Sep />
      <Btn active={fmt.jL} onClick={() => { exec("justifyLeft");   refreshFmt(); }} title="Links"><AlignLeft    className="size-3.5" /></Btn>
      <Btn active={fmt.jC} onClick={() => { exec("justifyCenter"); refreshFmt(); }} title="Zentriert"><AlignCenter  className="size-3.5" /></Btn>
      <Btn active={fmt.jR} onClick={() => { exec("justifyRight");  refreshFmt(); }} title="Rechts"><AlignRight   className="size-3.5" /></Btn>
      <Btn active={fmt.jF} onClick={() => { exec("justifyFull");   refreshFmt(); }} title="Blocksatz"><AlignJustify className="size-3.5" /></Btn>
      <Sep />
      <Btn active={fmt.ul} onClick={() => { exec("insertUnorderedList"); refreshFmt(); }} title="Aufzählung"><List        className="size-3.5" /></Btn>
      <Btn active={fmt.ol} onClick={() => { exec("insertOrderedList");   refreshFmt(); }} title="Nummerierung"><ListOrdered className="size-3.5" /></Btn>
      <Sep />
      <Btn onClick={() => { exec("indent");  fe(); }} title="Einzug +"><span className="text-[11px]">⇥</span></Btn>
      <Btn onClick={() => { exec("outdent"); fe(); }} title="Einzug -"><span className="text-[11px]">⇤</span></Btn>
    </div>
  );

  const EinfuegenTab = (
    <div className="flex flex-wrap items-center gap-2 px-3 py-1.5">
      <div className="relative">
        <Btn onClick={() => setShowTablePicker((v) => !v)} title="Tabelle">
          <span className="flex items-center gap-1 text-xs">⊞ Tabelle <ChevronDown className="size-3" /></span>
        </Btn>
        {showTablePicker && (
          <div className="absolute top-full left-0 z-50 mt-1 rounded-xl border border-gray-200 bg-white p-3 shadow-xl" onMouseLeave={() => setTableHover({ r: 0, c: 0 })}>
            <p className="mb-2 text-[10px] text-gray-400">{tableHover.r > 0 ? `${tableHover.r} × ${tableHover.c}` : "Tabelle einfügen"}</p>
            <div className="grid gap-0.5" style={{ gridTemplateColumns: "repeat(8,16px)" }}>
              {Array.from({ length: 8 }, (_, r) =>
                Array.from({ length: 8 }, (_, c) => (
                  <button key={`${r}-${c}`} type="button"
                    onMouseEnter={() => setTableHover({ r: r + 1, c: c + 1 })}
                    onMouseDown={(e) => { e.preventDefault(); exec("insertHTML", buildTableHtml(r + 1, c + 1)); setShowTablePicker(false); fe(); }}
                    className={`size-4 rounded-sm border ${r < tableHover.r && c < tableHover.c ? "border-brand bg-brand/20" : "border-gray-200"}`}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>
      <Btn onClick={() => { exec("insertHorizontalRule"); fe(); }} title="Horizontale Linie">
        <span className="text-xs">─ Linie</span>
      </Btn>
      <label className="cursor-pointer rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100">
        🖼 Bild
        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => { exec("insertImage", ev.target?.result as string); fe(); };
          reader.readAsDataURL(file);
          e.target.value = "";
        }} />
      </label>
    </div>
  );

  const LayoutTab = (
    <div className="flex flex-wrap items-center gap-3 px-3 py-1.5">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Zoom:</span>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); setZoom((z) => Math.max(50, z - 10)); }} className="grid size-6 place-items-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50"><ZoomOut className="size-3" /></button>
        <span className="w-10 text-center font-mono text-xs">{zoom}%</span>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); setZoom((z) => Math.min(200, z + 10)); }} className="grid size-6 place-items-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50"><ZoomIn className="size-3" /></button>
      </div>
      <Sep />
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Seitenränder:</span>
        {[{ label: "Normal", val: "2.54cm" }, { label: "Schmal", val: "1.27cm" }, { label: "Breit", val: "3.81cm" }].map(({ label, val }) => (
          <button key={label} type="button" onMouseDown={(e) => { e.preventDefault(); if (editorRef.current) editorRef.current.style.padding = val; }} className="rounded border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50">{label}</button>
        ))}
      </div>
    </div>
  );

  const VerweiseTab = (
    <div className="flex flex-wrap items-center gap-1.5 px-3 py-1.5">
      <Btn onClick={insertTOC} title="Inhaltsverzeichnis aus Überschriften generieren">
        <span className="flex items-center gap-1 text-xs">≡ Inhaltsverzeichnis</span>
      </Btn>
      <Sep />
      <Btn onClick={insertFootnote} title="Fußnote einfügen">
        <span className="flex items-center gap-1 text-xs">Fußnote<sup className="text-[8px]">1</sup></span>
      </Btn>
      <Sep />
      <Btn active={showHeader} onClick={() => setShowHeader((v) => !v)} title="Kopfzeile ein-/ausblenden">
        <span className="text-xs">Kopfzeile</span>
      </Btn>
      <Btn active={showFooter} onClick={() => setShowFooter((v) => !v)} title="Fußzeile ein-/ausblenden">
        <span className="text-xs">Fußzeile</span>
      </Btn>
      <Btn active={pageNumEnabled} onClick={() => { setPageNumEnabled((v) => !v); if (!showFooter) setShowFooter(true); }} title="Seitenzahl in Fußzeile anzeigen">
        <span className="text-xs"># Seitenzahl</span>
      </Btn>
    </div>
  );

  return (
    <div className="office-shell -mx-6 -mb-24 -mt-8 flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-[#f0f0f0] lg:-mx-10 lg:-mb-10 lg:-mt-10">

      {/* Title bar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-3 py-1.5 shadow-sm">
        <Link href="/app/dokumente" className="grid size-8 place-items-center text-gray-400 hover:text-gray-700">
          <ArrowLeft className="size-4" strokeWidth={1.75} />
        </Link>
        <div className="min-w-0 flex-1">
          {editingTitle ? (
            <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onBlur={commitTitle}
              onKeyDown={(e) => { if (e.key === "Enter") commitTitle(); if (e.key === "Escape") { setTitle(initialTitle); setEditingTitle(false); } }}
              className="w-full border-b border-brand bg-transparent text-sm font-semibold focus:outline-none" />
          ) : (
            <button type="button" onClick={() => setEditingTitle(true)} className="truncate text-sm font-semibold hover:text-brand">{title}</button>
          )}
        </div>
        <span className="font-mono text-[10px] text-gray-400">
          {saveStatus === "saving" ? "Speichert…" : saveStatus === "unsaved" ? "●" : "✓ Gespeichert"}
        </span>
        <button type="button" onClick={() => window.print()} className="grid size-7 place-items-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50" title="Drucken">
          <Printer className="size-3.5" strokeWidth={1.75} />
        </button>
        <button type="button" onClick={handleDelete} className="grid size-7 place-items-center rounded border border-gray-200 text-gray-500 hover:text-red-500" title="Löschen">
          <Trash2 className="size-3.5" strokeWidth={1.75} />
        </button>
      </div>

      {/* Ribbon */}
      <div className="shrink-0 border-b border-gray-200 bg-white">
        <div className="flex border-b border-gray-100 px-3">
          {(["start", "einfuegen", "layout", "verweise"] as Tab[]).map((t) => (
            <button key={t} type="button" onMouseDown={(e) => { e.preventDefault(); setTab(t); }}
              className={`px-4 py-1.5 text-xs font-medium transition-colors ${tab === t ? "border-b-2 border-brand text-brand" : "text-gray-500 hover:text-gray-800"}`}>
              {t === "start" ? "Start" : t === "einfuegen" ? "Einfügen" : t === "layout" ? "Layout" : "Verweise"}
            </button>
          ))}
        </div>
        {tab === "start"     && StartTab}
        {tab === "einfuegen" && EinfuegenTab}
        {tab === "layout"    && LayoutTab}
        {tab === "verweise"  && VerweiseTab}
      </div>

      {/* Page area */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="office-page mx-auto" style={{ width: `${(794 * zoom) / 100}px`, transformOrigin: "top center" }}>
          {/* Header */}
          {showHeader && (
            <div className="border-b-2 border-dashed border-blue-200 bg-white shadow-sm">
              <div
                ref={headerRef}
                contentEditable
                suppressContentEditableWarning
                className="min-h-8 w-full focus:outline-none"
                style={{ padding: "0.4cm 2.54cm", fontFamily: "Calibri, Arial, sans-serif", fontSize: "10pt", color: "#6b7280" }}
              />
            </div>
          )}

          {/* Page content */}
          <div className="w-198.5 min-h-280.75 bg-white shadow-xl print:shadow-none" style={{ fontFamily: "Calibri, Arial, sans-serif" }}>
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleInput}
              onKeyUp={refreshFmt}
              onMouseUp={refreshFmt}
              onFocus={refreshFmt}
              className="min-h-full w-full focus:outline-none"
              style={{ padding: "2.54cm", fontSize: "12pt", lineHeight: 1.5, color: "#1a1a1a" }}
            />
          </div>

          {/* Footer */}
          {showFooter && (
            <div className="border-t-2 border-dashed border-blue-200 bg-white shadow-sm">
              <div
                ref={footerRef}
                contentEditable
                suppressContentEditableWarning
                className="min-h-8 w-full focus:outline-none"
                style={{ padding: "0.3cm 2.54cm 0.4cm", fontFamily: "Calibri, Arial, sans-serif", fontSize: "10pt", color: "#6b7280" }}
              />
              {pageNumEnabled && (
                <p className="pb-2 text-center text-xs text-gray-400">— Seite 1 —</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="flex shrink-0 items-center gap-4 border-t border-gray-200 bg-white px-4 py-1 text-[10px] text-gray-400">
        <span>{wordCount} Wörter</span>
        <span>A4 · Hochformat</span>
        <span className="ml-auto">{zoom}%</span>
      </div>
    </div>
  );
}
