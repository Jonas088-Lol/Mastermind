"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { ArrowLeft, Download, Trash2 } from "lucide-react";
import Link from "next/link";
import { saveSpreadsheetData, renameSpreadsheet, deleteSpreadsheet } from "../actions";

// ── Types ──────────────────────────────────────────────────────────────────

interface CellData {
  v: string;
}

interface SheetData {
  cols: number;
  rows: number;
  cells: Record<string, CellData>;
  colWidths: Record<string, number>;
}

function parseData(json: string): SheetData {
  try {
    const d = JSON.parse(json) as Partial<SheetData>;
    return {
      cols: d.cols ?? 10,
      rows: d.rows ?? 30,
      cells: d.cells ?? {},
      colWidths: d.colWidths ?? {},
    };
  } catch {
    return { cols: 10, rows: 30, cells: {}, colWidths: {} };
  }
}

// ── Formula evaluation ─────────────────────────────────────────────────────

function colToIndex(col: string): number {
  let idx = 0;
  for (const ch of col.toUpperCase()) {
    idx = idx * 26 + (ch.charCodeAt(0) - 64);
  }
  return idx - 1;
}

function indexToCol(idx: number): string {
  let col = "";
  let n = idx + 1;
  while (n > 0) {
    n--;
    col = String.fromCharCode(65 + (n % 26)) + col;
    n = Math.floor(n / 26);
  }
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
  for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) {
    for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) {
      keys.push(`${r},${c}`);
    }
  }
  return keys;
}

function evaluateCell(key: string, cells: Record<string, CellData>, depth = 0): string {
  if (depth > 50) return "#LOOP";
  const cell = cells[key];
  if (!cell?.v) return "";
  const v = cell.v;
  if (!v.startsWith("=")) return v;

  const expr = v.slice(1).toUpperCase().trim();

  // SUM / AVERAGE / MIN / MAX / COUNT with range A1:B3
  const fnMatch = expr.match(/^(SUM|AVERAGE|MIN|MAX|COUNT)\(([A-Z]+\d+):([A-Z]+\d+)\)$/);
  if (fnMatch) {
    const [, fn, from, to] = fnMatch;
    const keys = getRangeKeys(from, to);
    const nums = keys
      .map((k) => evaluateCell(k, cells, depth + 1))
      .map(Number)
      .filter((n) => !isNaN(n));
    if (fn === "SUM") return String(round(nums.reduce((a, b) => a + b, 0)));
    if (fn === "AVERAGE") return nums.length > 0 ? String(round(nums.reduce((a, b) => a + b, 0) / nums.length)) : "0";
    if (fn === "MIN") return nums.length > 0 ? String(Math.min(...nums)) : "0";
    if (fn === "MAX") return nums.length > 0 ? String(Math.max(...nums)) : "0";
    if (fn === "COUNT") return String(nums.length);
  }

  // Replace cell references with numeric values
  const resolved = expr.replace(/[A-Z]+\d+/g, (ref) => {
    const val = evaluateCell(cellRefToKey(ref), cells, depth + 1);
    const num = Number(val);
    return isNaN(num) ? "0" : String(num);
  });

  try {
    // eslint-disable-next-line no-new-func
    const result = new Function(`return (${resolved})`)() as unknown;
    if (typeof result === "number") return String(round(result));
    return String(result);
  } catch {
    return "#ERR";
  }
}

function round(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

// ── Component ─────────────────────────────────────────────────────────────

interface Props {
  spreadsheetId: string;
  initialTitle: string;
  initialData: string;
}

const DEFAULT_COL_WIDTH = 100;
const ROW_HEIGHT = 24;
const HEADER_HEIGHT = 26;
const ROW_NUM_WIDTH = 48;

export function SpreadsheetEditor({ spreadsheetId, initialTitle, initialData }: Props) {
  const [data, setData] = useState<SheetData>(() => parseData(initialData));
  const [title, setTitle] = useState(initialTitle);
  const [editingTitle, setEditingTitle] = useState(false);
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  const [editing, setEditing] = useState<string | null>(null); // raw formula in input
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [, startTransition] = useTransition();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const formulaInputRef = useRef<HTMLInputElement>(null);

  const { cols, rows, cells } = data;

  // ── Save ──────────────────────────────────────────────────────────────

  const triggerSave = useCallback((next: SheetData) => {
    setSaveStatus("unsaved");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSaveStatus("saving");
      startTransition(async () => {
        await saveSpreadsheetData(spreadsheetId, JSON.stringify(next));
        setSaveStatus("saved");
      });
    }, 800);
  }, [spreadsheetId]);

  // ── Cell helpers ──────────────────────────────────────────────────────

  function cellKey(row: number, col: number) {
    return `${row},${col}`;
  }

  function getDisplay(row: number, col: number): string {
    const key = cellKey(row, col);
    const cell = cells[key];
    if (!cell?.v) return "";
    if (cell.v.startsWith("=")) return evaluateCell(key, cells);
    return cell.v;
  }

  function getRaw(row: number, col: number): string {
    return cells[cellKey(row, col)]?.v ?? "";
  }

  function setCell(row: number, col: number, value: string) {
    setData((prev) => {
      const key = cellKey(row, col);
      const nextCells = { ...prev.cells };
      if (value === "") {
        delete nextCells[key];
      } else {
        nextCells[key] = { v: value };
      }
      const next = { ...prev, cells: nextCells };
      triggerSave(next);
      return next;
    });
  }

  // ── Keyboard navigation ───────────────────────────────────────────────

  function commitEdit() {
    if (editing !== null && selected) {
      setCell(selected.row, selected.col, editing);
    }
    setEditing(null);
  }

  function handleCellKeyDown(e: React.KeyboardEvent, row: number, col: number) {
    if (editing !== null) {
      if (e.key === "Enter") { e.preventDefault(); commitEdit(); setSelected({ row: Math.min(row + 1, rows - 1), col }); }
      if (e.key === "Escape") { setEditing(null); }
      if (e.key === "Tab") { e.preventDefault(); commitEdit(); setSelected({ row, col: Math.min(col + 1, cols - 1) }); }
      return;
    }
    const move = (dr: number, dc: number) => {
      e.preventDefault();
      setSelected({ row: Math.max(0, Math.min(rows - 1, row + dr)), col: Math.max(0, Math.min(cols - 1, col + dc)) });
    };
    if (e.key === "ArrowUp") move(-1, 0);
    if (e.key === "ArrowDown") move(1, 0);
    if (e.key === "ArrowLeft") move(0, -1);
    if (e.key === "ArrowRight") move(0, 1);
    if (e.key === "Tab") { e.preventDefault(); move(0, 1); }
    if (e.key === "Enter") { e.preventDefault(); setEditing(getRaw(row, col)); setTimeout(() => inputRef.current?.focus(), 0); }
    if (e.key === "Delete" || e.key === "Backspace") { setCell(row, col, ""); }
    if (e.key === "F2") { setEditing(getRaw(row, col)); setTimeout(() => inputRef.current?.focus(), 0); }
    // Start typing to enter edit mode
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      setEditing(e.key);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  // Focus cell on selection change
  useEffect(() => {
    if (selected && editing === null) {
      document.getElementById(`cell-${selected.row}-${selected.col}`)?.focus();
    }
  }, [selected, editing]);

  // ── CSV Export ───────────────────────────────────────────────────────

  function exportCsv() {
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) {
      const row: string[] = [];
      for (let c = 0; c < cols; c++) {
        const val = getDisplay(r, c);
        row.push(val.includes(",") || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val);
      }
      lines.push(row.join(","));
    }
    // Trim trailing empty rows
    while (lines.length > 0 && lines[lines.length - 1].replace(/,/g, "") === "") lines.pop();
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Title ─────────────────────────────────────────────────────────────

  function commitTitleRename() {
    const val = title.trim() || "Unbenannte Tabelle";
    setTitle(val);
    setEditingTitle(false);
    if (val !== initialTitle) startTransition(() => renameSpreadsheet(spreadsheetId, val));
  }

  function handleDelete() {
    if (!confirm(`Tabelle "${title}" wirklich löschen?`)) return;
    startTransition(() => deleteSpreadsheet(spreadsheetId));
  }

  // ── Ref cell label ────────────────────────────────────────────────────

  const cellLabel = selected ? `${indexToCol(selected.col)}${selected.row + 1}` : "";
  const formulaBarValue = editing !== null ? editing : (selected ? getRaw(selected.row, selected.col) : "");

  return (
    <div className="-mx-6 -mb-24 -mt-8 flex h-[calc(100vh-4rem)] flex-col overflow-hidden lg:-mx-10 lg:-mb-10 lg:-mt-10">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-bg px-4 py-2">
        <Link href="/app/tabellen" className="grid size-8 place-items-center text-muted-fg hover:text-fg">
          <ArrowLeft className="size-4" strokeWidth={1.75} />
        </Link>

        <div className="min-w-0 flex-1">
          {editingTitle ? (
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={commitTitleRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitTitleRename();
                if (e.key === "Escape") { setTitle(initialTitle); setEditingTitle(false); }
              }}
              className="w-full border-b border-brand bg-transparent text-sm font-semibold focus:outline-none"
            />
          ) : (
            <button type="button" onClick={() => setEditingTitle(true)} className="truncate text-sm font-semibold hover:text-brand">
              {title}
            </button>
          )}
        </div>

        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-fg">
          {saveStatus === "saving" ? "Speichert…" : saveStatus === "unsaved" ? "Ungespeichert" : "Gespeichert ✓"}
        </span>

        <button type="button" onClick={exportCsv} className="grid size-8 place-items-center border border-border text-muted-fg hover:text-brand" title="Als CSV exportieren">
          <Download className="size-3.5" strokeWidth={1.75} />
        </button>
        <button type="button" onClick={handleDelete} className="grid size-8 place-items-center border border-border text-muted-fg hover:text-danger" title="Tabelle löschen">
          <Trash2 className="size-3.5" strokeWidth={1.75} />
        </button>
      </div>

      {/* Formula bar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-bg px-2 py-1">
        <div className="grid h-7 w-16 shrink-0 place-items-center border border-border bg-surface font-mono text-xs font-semibold text-muted-fg">
          {cellLabel}
        </div>
        <div className="h-7 w-px bg-border" />
        <input
          ref={formulaInputRef}
          value={formulaBarValue}
          onChange={(e) => {
            if (selected) {
              setEditing(e.target.value);
            }
          }}
          onFocus={() => {
            if (selected && editing === null) setEditing(getRaw(selected.row, selected.col));
          }}
          onBlur={() => { if (editing !== null && selected) { commitEdit(); } }}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commitEdit(); }
            if (e.key === "Escape") { setEditing(null); }
          }}
          placeholder="Wert oder =Formel eingeben"
          className="flex-1 bg-transparent text-xs font-mono focus:outline-none text-fg placeholder:text-muted-fg/50"
        />
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto bg-white">
        <table className="border-collapse" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: ROW_NUM_WIDTH }} />
            {Array.from({ length: cols }, (_, c) => (
              <col key={c} style={{ width: data.colWidths[String(c)] ?? DEFAULT_COL_WIDTH }} />
            ))}
          </colgroup>
          <thead>
            <tr style={{ height: HEADER_HEIGHT }}>
              {/* corner */}
              <th className="border border-gray-200 bg-gray-50 text-[10px] text-gray-400" />
              {Array.from({ length: cols }, (_, c) => (
                <th
                  key={c}
                  className="border border-gray-200 bg-gray-50 text-center text-[11px] font-semibold text-gray-500"
                >
                  {indexToCol(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, r) => (
              <tr key={r} style={{ height: ROW_HEIGHT }}>
                {/* Row number */}
                <td className="border border-gray-200 bg-gray-50 text-center text-[10px] font-semibold text-gray-400 select-none">
                  {r + 1}
                </td>
                {Array.from({ length: cols }, (_, c) => {
                  const key = cellKey(r, c);
                  const isSelected = selected?.row === r && selected?.col === c;
                  const isEditing = isSelected && editing !== null;
                  const display = getDisplay(r, c);
                  const raw = getRaw(r, c);
                  const isFormula = raw.startsWith("=");
                  const isError = display === "#ERR" || display === "#LOOP";

                  return (
                    <td
                      key={c}
                      id={`cell-${r}-${c}`}
                      tabIndex={0}
                      onFocus={() => { if (!isSelected) setSelected({ row: r, col: c }); }}
                      onClick={() => setSelected({ row: r, col: c })}
                      onDoubleClick={() => { setEditing(raw); setTimeout(() => inputRef.current?.focus(), 0); }}
                      onKeyDown={(e) => handleCellKeyDown(e, r, c)}
                      className={`relative border border-gray-200 px-1 text-[12px] focus:outline-none cursor-default select-none
                        ${isSelected ? "border-brand ring-1 ring-inset ring-brand bg-brand/3" : "hover:bg-gray-50"}
                        ${isError ? "text-red-500" : isFormula ? "text-blue-700" : "text-gray-800"}
                      `}
                    >
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          value={editing}
                          onChange={(e) => setEditing(e.target.value)}
                          onBlur={() => { commitEdit(); }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); commitEdit(); setSelected({ row: Math.min(r + 1, rows - 1), col: c }); }
                            if (e.key === "Escape") { setEditing(null); }
                            if (e.key === "Tab") { e.preventDefault(); commitEdit(); setSelected({ row: r, col: Math.min(c + 1, cols - 1) }); }
                          }}
                          className="absolute inset-0 w-full bg-white px-1 font-mono text-[12px] focus:outline-none border border-brand z-10"
                          autoFocus
                        />
                      ) : (
                        <span className="block truncate">{display}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Status bar */}
      <div className="flex shrink-0 items-center gap-4 border-t border-border bg-surface px-4 py-1 text-[10px] text-muted-fg">
        <span>Formeln: =SUM(A1:B3), =AVERAGE, =MIN, =MAX, =COUNT</span>
        <span className="ml-auto">
          {cols} Spalten · {rows} Zeilen
        </span>
      </div>
    </div>
  );
}
