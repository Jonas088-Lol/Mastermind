"use client";

import {
  useCallback, useEffect, useRef, useState, useTransition,
} from "react";
import {
  AlignCenter, AlignLeft, AlignRight, ArrowLeft, Bold, ChevronDown,
  Download, Italic, Plus, Trash2, Underline,
} from "lucide-react";
import Link from "next/link";
import { saveSpreadsheetData, renameSpreadsheet, deleteSpreadsheet } from "../actions";

// ── Types ──────────────────────────────────────────────────────────────────

type NumFmt = "general" | "number" | "currency" | "percent" | "date";
type Align  = "left" | "center" | "right";

interface CellData {
  v:      string;
  bold?:  boolean;
  italic?: boolean;
  under?: boolean;
  color?: string;
  bg?:    string;
  align?: Align;
  fmt?:   NumFmt;
  bTop?: boolean; bRight?: boolean; bBottom?: boolean; bLeft?: boolean;
}

interface SheetDef {
  name: string;
  cols: number;
  rows: number;
  cells: Record<string, CellData>;
  colWidths: Record<string, number>;
  rowHeights: Record<string, number>;
}

interface WorkbookData {
  sheets: SheetDef[];
  active: number;
}

const DEFAULT_SHEET = (): SheetDef => ({ name: "Tabelle1", cols: 26, rows: 50, cells: {}, colWidths: {}, rowHeights: {} });

function parseData(json: string): WorkbookData {
  try {
    const d = JSON.parse(json) as Partial<WorkbookData & SheetDef>;
    // Legacy flat format
    if (d.cells && !d.sheets) {
      return { sheets: [{ name: "Tabelle1", cols: d.cols ?? 26, rows: d.rows ?? 50, cells: d.cells ?? {}, colWidths: d.colWidths ?? {}, rowHeights: {} }], active: 0 };
    }
    if (d.sheets && Array.isArray(d.sheets) && d.sheets.length > 0) {
      return { sheets: d.sheets, active: d.active ?? 0 };
    }
  } catch { /* ignore */ }
  return { sheets: [DEFAULT_SHEET()], active: 0 };
}

// ── Formula engine ─────────────────────────────────────────────────────────

function colToIndex(col: string): number {
  let idx = 0;
  for (const ch of col.toUpperCase()) idx = idx * 26 + (ch.charCodeAt(0) - 64);
  return idx - 1;
}

function indexToCol(idx: number): string {
  let col = "", n = idx + 1;
  while (n > 0) { n--; col = String.fromCharCode(65 + (n % 26)) + col; n = Math.floor(n / 26); }
  return col;
}

function cellRefToKey(ref: string): string {
  const m = ref.toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!m) return "";
  return `${parseInt(m[2]) - 1},${colToIndex(m[1])}`;
}

function getRangeKeys(from: string, to: string): string[] {
  const mf = from.toUpperCase().match(/^([A-Z]+)(\d+)$/);
  const mt = to.toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!mf || !mt) return [];
  const r1 = parseInt(mf[2]) - 1, c1 = colToIndex(mf[1]);
  const r2 = parseInt(mt[2]) - 1, c2 = colToIndex(mt[1]);
  const keys: string[] = [];
  for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++)
    for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++)
      keys.push(`${r},${c}`);
  return keys;
}

function evaluateCell(key: string, cells: Record<string, CellData>, depth = 0): string {
  if (depth > 50) return "#LOOP";
  const cell = cells[key];
  if (!cell?.v) return "";
  const v = cell.v;
  if (!v.startsWith("=")) return v;
  const expr = v.slice(1).toUpperCase().trim();
  const fnMatch = expr.match(/^(SUM|AVERAGE|MIN|MAX|COUNT|IF)\((.+)\)$/);
  if (fnMatch) {
    const [, fn, args] = fnMatch;
    const rangeMatch = args.match(/^([A-Z]+\d+):([A-Z]+\d+)$/);
    if (rangeMatch && fn !== "IF") {
      const keys = getRangeKeys(rangeMatch[1], rangeMatch[2]);
      const nums = keys.map((k) => evaluateCell(k, cells, depth + 1)).map(Number).filter((n) => !isNaN(n));
      if (fn === "SUM")     return String(r(nums.reduce((a, b) => a + b, 0)));
      if (fn === "AVERAGE") return nums.length > 0 ? String(r(nums.reduce((a, b) => a + b, 0) / nums.length)) : "0";
      if (fn === "MIN")     return nums.length > 0 ? String(Math.min(...nums)) : "0";
      if (fn === "MAX")     return nums.length > 0 ? String(Math.max(...nums)) : "0";
      if (fn === "COUNT")   return String(nums.length);
    }
    if (fn === "IF") {
      // Split args by commas respecting nested parens
      const splitArgs = (s: string): string[] => {
        const parts: string[] = []; let d = 0, start = 0;
        for (let i = 0; i < s.length; i++) {
          if (s[i] === "(") d++;
          else if (s[i] === ")") d--;
          else if (s[i] === "," && d === 0) { parts.push(s.slice(start, i).trim()); start = i + 1; }
        }
        parts.push(s.slice(start).trim());
        return parts;
      };
      const [cond, valTrue = "0", valFalse = "0"] = splitArgs(args);
      const resolveRefs = (arg: string) => arg.replace(/[A-Z]+\d+/g, (ref) => {
        const val = evaluateCell(cellRefToKey(ref), cells, depth + 1);
        const num = Number(val);
        return isNaN(num) ? `"${val}"` : String(num);
      });
      try {
        // eslint-disable-next-line no-new-func
        const condResult = new Function(`return Boolean(${resolveRefs(cond)})`)() as boolean;
        const raw = (condResult ? valTrue : valFalse).replace(/^"(.*)"$/, "$1");
        if (/^[A-Z]+\d+$/.test(raw)) return evaluateCell(cellRefToKey(raw), cells, depth + 1);
        const num = Number(raw);
        return isNaN(num) ? raw : String(r(num));
      } catch { return "#ERR"; }
    }
  }
  const resolved = expr.replace(/[A-Z]+\d+/g, (ref) => {
    const val = evaluateCell(cellRefToKey(ref), cells, depth + 1);
    const num = Number(val);
    return isNaN(num) ? "0" : String(num);
  });
  try {
    // eslint-disable-next-line no-new-func
    const result = new Function(`return (${resolved})`)() as unknown;
    if (typeof result === "number") return String(r(result));
    return String(result);
  } catch { return "#ERR"; }
}

function r(n: number): number { return Math.round(n * 1_000_000) / 1_000_000; }

function formatDisplay(raw: string, evaluated: string, fmt: NumFmt = "general"): string {
  if (raw.startsWith("=")) {
    const num = Number(evaluated);
    if (!isNaN(num)) return applyFmt(num, fmt);
    return evaluated;
  }
  const num = Number(raw);
  if (!isNaN(num) && raw !== "") return applyFmt(num, fmt);
  return raw;
}

function applyFmt(n: number, fmt: NumFmt): string {
  if (fmt === "currency") return n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
  if (fmt === "percent")  return (n / 100).toLocaleString("de-DE", { style: "percent", minimumFractionDigits: 1 });
  if (fmt === "number")   return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (fmt === "date")     { const d = new Date(n * 86400000); return isNaN(d.getTime()) ? String(n) : d.toLocaleDateString("de-DE"); }
  return String(n);
}

// ── Context menu ───────────────────────────────────────────────────────────

interface CtxMenu { x: number; y: number; row: number; col: number; }

// ── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_COL_W = 90;
const ROW_H = 22;
const HDR_H = 24;
const ROW_NUM_W = 42;

// ── Main component ─────────────────────────────────────────────────────────

interface Props { spreadsheetId: string; initialTitle: string; initialData: string; }

export function SpreadsheetEditor({ spreadsheetId, initialTitle, initialData }: Props) {
  const [wb, setWb]           = useState<WorkbookData>(() => parseData(initialData));
  const [title, setTitle]     = useState(initialTitle);
  const [editTitle, setEditTitle] = useState(false);
  const [sel, setSel]         = useState<{ r: number; c: number } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [ctx, setCtx]         = useState<CtxMenu | null>(null);
  const [resizing, setResizing] = useState<{ col: number; startX: number; startW: number } | null>(null);
  const [, startTr]           = useTransition();
  const saveTimer             = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cellInputRef          = useRef<HTMLInputElement>(null);
  const fbarRef               = useRef<HTMLInputElement>(null);
  const containerRef          = useRef<HTMLDivElement>(null);

  const sheet = wb.sheets[wb.active] ?? wb.sheets[0];
  const { cols, rows, cells } = sheet;

  // ── Save ────────────────────────────────────────────────────────────────

  const triggerSave = useCallback((next: WorkbookData) => {
    setSaveStatus("unsaved");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSaveStatus("saving");
      startTr(async () => {
        await saveSpreadsheetData(spreadsheetId, JSON.stringify(next));
        setSaveStatus("saved");
      });
    }, 800);
  }, [spreadsheetId]);

  function updateSheet(patch: Partial<SheetDef>) {
    setWb((prev) => {
      const sheets = prev.sheets.map((s, i) => i === prev.active ? { ...s, ...patch } : s);
      const next = { ...prev, sheets };
      triggerSave(next);
      return next;
    });
  }

  // ── Cell ops ─────────────────────────────────────────────────────────────

  function key(row: number, col: number) { return `${row},${col}`; }

  function getEval(row: number, col: number): string {
    const k = key(row, col);
    const c = cells[k];
    if (!c?.v) return "";
    if (c.v.startsWith("=")) return evaluateCell(k, cells);
    return c.v;
  }

  function getRaw(row: number, col: number): string { return cells[key(row, col)]?.v ?? ""; }

  function getCell(row: number, col: number): CellData | undefined { return cells[key(row, col)]; }

  function setCell(row: number, col: number, value: string) {
    const k = key(row, col);
    const nextCells = { ...cells };
    if (value === "") {
      const existing = nextCells[k];
      if (existing) {
        const { v: _, ...rest } = existing;
        if (Object.keys(rest).length > 0) nextCells[k] = rest as CellData;
        else delete nextCells[k];
      }
    } else {
      nextCells[k] = { ...nextCells[k], v: value };
    }
    updateSheet({ cells: nextCells });
  }

  function patchCell(row: number, col: number, patch: Partial<CellData>) {
    const k = key(row, col);
    const nextCells = { ...cells, [k]: { ...cells[k], ...patch } };
    updateSheet({ cells: nextCells });
  }

  function patchSel(patch: Partial<CellData>) {
    if (!sel) return;
    patchCell(sel.r, sel.c, patch);
  }

  // ── Edit commit ──────────────────────────────────────────────────────────

  function commitEdit() {
    if (editing !== null && sel) setCell(sel.r, sel.c, editing);
    setEditing(null);
  }

  // ── Keyboard ─────────────────────────────────────────────────────────────

  function handleCellKey(e: React.KeyboardEvent, row: number, col: number) {
    if (editing !== null) {
      if (e.key === "Enter")  { e.preventDefault(); commitEdit(); setSel({ r: Math.min(row + 1, rows - 1), c: col }); }
      if (e.key === "Escape") { setEditing(null); }
      if (e.key === "Tab")    { e.preventDefault(); commitEdit(); setSel({ r: row, c: Math.min(col + 1, cols - 1) }); }
      return;
    }
    const mv = (dr: number, dc: number) => { e.preventDefault(); setSel({ r: Math.max(0, Math.min(rows - 1, row + dr)), c: Math.max(0, Math.min(cols - 1, col + dc)) }); };
    if (e.key === "ArrowUp")    mv(-1, 0);
    if (e.key === "ArrowDown")  mv(1, 0);
    if (e.key === "ArrowLeft")  mv(0, -1);
    if (e.key === "ArrowRight") mv(0, 1);
    if (e.key === "Tab")    { e.preventDefault(); mv(0, 1); }
    if (e.key === "Enter")  { e.preventDefault(); setEditing(getRaw(row, col)); setTimeout(() => cellInputRef.current?.focus(), 0); }
    if (e.key === "F2")     { setEditing(getRaw(row, col)); setTimeout(() => cellInputRef.current?.focus(), 0); }
    if (e.key === "Delete" || e.key === "Backspace") setCell(row, col, "");
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      setEditing(e.key);
      setTimeout(() => cellInputRef.current?.focus(), 0);
    }
  }

  useEffect(() => {
    if (sel && editing === null) document.getElementById(`cell-${sel.r}-${sel.c}`)?.focus();
  }, [sel, editing]);

  // ── Context menu ──────────────────────────────────────────────────────────

  function openCtx(e: React.MouseEvent, row: number, col: number) {
    e.preventDefault();
    setSel({ r: row, c: col });
    setCtx({ x: e.clientX, y: e.clientY, row, col });
  }

  useEffect(() => {
    if (!ctx) return;
    const h = () => setCtx(null);
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, [ctx]);

  function insertRow(above: boolean) {
    const targetRow = above ? ctx!.row : ctx!.row + 1;
    const nextCells: Record<string, CellData> = {};
    Object.entries(cells).forEach(([k, v]) => {
      const [r, c] = k.split(",").map(Number);
      if (r >= targetRow) nextCells[`${r + 1},${c}`] = v;
      else nextCells[k] = v;
    });
    const nextRows = Math.max(rows, sheet.rows + 1);
    updateSheet({ cells: nextCells, rows: nextRows });
    setCtx(null);
  }

  function deleteRow() {
    const targetRow = ctx!.row;
    const nextCells: Record<string, CellData> = {};
    Object.entries(cells).forEach(([k, v]) => {
      const [r, c] = k.split(",").map(Number);
      if (r < targetRow) nextCells[k] = v;
      else if (r > targetRow) nextCells[`${r - 1},${c}`] = v;
    });
    updateSheet({ cells: nextCells, rows: Math.max(1, rows - 1) });
    setCtx(null);
  }

  function insertCol(left: boolean) {
    const targetCol = left ? ctx!.col : ctx!.col + 1;
    const nextCells: Record<string, CellData> = {};
    const nextWidths: Record<string, number> = {};
    Object.entries(cells).forEach(([k, v]) => {
      const [r, c] = k.split(",").map(Number);
      if (c >= targetCol) nextCells[`${r},${c + 1}`] = v;
      else nextCells[k] = v;
    });
    Object.entries(sheet.colWidths).forEach(([ci, w]) => {
      const c = Number(ci);
      if (c >= targetCol) nextWidths[String(c + 1)] = w;
      else nextWidths[ci] = w;
    });
    updateSheet({ cells: nextCells, colWidths: nextWidths, cols: cols + 1 });
    setCtx(null);
  }

  function deleteCol() {
    const targetCol = ctx!.col;
    const nextCells: Record<string, CellData> = {};
    const nextWidths: Record<string, number> = {};
    Object.entries(cells).forEach(([k, v]) => {
      const [r, c] = k.split(",").map(Number);
      if (c < targetCol) nextCells[k] = v;
      else if (c > targetCol) nextCells[`${r},${c - 1}`] = v;
    });
    Object.entries(sheet.colWidths).forEach(([ci, w]) => {
      const c = Number(ci);
      if (c < targetCol) nextWidths[ci] = w;
      else if (c > targetCol) nextWidths[String(c - 1)] = w;
    });
    updateSheet({ cells: nextCells, colWidths: nextWidths, cols: Math.max(1, cols - 1) });
    setCtx(null);
  }

  // ── Column resize ──────────────────────────────────────────────────────

  function startResize(e: React.MouseEvent, col: number) {
    e.preventDefault();
    e.stopPropagation();
    const startW = sheet.colWidths[String(col)] ?? DEFAULT_COL_W;
    setResizing({ col, startX: e.clientX, startW });
  }

  useEffect(() => {
    if (!resizing) return;
    const move = (e: MouseEvent) => {
      const w = Math.max(30, resizing.startW + e.clientX - resizing.startX);
      updateSheet({ colWidths: { ...sheet.colWidths, [String(resizing.col)]: w } });
    };
    const up = () => setResizing(null);
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
    return () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resizing]);

  // ── Sheets ────────────────────────────────────────────────────────────

  function addSheet() {
    const n = wb.sheets.length + 1;
    const next = { ...wb, sheets: [...wb.sheets, { ...DEFAULT_SHEET(), name: `Tabelle${n}` }], active: wb.sheets.length };
    setWb(next);
    triggerSave(next);
  }

  function switchSheet(i: number) {
    setWb((prev) => ({ ...prev, active: i }));
    setSel(null); setEditing(null);
  }

  // ── CSV Export ────────────────────────────────────────────────────────

  function exportCsv() {
    const lines: string[] = [];
    for (let rr = 0; rr < rows; rr++) {
      const row: string[] = [];
      for (let cc = 0; cc < cols; cc++) {
        const val = getEval(rr, cc);
        row.push(val.includes(",") || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val);
      }
      lines.push(row.join(","));
    }
    while (lines.length > 0 && lines[lines.length - 1].replace(/,/g, "") === "") lines.pop();
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${title}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  // ── Title ─────────────────────────────────────────────────────────────

  function commitTitle() {
    const val = title.trim() || "Unbenannte Tabelle";
    setTitle(val); setEditTitle(false);
    if (val !== initialTitle) startTr(() => renameSpreadsheet(spreadsheetId, val));
  }

  function handleDelete() {
    if (!confirm(`Tabelle "${title}" wirklich löschen?`)) return;
    startTr(() => deleteSpreadsheet(spreadsheetId));
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  const cellLabel = sel ? `${indexToCol(sel.c)}${sel.r + 1}` : "";
  const fbarValue = editing !== null ? editing : (sel ? getRaw(sel.r, sel.c) : "");
  const selCell   = sel ? getCell(sel.r, sel.c) : undefined;

  // ── Format toolbar helpers ────────────────────────────────────────────────

  const FBtn = ({ active, onClick, title: t, children }: { active?: boolean; onClick: () => void; title?: string; children: React.ReactNode }) => (
    <button type="button" onClick={onClick} title={t}
      className={`grid place-items-center rounded px-1.5 py-0.5 text-xs transition-colors ${active ? "bg-brand/15 text-brand" : "text-gray-600 hover:bg-gray-100"}`}>
      {children}
    </button>
  );

  const NUM_FMTS: { label: string; value: NumFmt }[] = [
    { label: "Standard", value: "general" }, { label: "Zahl", value: "number" },
    { label: "Währung", value: "currency" }, { label: "Prozent", value: "percent" },
    { label: "Datum", value: "date" },
  ];

  const [fmtDrop, setFmtDrop] = useState(false);
  const fmtRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!fmtRef.current?.contains(e.target as Node)) setFmtDrop(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div className="-mx-6 -mb-24 -mt-8 flex h-[calc(100vh-4rem)] flex-col overflow-hidden lg:-mx-10 lg:-mb-10 lg:-mt-10">

      {/* ── Title bar ──────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-3 py-1.5 shadow-sm">
        <Link href="/app/tabellen" className="grid size-8 place-items-center text-gray-400 hover:text-gray-700">
          <ArrowLeft className="size-4" strokeWidth={1.75} />
        </Link>
        <div className="min-w-0 flex-1">
          {editTitle ? (
            <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onBlur={commitTitle}
              onKeyDown={(e) => { if (e.key === "Enter") commitTitle(); if (e.key === "Escape") { setTitle(initialTitle); setEditTitle(false); } }}
              className="w-full border-b border-brand bg-transparent text-sm font-semibold focus:outline-none" />
          ) : (
            <button type="button" onClick={() => setEditTitle(true)} className="truncate text-sm font-semibold hover:text-brand">{title}</button>
          )}
        </div>
        <span className="font-mono text-[10px] text-gray-400">
          {saveStatus === "saving" ? "Speichert…" : saveStatus === "unsaved" ? "●" : "✓"}
        </span>
        <button type="button" onClick={exportCsv} className="grid size-7 place-items-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50" title="CSV exportieren">
          <Download className="size-3.5" strokeWidth={1.75} />
        </button>
        <button type="button" onClick={handleDelete} className="grid size-7 place-items-center rounded border border-gray-200 text-gray-500 hover:text-red-500" title="Löschen">
          <Trash2 className="size-3.5" strokeWidth={1.75} />
        </button>
      </div>

      {/* ── Format toolbar ──────────────────────────────────────────────────── */}
      <div className="flex shrink-0 flex-wrap items-center gap-0.5 border-b border-gray-200 bg-white px-3 py-1">
        <FBtn active={selCell?.bold}   onClick={() => patchSel({ bold:  !selCell?.bold })}  title="Fett"><Bold      className="size-3" /></FBtn>
        <FBtn active={selCell?.italic} onClick={() => patchSel({ italic: !selCell?.italic })} title="Kursiv"><Italic    className="size-3" /></FBtn>
        <FBtn active={selCell?.under}  onClick={() => patchSel({ under:  !selCell?.under })}  title="Unterstreichen"><Underline className="size-3" /></FBtn>
        <div className="mx-1 h-4 w-px bg-gray-200" />
        <FBtn active={selCell?.align === "left"}   onClick={() => patchSel({ align: "left" })}   title="Links"><AlignLeft   className="size-3" /></FBtn>
        <FBtn active={selCell?.align === "center"} onClick={() => patchSel({ align: "center" })} title="Mitte"><AlignCenter className="size-3" /></FBtn>
        <FBtn active={selCell?.align === "right"}  onClick={() => patchSel({ align: "right" })}  title="Rechts"><AlignRight  className="size-3" /></FBtn>
        <div className="mx-1 h-4 w-px bg-gray-200" />
        {/* Text color */}
        <div className="relative flex items-center">
          <span className="mr-1 text-[10px] text-gray-400">A</span>
          <input type="color" value={selCell?.color ?? "#000000"} onChange={(e) => patchSel({ color: e.target.value })}
            className="size-4 cursor-pointer rounded border-0 bg-transparent p-0" title="Textfarbe" />
        </div>
        {/* Fill color */}
        <div className="relative flex items-center">
          <span className="mr-1 text-[10px] text-gray-400">Füllung</span>
          <input type="color" value={selCell?.bg ?? "#ffffff"} onChange={(e) => patchSel({ bg: e.target.value })}
            className="size-4 cursor-pointer rounded border-0 bg-transparent p-0" title="Hintergrundfarbe" />
        </div>
        <div className="mx-1 h-4 w-px bg-gray-200" />
        {/* Borders */}
        {(["bTop", "bRight", "bBottom", "bLeft"] as const).map((b, i) => {
          const labels = ["↑", "→", "↓", "←"];
          return (
            <FBtn key={b} active={selCell?.[b]} onClick={() => patchSel({ [b]: !selCell?.[b] })} title={`Rahmen ${labels[i]}`}>
              <span className="font-mono text-[10px]">{labels[i]}</span>
            </FBtn>
          );
        })}
        <div className="mx-1 h-4 w-px bg-gray-200" />
        {/* Number format */}
        <div ref={fmtRef} className="relative">
          <button type="button" onClick={() => setFmtDrop((v) => !v)}
            className="flex h-6 items-center gap-1 rounded border border-gray-200 px-2 text-[10px] text-gray-600 hover:bg-gray-50">
            {NUM_FMTS.find((f) => f.value === selCell?.fmt)?.label ?? "Standard"} <ChevronDown className="size-2.5" />
          </button>
          {fmtDrop && (
            <div className="absolute top-full left-0 z-50 mt-1 min-w-28 rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
              {NUM_FMTS.map((f) => (
                <button key={f.value} type="button" onClick={() => { patchSel({ fmt: f.value }); setFmtDrop(false); }}
                  className={`w-full px-3 py-1 text-left text-[10px] hover:bg-gray-50 ${selCell?.fmt === f.value ? "font-semibold text-brand" : ""}`}>
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Formula bar ──────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-2 py-0.5">
        <div className="grid h-6 w-14 shrink-0 place-items-center border border-gray-200 bg-gray-50 font-mono text-[10px] font-semibold text-gray-500">
          {cellLabel}
        </div>
        <div className="h-5 w-px bg-gray-200" />
        <input
          ref={fbarRef}
          value={fbarValue}
          onChange={(e) => { if (sel) setEditing(e.target.value); }}
          onFocus={() => { if (sel && editing === null) setEditing(getRaw(sel.r, sel.c)); }}
          onBlur={() => { if (editing !== null && sel) commitEdit(); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitEdit(); } if (e.key === "Escape") setEditing(null); }}
          placeholder="Wert oder =Formel eingeben"
          className="flex-1 bg-transparent font-mono text-xs focus:outline-none text-gray-800 placeholder:text-gray-300"
        />
      </div>

      {/* ── Grid ─────────────────────────────────────────────────────────────── */}
      <div ref={containerRef} className="flex-1 overflow-auto bg-white">
        <table className="border-collapse" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: ROW_NUM_W }} />
            {Array.from({ length: cols }, (_, c) => (
              <col key={c} style={{ width: sheet.colWidths[String(c)] ?? DEFAULT_COL_W }} />
            ))}
          </colgroup>
          <thead>
            <tr style={{ height: HDR_H }}>
              <th className="sticky left-0 border border-gray-200 bg-gray-50 text-[10px] text-gray-400 z-20" />
              {Array.from({ length: cols }, (_, c) => (
                <th key={c} className="relative border border-gray-200 bg-gray-50 text-center text-[11px] font-semibold text-gray-500 select-none z-10"
                  style={{ backgroundColor: sel?.c === c ? "#e8f0fe" : undefined }}>
                  {indexToCol(c)}
                  {/* resize handle */}
                  <span
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize opacity-0 hover:opacity-100 bg-brand"
                    onMouseDown={(e) => startResize(e, c)}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, rr) => (
              <tr key={rr} style={{ height: ROW_H }}>
                <td className="sticky left-0 z-10 border border-gray-200 bg-gray-50 text-center text-[10px] font-semibold text-gray-400 select-none"
                  style={{ backgroundColor: sel?.r === rr ? "#e8f0fe" : undefined }}>
                  {rr + 1}
                </td>
                {Array.from({ length: cols }, (_, cc) => {
                  const k = key(rr, cc);
                  const isSel = sel?.r === rr && sel?.c === cc;
                  const isEd  = isSel && editing !== null;
                  const cellDef = cells[k];
                  const raw     = cellDef?.v ?? "";
                  const evaluated = raw.startsWith("=") ? evaluateCell(k, cells) : raw;
                  const display   = formatDisplay(raw, evaluated, cellDef?.fmt);
                  const isErr     = display === "#ERR" || display === "#LOOP";
                  const isFormula = raw.startsWith("=");
                  const numVal    = !raw.startsWith("=") && !isNaN(Number(raw)) && raw !== "";
                  const borderStyle = {
                    borderTopWidth:    cellDef?.bTop    ? "2px" : undefined,
                    borderRightWidth:  cellDef?.bRight  ? "2px" : undefined,
                    borderBottomWidth: cellDef?.bBottom ? "2px" : undefined,
                    borderLeftWidth:   cellDef?.bLeft   ? "2px" : undefined,
                    borderTopColor:    cellDef?.bTop    ? "#374151" : undefined,
                    borderRightColor:  cellDef?.bRight  ? "#374151" : undefined,
                    borderBottomColor: cellDef?.bBottom ? "#374151" : undefined,
                    borderLeftColor:   cellDef?.bLeft   ? "#374151" : undefined,
                  };
                  return (
                    <td
                      key={cc}
                      id={`cell-${rr}-${cc}`}
                      tabIndex={0}
                      onFocus={() => { if (!isSel) setSel({ r: rr, c: cc }); }}
                      onClick={() => { if (!isSel) { setSel({ r: rr, c: cc }); setEditing(null); } }}
                      onDoubleClick={() => { setEditing(raw); setTimeout(() => cellInputRef.current?.focus(), 0); }}
                      onKeyDown={(e) => handleCellKey(e, rr, cc)}
                      onContextMenu={(e) => openCtx(e, rr, cc)}
                      className="relative border border-gray-200 focus:outline-none cursor-default select-none overflow-hidden"
                      style={{
                        backgroundColor: isSel ? "#e8f0fe" : (cellDef?.bg && cellDef.bg !== "#ffffff" ? cellDef.bg : undefined),
                        color: isErr ? "#ef4444" : (cellDef?.color ?? (isFormula ? "#1d4ed8" : "#1a1a1a")),
                        fontWeight: cellDef?.bold ? "bold" : undefined,
                        fontStyle: cellDef?.italic ? "italic" : undefined,
                        textDecoration: cellDef?.under ? "underline" : undefined,
                        textAlign: cellDef?.align ?? (numVal ? "right" : "left"),
                        fontSize: 12,
                        ...borderStyle,
                        ...(isSel ? { outline: "2px solid #14b8a6", outlineOffset: "-1px" } : {}),
                      }}
                    >
                      {isEd ? (
                        <input
                          ref={cellInputRef}
                          value={editing}
                          onChange={(e) => setEditing(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); commitEdit(); setSel({ r: Math.min(rr + 1, rows - 1), c: cc }); }
                            if (e.key === "Escape") setEditing(null);
                            if (e.key === "Tab") { e.preventDefault(); commitEdit(); setSel({ r: rr, c: Math.min(cc + 1, cols - 1) }); }
                          }}
                          className="absolute inset-0 w-full bg-white px-1 font-mono text-[12px] focus:outline-none border-0 z-10"
                          autoFocus
                        />
                      ) : (
                        <span className="block truncate px-1">{display}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Sheet tabs ────────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center border-t border-gray-200 bg-gray-50">
        <div className="flex flex-1 items-end gap-0 overflow-x-auto">
          {wb.sheets.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => switchSheet(i)}
              onDoubleClick={() => {
                const name = prompt("Tabellenname:", s.name);
                if (name) {
                  const sheets = wb.sheets.map((sh, j) => j === i ? { ...sh, name } : sh);
                  const next = { ...wb, sheets };
                  setWb(next); triggerSave(next);
                }
              }}
              className={`flex items-center gap-1.5 border-r border-gray-200 px-4 py-1.5 text-[11px] transition-colors whitespace-nowrap
                ${i === wb.active ? "bg-white font-semibold text-brand border-t-2 border-t-brand" : "text-gray-500 hover:bg-white hover:text-gray-800"}`}
            >
              {s.name}
            </button>
          ))}
        </div>
        <button type="button" onClick={addSheet} className="grid size-8 shrink-0 place-items-center text-gray-400 hover:text-brand" title="Neue Tabelle">
          <Plus className="size-3.5" strokeWidth={2} />
        </button>
        <div className="px-3 font-mono text-[10px] text-gray-400">
          {saveStatus === "saving" ? "Speichert…" : saveStatus === "unsaved" ? "●" : cols + " Sp · " + rows + " Z"}
        </div>
      </div>

      {/* ── Context menu ──────────────────────────────────────────────────────── */}
      {ctx && (
        <div
          className="fixed z-999 min-w-40 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-2xl"
          style={{ top: ctx.y, left: ctx.x }}
        >
          {[
            { label: "Zeile darüber einfügen", action: () => insertRow(true) },
            { label: "Zeile darunter einfügen", action: () => insertRow(false) },
            { label: "Zeile löschen", action: deleteRow },
            { label: "—", action: null },
            { label: "Spalte links einfügen", action: () => insertCol(true) },
            { label: "Spalte rechts einfügen", action: () => insertCol(false) },
            { label: "Spalte löschen", action: deleteCol },
          ].map((item, i) =>
            item.action === null ? (
              <div key={i} className="my-0.5 h-px bg-gray-100" />
            ) : (
              <button key={i} type="button" onClick={item.action}
                className="w-full px-4 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50">
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
