"use client";

import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { Bold, Italic, Underline, Highlighter, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { nanoid, cn } from "@/lib/utils";
import { evaluateExpression } from "@/lib/math/evaluate";

// ── Inline formatting toolbar ──────────────────────────────────────
function FormatToolbar() {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    function onSelect() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setShow(false);
        return;
      }
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0) { setShow(false); return; }
      setPos({ top: rect.top + window.scrollY - 44, left: rect.left + rect.width / 2 });
      setShow(true);
    }
    document.addEventListener("selectionchange", onSelect);
    return () => document.removeEventListener("selectionchange", onSelect);
  }, []);

  function exec(cmd: string, value?: string) {
    document.execCommand(cmd, false, value);
  }

  if (!show || !pos) return null;

  return (
    <div
      className="fixed z-50 flex items-center gap-0.5 border border-border bg-bg shadow-lg"
      style={{ top: pos.top, left: pos.left, transform: "translateX(-50%)" }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {[
        { icon: Bold,        cmd: "bold",           title: "Fett (Ctrl+B)" },
        { icon: Italic,      cmd: "italic",         title: "Kursiv (Ctrl+I)" },
        { icon: Underline,   cmd: "underline",      title: "Unterstrichen (Ctrl+U)" },
      ].map(({ icon: Icon, cmd, title }) => (
        <button key={cmd} type="button" title={title} onMouseDown={() => exec(cmd)}
          className="grid size-8 place-items-center text-muted-fg hover:bg-surface hover:text-fg">
          <Icon className="size-3.5" strokeWidth={2} />
        </button>
      ))}
      <div className="h-5 w-px bg-border" />
      {[
        { color: "#fef08a", label: "Gelb" },
        { color: "#bbf7d0", label: "Grün" },
        { color: "#fecaca", label: "Rot" },
        { color: "#bfdbfe", label: "Blau" },
      ].map((h) => (
        <button key={h.color} type="button" title={`Markieren: ${h.label}`}
          onMouseDown={() => exec("hiliteColor", h.color)}
          className="grid size-8 place-items-center hover:bg-surface"
        >
          <span className="size-3.5 rounded-sm border border-border/40" style={{ backgroundColor: h.color }} />
        </button>
      ))}
      <div className="h-5 w-px bg-border" />
      {[
        { icon: AlignLeft,   cmd: "justifyLeft",   title: "Links" },
        { icon: AlignCenter, cmd: "justifyCenter", title: "Mitte" },
        { icon: AlignRight,  cmd: "justifyRight",  title: "Rechts" },
      ].map(({ icon: Icon, cmd, title }) => (
        <button key={cmd} type="button" title={title} onMouseDown={() => exec(cmd)}
          className="grid size-8 place-items-center text-muted-fg hover:bg-surface hover:text-fg">
          <Icon className="size-3.5" strokeWidth={2} />
        </button>
      ))}
    </div>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────

export type BlockType =
  | "h1"
  | "h2"
  | "h3"
  | "p"
  | "bullet"
  | "numbered"
  | "code"
  | "quote"
  | "divider"
  | "math"
  | "table";

export type Block = {
  id: string;
  type: BlockType;
  content: string;
};

// ── Block menu items ────────────────────────────────────────────────────────

const BLOCK_MENU: { type: BlockType; label: string; shortcut: string; icon: string }[] = [
  { type: "h1",       label: "Überschrift 1",  shortcut: "#",   icon: "H1" },
  { type: "h2",       label: "Überschrift 2",  shortcut: "##",  icon: "H2" },
  { type: "h3",       label: "Überschrift 3",  shortcut: "###", icon: "H3" },
  { type: "p",        label: "Text",           shortcut: "",    icon: "¶"  },
  { type: "bullet",   label: "Aufzählung",     shortcut: "-",   icon: "•"  },
  { type: "numbered", label: "Nummeriert",     shortcut: "1.",  icon: "1." },
  { type: "quote",    label: "Zitat",          shortcut: ">",   icon: "❝"  },
  { type: "code",     label: "Code",           shortcut: "```", icon: "<>" },
  { type: "math",     label: "Formel (LaTeX)", shortcut: "$$",  icon: "∑"  },
  { type: "divider",  label: "Trennlinie",     shortcut: "---", icon: "─"  },
  { type: "table",    label: "Tabelle",        shortcut: "",    icon: "⊞"  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeBlock(type: BlockType = "p", content = ""): Block {
  return { id: nanoid(), type, content };
}

function parseBlocks(json: string): Block[] {
  try {
    const arr = JSON.parse(json) as unknown[];
    if (!Array.isArray(arr) || arr.length === 0) return [makeBlock()];
    return arr.map((b) => {
      const block = b as Record<string, string>;
      return { id: block.id ?? nanoid(), type: (block.type as BlockType) ?? "p", content: block.content ?? "" };
    });
  } catch {
    return [makeBlock()];
  }
}

// ── KaTeX renderer (lazy, client-only) ─────────────────────────────────────

function KaTeXBlock({ latex }: { latex: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    import("katex").then((k) => {
      try {
        ref.current!.innerHTML = k.default.renderToString(latex || "\\text{Formel eingeben…}", {
          throwOnError: false,
          displayMode: true,
        });
      } catch {
        ref.current!.textContent = latex;
      }
    });
  }, [latex]);

  return <div ref={ref} className="py-1 overflow-x-auto text-center" />;
}

// ── Single block renderer ───────────────────────────────────────────────────

interface BlockRowProps {
  block: Block;
  index: number;
  isOnly: boolean;
  onUpdate: (id: string, content: string) => void;
  onChangeType: (id: string, type: BlockType) => void;
  onEnter: (id: string) => void;
  onDelete: (id: string) => void;
  onArrowUp: (id: string) => void;
  onArrowDown: (id: string) => void;
  onSlash: (id: string) => void;
  focusRef: React.MutableRefObject<Map<string, HTMLElement>>;
}

function BlockRow({
  block,
  index,
  isOnly,
  onUpdate,
  onChangeType,
  onEnter,
  onDelete,
  onArrowUp,
  onArrowDown,
  onSlash,
  focusRef,
}: BlockRowProps) {
  const elRef = useRef<HTMLElement>(null);
  const mathInputRef = useRef<HTMLTextAreaElement>(null);
  const [calcResult, setCalcResult] = useState<{ ok: boolean; text: string } | null>(null);

  // Register in parent's focus map
  useEffect(() => {
    if (elRef.current) focusRef.current.set(block.id, elRef.current);
    if (mathInputRef.current) focusRef.current.set(block.id, mathInputRef.current);
    return () => { focusRef.current.delete(block.id); };
  });

  // Initialize DOM content only on mount / when block id changes.
  // We must NOT let React re-set textContent on every state update — that
  // moves the cursor to position 0, causing characters to appear in reverse.
  useEffect(() => {
    if (elRef.current && elRef.current.isContentEditable) {
      elRef.current.textContent = block.content;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.id]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey && block.type !== "code") {
      e.preventDefault();
      onEnter(block.id);
    }
    if (e.key === "Backspace") {
      const el = e.currentTarget as HTMLElement;
      const txt = el.textContent ?? "";
      if (txt === "" && !isOnly) {
        e.preventDefault();
        onDelete(block.id);
      }
    }
    if (e.key === "ArrowUp") onArrowUp(block.id);
    if (e.key === "ArrowDown") onArrowDown(block.id);
    // Markdown shortcuts
    if (e.key === " ") {
      const el = e.currentTarget as HTMLElement;
      const txt = (el.textContent ?? "").trimEnd();
      const typeMap: Record<string, BlockType> = {
        "#": "h1", "##": "h2", "###": "h3",
        "-": "bullet", "*": "bullet",
        "1.": "numbered", ">": "quote",
        "```": "code", "$$": "math", "---": "divider",
      };
      if (typeMap[txt]) {
        e.preventDefault();
        el.textContent = "";
        onUpdate(block.id, "");
        onChangeType(block.id, typeMap[txt]);
      }
    }
    // slash command
    if (e.key === "/") {
      const el = e.currentTarget as HTMLElement;
      if ((el.textContent ?? "") === "") {
        e.preventDefault();
        onSlash(block.id);
      }
    }
  }

  function handleInput(e: React.FormEvent<HTMLElement>) {
    onUpdate(block.id, e.currentTarget.textContent ?? "");
  }

  // Divider
  if (block.type === "divider") {
    return (
      <div className="relative group py-3 flex items-center gap-3">
        <hr className="flex-1 border-border" />
        <button
          type="button"
          onClick={() => onDelete(block.id)}
          className="absolute right-0 hidden group-hover:flex size-5 items-center justify-center text-muted-fg hover:text-danger"
        >
          ×
        </button>
      </div>
    );
  }

  // Math block
  if (block.type === "math") {
    function handleCalc() {
      const r = evaluateExpression(block.content);
      if (r.ok) {
        setCalcResult({ ok: true, text: r.value.toLocaleString("de-DE", { maximumFractionDigits: 10 }) });
      } else {
        setCalcResult({ ok: false, text: r.error });
      }
    }
    return (
      <div className="group relative rounded border border-border bg-surface p-3 my-1">
        <KaTeXBlock latex={block.content} />
        <textarea
          ref={mathInputRef as React.RefObject<HTMLTextAreaElement>}
          value={block.content}
          onChange={(e) => { onUpdate(block.id, e.target.value); setCalcResult(null); }}
          onKeyDown={(e) => {
            if (e.key === "Escape") onArrowDown(block.id);
          }}
          placeholder="LaTeX oder Rechnung, z.B. 2+3*4 oder \frac{10}{2}"
          rows={2}
          className="mt-2 w-full resize-none border-0 border-t border-border bg-transparent pt-2 font-mono text-xs text-muted-fg focus:outline-none focus:ring-0 placeholder:text-muted-fg/50"
        />
        <div className="mt-2 flex items-center gap-2 border-t border-border pt-2">
          <button
            type="button"
            onClick={handleCalc}
            className="rounded bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand transition-colors hover:bg-brand/20"
          >
            = Ausrechnen
          </button>
          {calcResult && (
            <span
              className={cn(
                "font-mono text-xs",
                calcResult.ok ? "font-bold text-success" : "text-danger"
              )}
            >
              {calcResult.ok ? `= ${calcResult.text}` : calcResult.text}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Table block
  if (block.type === "table") {
    let rows: string[][] = [["", ""], ["", ""]];
    try { rows = JSON.parse(block.content) as string[][]; } catch { /* use default */ }
    if (!Array.isArray(rows) || rows.length === 0) rows = [["Spalte 1","Spalte 2"],["",""]];

    function updateCell(r: number, c: number, val: string) {
      const next = rows.map(row => [...row]);
      next[r][c] = val;
      onUpdate(block.id, JSON.stringify(next));
    }
    function addRow() {
      const next = [...rows, new Array(rows[0].length).fill("")];
      onUpdate(block.id, JSON.stringify(next));
    }
    function addCol() {
      const next = rows.map(row => [...row, ""]);
      onUpdate(block.id, JSON.stringify(next));
    }

    return (
      <div className="group my-3 overflow-x-auto">
        <table className="w-full border-collapse border border-gray-200 text-[14px]">
          <tbody>
            {rows.map((row, r) => (
              <tr key={r} className={r === 0 ? "bg-gray-50" : ""}>
                {row.map((cell, c) => (
                  <td key={c} className="border border-gray-200 p-0">
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => updateCell(r, c, e.currentTarget.textContent ?? "")}
                      className={`min-h-[2em] px-3 py-1.5 focus:outline-none focus:bg-blue-50 ${r === 0 ? "font-semibold" : ""}`}
                    >
                      {cell}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-1 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button type="button" onClick={addRow} className="text-[11px] text-muted-fg hover:text-brand">+ Zeile</button>
          <button type="button" onClick={addCol} className="text-[11px] text-muted-fg hover:text-brand">+ Spalte</button>
        </div>
      </div>
    );
  }

  // Code block
  if (block.type === "code") {
    return (
      <pre className="group relative my-3">
        <code
          ref={elRef as React.RefObject<HTMLElement>}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          className="block w-full border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-[13px] text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      </pre>
    );
  }

  // A4/Word-optimised type styles
  const typeClass: Record<BlockType, string> = {
    h1:       "text-[26px] font-bold tracking-tight mt-8 mb-3 leading-tight text-[#1a1a1a]",
    h2:       "text-[20px] font-bold mt-6 mb-2 leading-snug text-[#1a1a1a]",
    h3:       "text-[16px] font-semibold mt-5 mb-1 text-[#1a1a1a]",
    p:        "text-[15px] leading-[1.8] text-[#1a1a1a]",
    bullet:   "text-[15px] leading-[1.8] pl-6 before:content-['•'] before:absolute before:left-0 before:text-gray-500 relative text-[#1a1a1a]",
    numbered: `text-[15px] leading-[1.8] pl-7 before:content-['${index + 1}.'] before:absolute before:left-0 before:text-gray-500 relative text-[#1a1a1a]`,
    quote:    "text-[15px] leading-[1.8] italic border-l-4 border-gray-300 pl-5 text-gray-600",
    code:     "font-mono text-[13px]",
    divider:  "",
    math:     "",
    table:    "",
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const el = elRef as React.RefObject<any>;

  return (
    <div
      ref={el}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      data-placeholder={block.content === "" ? getPlaceholder(block.type) : undefined}
      className={`min-h-[1.5em] focus:outline-none caret-brand empty:before:content-[attr(data-placeholder)] empty:before:text-muted-fg/50 ${typeClass[block.type]}`}
    />
  );
}

// Memoisiert: Beim Tippen ändert sich nur der bearbeitete Block — ohne memo
// rendert jeder Tastendruck ALLE Blöcke neu, was lange Seiten spürbar ausbremst.
const MemoBlockRow = memo(BlockRow);

function getPlaceholder(type: BlockType): string {
  const map: Record<BlockType, string> = {
    h1: "Überschrift eingeben…",
    h2: "Zwischenüberschrift…",
    h3: "Kleiner Titel…",
    p: "Tippe hier oder / für Formatierungen…",
    bullet: "Aufzählungspunkt…",
    numbered: "Schritt…",
    quote: "Zitat eingeben…",
    code: "// Code hier eingeben",
    divider: "",
    math: "",
    table: "",
  };
  return map[type] ?? "";
}

// ── Symbol palette ──────────────────────────────────────────────────────────

const MATH_SYMBOLS = [
  { sym: "\\frac{a}{b}", label: "Bruch" },
  { sym: "\\sqrt{x}", label: "Wurzel" },
  { sym: "x^{2}", label: "Potenz" },
  { sym: "\\sum_{i=0}^{n}", label: "Summe" },
  { sym: "\\int_{a}^{b}", label: "Integral" },
  { sym: "\\pi", label: "Pi" },
  { sym: "\\infty", label: "∞" },
  { sym: "\\leq", label: "≤" },
  { sym: "\\geq", label: "≥" },
  { sym: "\\neq", label: "≠" },
  { sym: "\\approx", label: "≈" },
  { sym: "\\vec{a}", label: "Vektor" },
  { sym: "\\alpha", label: "α" },
  { sym: "\\beta", label: "β" },
  { sym: "\\Delta", label: "Δ" },
  { sym: "\\cdot", label: "·" },
];

// ── Main Editor ─────────────────────────────────────────────────────────────

interface BlockEditorProps {
  pageId: string;
  initialContent: string;
  onSave: (pageId: string, content: string) => Promise<void>;
  className?: string;
}

export function BlockEditor({ pageId, initialContent, onSave, className = "" }: BlockEditorProps) {
  const [blocks, setBlocks] = useState<Block[]>(() => parseBlocks(initialContent));
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuBlockId, setMenuBlockId] = useState<string | null>(null);
  const [mathPaletteOpen, setMathPaletteOpen] = useState(false);
  const [activeMathId, setActiveMathId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [, startTransition] = useTransition();
  const focusMap = useRef<Map<string, HTMLElement>>(new Map());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus a block by id
  const focusBlock = useCallback((id: string) => {
    requestAnimationFrame(() => {
      const el = focusMap.current.get(id);
      if (el) {
        el.focus();
        // Move cursor to end for contenteditable
        if (el.isContentEditable) {
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(el);
          range.collapse(false);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }
    });
  }, []);

  // Auto-save with debounce
  const triggerSave = useCallback(
    (nextBlocks: Block[]) => {
      setSaveStatus("unsaved");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        setSaveStatus("saving");
        startTransition(async () => {
          await onSave(pageId, JSON.stringify(nextBlocks));
          setSaveStatus("saved");
        });
      }, 800);
    },
    [pageId, onSave]
  );

  const updateBlock = useCallback((id: string, content: string) => {
    setBlocks((prev) => {
      const next = prev.map((b) => (b.id === id ? { ...b, content } : b));
      triggerSave(next);
      return next;
    });
  }, [triggerSave]);

  const changeType = useCallback((id: string, type: BlockType) => {
    setBlocks((prev) => {
      const next = prev.map((b) => (b.id === id ? { ...b, type } : b));
      triggerSave(next);
      return next;
    });
    focusBlock(id);
  }, [triggerSave, focusBlock]);

  const insertAfter = useCallback((id: string) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      const nb = makeBlock();
      const next = [...prev.slice(0, idx + 1), nb, ...prev.slice(idx + 1)];
      triggerSave(next);
      setTimeout(() => focusBlock(nb.id), 0);
      return next;
    });
  }, [triggerSave, focusBlock]);

  const deleteBlock = useCallback((id: string) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      const next = prev.filter((b) => b.id !== id);
      const focusIdx = Math.max(0, idx - 1);
      if (next.length > 0) setTimeout(() => focusBlock(next[focusIdx].id), 0);
      triggerSave(next);
      return next;
    });
  }, [triggerSave, focusBlock]);

  const arrowUp = useCallback((id: string) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx > 0) focusBlock(prev[idx - 1].id);
      return prev;
    });
  }, [focusBlock]);

  const arrowDown = useCallback((id: string) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx < prev.length - 1) focusBlock(prev[idx + 1].id);
      return prev;
    });
  }, [focusBlock]);

  const openSlashMenu = useCallback((id: string) => {
    setMenuBlockId(id);
    setMenuOpen(true);
  }, []);

  function selectMenuType(type: BlockType) {
    if (!menuBlockId) return;
    if (type === "divider") {
      setBlocks((prev) => {
        const idx = prev.findIndex((b) => b.id === menuBlockId);
        const nb = makeBlock("divider", "");
        const next = [...prev.slice(0, idx + 1), nb, ...prev.slice(idx + 1)];
        triggerSave(next);
        return next;
      });
      insertAfter(menuBlockId);
    } else {
      changeType(menuBlockId, type);
    }
    setMenuOpen(false);
    setMenuBlockId(null);
  }

  function insertSymbol(sym: string) {
    if (!activeMathId) return;
    setBlocks((prev) => {
      const next = prev.map((b) =>
        b.id === activeMathId ? { ...b, content: b.content + sym } : b
      );
      triggerSave(next);
      return next;
    });
  }

  return (
    <div className={`relative ${className}`}>
      {/* Inline format toolbar — appears on text selection */}
      <FormatToolbar />

      {/* Save status */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setBlocks((prev) => {
                const nb = makeBlock("math", "");
                const next = [...prev, nb];
                triggerSave(next);
                setActiveMathId(nb.id);
                setMathPaletteOpen(true);
                return next;
              });
            }}
            className="inline-flex items-center gap-1 border border-border bg-bg px-2 py-1 text-xs font-medium text-muted-fg transition-colors hover:border-brand hover:text-brand"
            title="Mathe-Formel einfügen"
          >
            ∑ Formel
          </button>
          <button
            type="button"
            onClick={() => {
              setBlocks((prev) => {
                const nb = makeBlock("divider", "");
                const next = [...prev, nb];
                triggerSave(next);
                return next;
              });
            }}
            className="inline-flex items-center gap-1 border border-border bg-bg px-2 py-1 text-xs font-medium text-muted-fg transition-colors hover:border-brand hover:text-brand"
          >
            ─ Linie
          </button>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-fg">
          {saveStatus === "saving" ? "Speichert…" : saveStatus === "unsaved" ? "Ungespeichert" : "Gespeichert ✓"}
        </span>
      </div>

      {/* Math symbol palette */}
      {mathPaletteOpen && (
        <div className="mb-3 flex flex-wrap gap-1 border border-brand/30 bg-brand/4 p-2">
          <span className="w-full text-[10px] font-semibold uppercase tracking-wider text-muted-fg mb-1">
            Symbole — klicken zum Einfügen
          </span>
          {MATH_SYMBOLS.map((s) => (
            <button
              key={s.sym}
              type="button"
              onClick={() => insertSymbol(s.sym)}
              title={s.sym}
              className="border border-border bg-bg px-2 py-1 font-mono text-xs hover:border-brand hover:bg-brand/10"
            >
              {s.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setMathPaletteOpen(false)}
            className="ml-auto text-xs text-muted-fg hover:text-fg"
          >
            ✕
          </button>
        </div>
      )}

      {/* Blocks */}
      <div className="space-y-0.5">
        {blocks.map((block, idx) => {
          // Compute sequential number only among consecutive numbered items
          let numberedIndex = 1;
          if (block.type === "numbered") {
            for (let i = idx - 1; i >= 0; i--) {
              if (blocks[i].type === "numbered") numberedIndex++;
              else break;
            }
          }
          return (
          <div
            key={block.id}
            className="group relative"
            onClick={() => {
              if (block.type === "math") {
                setActiveMathId(block.id);
                setMathPaletteOpen(true);
              }
            }}
          >
            <MemoBlockRow
              block={block}
              index={numberedIndex - 1}
              isOnly={blocks.length === 1}
              onUpdate={updateBlock}
              onChangeType={changeType}
              onEnter={insertAfter}
              onDelete={deleteBlock}
              onArrowUp={arrowUp}
              onArrowDown={arrowDown}
              onSlash={openSlashMenu}
              focusRef={focusMap}
            />
          </div>
          );
        })}
      </div>

      {/* Click below to add */}
      <div
        className="mt-4 min-h-[60px] cursor-text"
        onClick={() => {
          const last = blocks[blocks.length - 1];
          if (last.content === "" && last.type === "p") {
            focusBlock(last.id);
          } else {
            const nb = makeBlock();
            setBlocks((prev) => {
              const next = [...prev, nb];
              triggerSave(next);
              return next;
            });
            setTimeout(() => focusBlock(nb.id), 0);
          }
        }}
      />

      {/* Slash command menu */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute z-50 mt-1 w-64 border border-border bg-bg shadow-lg">
            <p className="border-b border-border px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
              Block-Typ wählen
            </p>
            <ul>
              {BLOCK_MENU.map((item) => (
                <li key={item.type}>
                  <button
                    type="button"
                    onClick={() => selectMenuType(item.type)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-surface"
                  >
                    <span className="grid size-7 shrink-0 place-items-center border border-border font-mono text-xs font-bold text-muted-fg">
                      {item.icon}
                    </span>
                    <div className="text-left">
                      <p className="font-medium">{item.label}</p>
                      {item.shortcut && (
                        <p className="font-mono text-[10px] text-muted-fg">{item.shortcut}</p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
