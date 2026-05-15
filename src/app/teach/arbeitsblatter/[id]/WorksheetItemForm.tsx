"use client";

import { useRef, useState, useTransition } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TYPES = [
  { key: "text_input", label: "Texteingabe" },
  { key: "fill_blank", label: "Lückentext" },
  { key: "multiple_choice", label: "Multiple Choice" },
  { key: "true_false", label: "Wahr / Falsch" },
  { key: "drag_drop", label: "Drag & Drop" },
  { key: "matching", label: "Zuordnung" },
  { key: "sorting", label: "Sortierung" },
  { key: "drawing", label: "Zeichnung" },
  { key: "number_wall", label: "Zahlenmauer" },
  { key: "number_line", label: "Zahlenstrahl" },
  { key: "calculation_wheel", label: "Rechenrad" },
  { key: "hundred_chart", label: "Hunderterfeld" },
] as const;

type ItemType = (typeof TYPES)[number]["key"];

interface ListItem {
  id: string;
  label: string;
}

interface Props {
  nextOrder: number;
  onSave: (formData: FormData) => Promise<void>;
}

function uid() {
  return Math.random().toString(36).slice(2, 8);
}

export function WorksheetItemForm({ nextOrder, onSave }: Props) {
  const [type, setType] = useState<ItemType>("text_input");
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  // shared optional fields
  const [hint, setHint] = useState("");
  const [points, setPoints] = useState(1);
  const [required, setRequired] = useState(true);

  // text_input
  const [tiLabel, setTiLabel] = useState("");
  const [tiMultiline, setTiMultiline] = useState(false);
  const [tiMaxLength, setTiMaxLength] = useState(500);

  // fill_blank
  const [fbText, setFbText] = useState("");
  const [fbAnswers, setFbAnswers] = useState<string[]>([""]);

  // multiple_choice
  const [mcQuestion, setMcQuestion] = useState("");
  const [mcOptions, setMcOptions] = useState<string[]>(["", "", "", ""]);
  const [mcMultiple, setMcMultiple] = useState(false);
  const [mcCorrect, setMcCorrect] = useState<number[]>([]);

  // true_false
  const [tfQuestion, setTfQuestion] = useState("");
  const [tfCorrect, setTfCorrect] = useState<"true" | "false">("true");

  // drag_drop
  const [ddInstruction, setDdInstruction] = useState("");
  const [ddItems, setDdItems] = useState<ListItem[]>([{ id: "a", label: "" }, { id: "b", label: "" }, { id: "c", label: "" }]);
  const [ddZones, setDdZones] = useState<ListItem[]>([{ id: "z1", label: "" }, { id: "z2", label: "" }]);

  // matching
  const [maInstruction, setMaInstruction] = useState("");
  const [maLeft, setMaLeft] = useState<ListItem[]>([{ id: "l1", label: "" }, { id: "l2", label: "" }]);
  const [maRight, setMaRight] = useState<ListItem[]>([{ id: "r1", label: "" }, { id: "r2", label: "" }]);

  // sorting
  const [soInstruction, setSoInstruction] = useState("");
  const [soItems, setSoItems] = useState<ListItem[]>([{ id: "1", label: "" }, { id: "2", label: "" }, { id: "3", label: "" }]);

  // drawing
  const [drInstruction, setDrInstruction] = useState("");
  const [drWidth, setDrWidth] = useState(600);
  const [drHeight, setDrHeight] = useState(300);

  // number_wall
  const [nwBottomRow, setNwBottomRow] = useState("3, , 5, 2");

  // number_line
  const [nlMin, setNlMin] = useState(0);
  const [nlMax, setNlMax] = useState(20);
  const [nlStep, setNlStep] = useState(1);
  const [nlToPlace, setNlToPlace] = useState("7, 13, 18");
  const [nlShowNumbers, setNlShowNumbers] = useState(true);

  // calculation_wheel
  const [cwCenter, setCwCenter] = useState(6);
  const [cwOperation, setCwOperation] = useState("*");
  const [cwSpokes, setCwSpokes] = useState("1, 2, 3, 4, 5, 6, 7, 8");
  const [cwMode, setCwMode] = useState("fill_outer");

  // hundred_chart
  const [hcTask, setHcTask] = useState("Markiere alle Vielfachen von 5");
  const [hcMode, setHcMode] = useState("mark");

  function buildConfig(): string {
    switch (type) {
      case "text_input":
        return JSON.stringify({ label: tiLabel, multiline: tiMultiline, maxLength: tiMaxLength });
      case "fill_blank": {
        const blanks = extractBlanks(fbText);
        return JSON.stringify({ text: fbText, blanks });
      }
      case "multiple_choice":
        return JSON.stringify({ question: mcQuestion, options: mcOptions.filter(Boolean), multiple: mcMultiple });
      case "true_false":
        return JSON.stringify({ question: tfQuestion });
      case "drag_drop":
        return JSON.stringify({ instruction: ddInstruction, items: ddItems.filter((i) => i.label), zones: ddZones.filter((z) => z.label) });
      case "matching":
        return JSON.stringify({ instruction: maInstruction, leftItems: maLeft.filter((i) => i.label), rightItems: maRight.filter((i) => i.label) });
      case "sorting":
        return JSON.stringify({ instruction: soInstruction, items: soItems.filter((i) => i.label) });
      case "drawing":
        return JSON.stringify({ instruction: drInstruction, width: drWidth, height: drHeight });
      case "number_wall": {
        const bottom = nwBottomRow.split(",").map((v) => {
          const t = v.trim();
          return t === "" || t === "null" ? null : Number(t);
        });
        return JSON.stringify({ rows: buildNumberWallRows(bottom) });
      }
      case "number_line":
        return JSON.stringify({
          min: nlMin, max: nlMax, step: nlStep,
          toPlace: nlToPlace.split(",").map((v) => Number(v.trim())).filter((n) => !isNaN(n)),
          showNumbers: nlShowNumbers,
        });
      case "calculation_wheel":
        return JSON.stringify({
          center: cwCenter, operation: cwOperation,
          spokes: cwSpokes.split(",").map((v) => { const t = v.trim(); return t === "" ? null : Number(t); }),
          mode: cwMode,
        });
      case "hundred_chart":
        return JSON.stringify({ task: hcTask, mode: hcMode, preMarked: [] });
    }
  }

  function buildCorrectAnswer(): string {
    switch (type) {
      case "text_input":
        return "";
      case "fill_blank":
        return JSON.stringify(fbAnswers.filter(Boolean));
      case "multiple_choice":
        return mcMultiple ? JSON.stringify(mcCorrect) : JSON.stringify(mcCorrect[0] ?? 0);
      case "true_false":
        return JSON.stringify(tfCorrect);
      case "drag_drop":
        return "";
      case "matching": {
        const correct: Record<string, string> = {};
        maLeft.forEach((l, i) => { if (l.id && maRight[i]?.id) correct[l.id] = maRight[i].id; });
        return JSON.stringify(correct);
      }
      case "sorting":
        return JSON.stringify(soItems.filter((i) => i.label).map((i) => i.id));
      case "drawing":
        return "";
      case "number_wall":
        return "";
      case "number_line":
        return JSON.stringify(nlToPlace.split(",").map((v) => Number(v.trim())).filter((n) => !isNaN(n)));
      case "calculation_wheel":
        return "";
      case "hundred_chart":
        return "";
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("type", type);
    fd.set("order", String(nextOrder));
    fd.set("config", buildConfig());
    const ca = buildCorrectAnswer();
    if (ca) fd.set("correctAnswer", ca);
    if (hint) fd.set("hint", hint);
    fd.set("points", String(points));
    fd.set("required", required ? "on" : "");

    startTransition(async () => {
      await onSave(fd);
      resetForm();
    });
  }

  function resetForm() {
    setHint(""); setPoints(1); setRequired(true);
    setTiLabel(""); setFbText(""); setFbAnswers([""]);
    setMcQuestion(""); setMcOptions(["", "", "", ""]); setMcCorrect([]);
    setTfQuestion("");
    setDdInstruction(""); setDdItems([{ id: "a", label: "" }, { id: "b", label: "" }]);
    setMaInstruction(""); setSoInstruction(""); setDrInstruction("");
    setNwBottomRow("3, , 5, 2"); setNlToPlace("7, 13, 18"); setCwSpokes("1, 2, 3, 4, 5, 6, 7, 8");
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Type selector */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-fg">Widget-Typ</p>
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4">
          {TYPES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setType(t.key)}
              className={cn(
                "px-3 py-2 text-left text-xs font-semibold transition-colors",
                type === t.key
                  ? "bg-brand text-brand-fg"
                  : "border border-border bg-bg text-muted-fg hover:bg-surface"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Type-specific fields */}
        <div className="rounded border border-border bg-surface/50 p-4">
          {type === "text_input" && (
            <div className="flex flex-col gap-4">
              <Field label="Aufgabenstellung / Label *">
                <Input value={tiLabel} onChange={(e) => setTiLabel(e.target.value)} required placeholder="Erkläre in eigenen Worten:" />
              </Field>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={tiMultiline} onChange={(e) => setTiMultiline(e.target.checked)} className="size-4 accent-brand" />
                  Mehrzeiliges Textfeld
                </label>
                <Field label="Max. Zeichen" className="flex-1">
                  <Input type="number" min={10} value={tiMaxLength} onChange={(e) => setTiMaxLength(Number(e.target.value))} />
                </Field>
              </div>
            </div>
          )}

          {type === "fill_blank" && (
            <div className="flex flex-col gap-4">
              <Field label="Text (Lücken mit {{blank:0}}, {{blank:1}}, … markieren)">
                <textarea
                  value={fbText}
                  onChange={(e) => {
                    setFbText(e.target.value);
                    const count = (e.target.value.match(/\{\{blank:\d+\}\}/g) ?? []).length;
                    setFbAnswers((prev) => {
                      const next = [...prev];
                      while (next.length < count) next.push("");
                      return next.slice(0, Math.max(count, 1));
                    });
                  }}
                  rows={4}
                  required
                  placeholder="Die Hauptstadt von Deutschland ist {{blank:0}}."
                  className="w-full border border-border bg-bg px-3 py-2 text-sm outline-none focus-visible:border-brand"
                />
              </Field>
              {fbAnswers.map((ans, i) => (
                <Field key={i} label={`Korrekte Antwort für Lücke ${i}`}>
                  <Input value={ans} onChange={(e) => { const next = [...fbAnswers]; next[i] = e.target.value; setFbAnswers(next); }} placeholder="Antwort…" />
                </Field>
              ))}
            </div>
          )}

          {type === "multiple_choice" && (
            <div className="flex flex-col gap-4">
              <Field label="Frage *">
                <Input value={mcQuestion} onChange={(e) => setMcQuestion(e.target.value)} required placeholder="Was ist die Hauptstadt von Frankreich?" />
              </Field>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-fg">Antwortoptionen (✓ = korrekt)</p>
                <div className="flex flex-col gap-2">
                  {mcOptions.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type={mcMultiple ? "checkbox" : "radio"}
                        name="mc-correct"
                        checked={mcCorrect.includes(i)}
                        onChange={() => {
                          if (mcMultiple) {
                            setMcCorrect((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]);
                          } else {
                            setMcCorrect([i]);
                          }
                        }}
                        className="size-4 accent-brand"
                      />
                      <Input
                        value={opt}
                        onChange={(e) => { const next = [...mcOptions]; next[i] = e.target.value; setMcOptions(next); }}
                        placeholder={`Option ${i + 1}`}
                        className="flex-1"
                      />
                      {mcOptions.length > 2 && (
                        <button type="button" onClick={() => setMcOptions((prev) => prev.filter((_, j) => j !== i))} className="text-muted-fg hover:text-danger">
                          <X className="size-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setMcOptions((prev) => [...prev, ""])} className="mt-2 flex items-center gap-1 text-xs text-brand hover:underline">
                  <Plus className="size-3" /> Option hinzufügen
                </button>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={mcMultiple} onChange={(e) => { setMcMultiple(e.target.checked); setMcCorrect([]); }} className="size-4 accent-brand" />
                Mehrfachauswahl erlauben
              </label>
            </div>
          )}

          {type === "true_false" && (
            <div className="flex flex-col gap-4">
              <Field label="Aussage *">
                <Input value={tfQuestion} onChange={(e) => setTfQuestion(e.target.value)} required placeholder="Die Erde dreht sich um die Sonne." />
              </Field>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-fg">Korrekte Antwort</p>
                <div className="flex gap-4">
                  {(["true", "false"] as const).map((v) => (
                    <label key={v} className="flex items-center gap-2 text-sm font-medium">
                      <input type="radio" checked={tfCorrect === v} onChange={() => setTfCorrect(v)} className="size-4 accent-brand" />
                      {v === "true" ? "Richtig" : "Falsch"}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {type === "drag_drop" && (
            <div className="flex flex-col gap-4">
              <Field label="Anweisung">
                <Input value={ddInstruction} onChange={(e) => setDdInstruction(e.target.value)} placeholder="Ordne die Tiere den Kategorien zu:" />
              </Field>
              <DynamicList label="Elemente (ziehbar)" items={ddItems} onChange={setDdItems} placeholder="z. B. Hund" />
              <DynamicList label="Zonen (Ablageflächen)" items={ddZones} onChange={setDdZones} placeholder="z. B. Säugetier" />
              <p className="text-xs text-muted-fg">Korrekte Zuordnung kann nach dem Speichern im JSON-Feld definiert werden.</p>
            </div>
          )}

          {type === "matching" && (
            <div className="flex flex-col gap-4">
              <Field label="Anweisung">
                <Input value={maInstruction} onChange={(e) => setMaInstruction(e.target.value)} placeholder="Verbinde Hauptstädte mit ihren Ländern:" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <DynamicList label="Linke Spalte" items={maLeft} onChange={setMaLeft} placeholder="z. B. Berlin" />
                <DynamicList label="Rechte Spalte (gleiche Reihenfolge = korrekte Zuordnung)" items={maRight} onChange={setMaRight} placeholder="z. B. Deutschland" />
              </div>
            </div>
          )}

          {type === "sorting" && (
            <div className="flex flex-col gap-4">
              <Field label="Anweisung">
                <Input value={soInstruction} onChange={(e) => setSoInstruction(e.target.value)} placeholder="Sortiere die Jahreszeiten:" />
              </Field>
              <DynamicList label="Elemente (eingegebene Reihenfolge = korrekt)" items={soItems} onChange={setSoItems} placeholder="z. B. Frühling" />
            </div>
          )}

          {type === "drawing" && (
            <div className="flex flex-col gap-4">
              <Field label="Aufgabenstellung">
                <Input value={drInstruction} onChange={(e) => setDrInstruction(e.target.value)} placeholder="Zeichne ein Haus." />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Breite (px)">
                  <Input type="number" min={200} max={1200} value={drWidth} onChange={(e) => setDrWidth(Number(e.target.value))} />
                </Field>
                <Field label="Höhe (px)">
                  <Input type="number" min={100} max={800} value={drHeight} onChange={(e) => setDrHeight(Number(e.target.value))} />
                </Field>
              </div>
              <p className="text-xs text-muted-fg">Zeichnungen werden manuell bewertet (kein Autograding).</p>
            </div>
          )}

          {type === "number_wall" && (
            <div className="flex flex-col gap-4">
              <Field label="Unterste Reihe (Komma-getrennt, leer = Lücke)">
                <Input value={nwBottomRow} onChange={(e) => setNwBottomRow(e.target.value)} placeholder="3, , 5, 2" />
              </Field>
              <p className="text-xs text-muted-fg">
                Darüber liegende Reihen werden automatisch berechnet. Lücken (leere Felder) müssen die Schüler ausfüllen.
              </p>
            </div>
          )}

          {type === "number_line" && (
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Von"><Input type="number" value={nlMin} onChange={(e) => setNlMin(Number(e.target.value))} /></Field>
                <Field label="Bis"><Input type="number" value={nlMax} onChange={(e) => setNlMax(Number(e.target.value))} /></Field>
                <Field label="Schritt"><Input type="number" min={1} value={nlStep} onChange={(e) => setNlStep(Number(e.target.value))} /></Field>
              </div>
              <Field label="Zu platzierende Zahlen (Komma-getrennt)">
                <Input value={nlToPlace} onChange={(e) => setNlToPlace(e.target.value)} placeholder="7, 13, 18" />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={nlShowNumbers} onChange={(e) => setNlShowNumbers(e.target.checked)} className="size-4 accent-brand" />
                Zahlen am Strahl anzeigen
              </label>
            </div>
          )}

          {type === "calculation_wheel" && (
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Mitte (Startzahl)">
                  <Input type="number" value={cwCenter} onChange={(e) => setCwCenter(Number(e.target.value))} />
                </Field>
                <Field label="Operation">
                  <select value={cwOperation} onChange={(e) => setCwOperation(e.target.value)} className="h-11 w-full border border-border bg-bg px-3 text-sm outline-none focus-visible:border-brand">
                    <option value="+">Addition (+)</option>
                    <option value="-">Subtraktion (−)</option>
                    <option value="*">Multiplikation (×)</option>
                    <option value="/">Division (÷)</option>
                  </select>
                </Field>
                <Field label="Modus">
                  <select value={cwMode} onChange={(e) => setCwMode(e.target.value)} className="h-11 w-full border border-border bg-bg px-3 text-sm outline-none focus-visible:border-brand">
                    <option value="fill_outer">Außen ausfüllen</option>
                    <option value="fill_inner">Innen ausfüllen</option>
                    <option value="fill_center">Mitte ausfüllen</option>
                  </select>
                </Field>
              </div>
              <Field label="Speichen-Werte (Komma-getrennt, leer = Lücke)">
                <Input value={cwSpokes} onChange={(e) => setCwSpokes(e.target.value)} placeholder="1, 2, 3, 4, 5, 6, 7, 8" />
              </Field>
            </div>
          )}

          {type === "hundred_chart" && (
            <div className="flex flex-col gap-4">
              <Field label="Aufgabenstellung">
                <Input value={hcTask} onChange={(e) => setHcTask(e.target.value)} placeholder="Markiere alle Vielfachen von 5" />
              </Field>
              <Field label="Modus">
                <select value={hcMode} onChange={(e) => setHcMode(e.target.value)} className="h-11 w-full border border-border bg-bg px-3 text-sm outline-none focus-visible:border-brand">
                  <option value="mark">Markieren (Tippen = markiert/unmarkiert)</option>
                  <option value="fill">Ausfüllen (Zahlen eingeben)</option>
                </select>
              </Field>
            </div>
          )}
        </div>

        {/* Shared fields */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Hinweis (optional)">
            <Input value={hint} onChange={(e) => setHint(e.target.value)} placeholder="Tipp für Schüler…" />
          </Field>
          <Field label="Punkte">
            <Input type="number" min={0} value={points} onChange={(e) => setPoints(Number(e.target.value))} />
          </Field>
          <div className="flex items-end gap-2 pb-1">
            <input id="req" type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} className="size-4 accent-brand" />
            <Label htmlFor="req">Pflichtfeld</Label>
          </div>
        </div>

        <div className="flex justify-end border-t border-border pt-4">
          <button type="submit" disabled={pending} className={cn(buttonVariants({ size: "sm" }), "disabled:opacity-60")}>
            {pending ? "Speichern…" : "Item speichern"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function DynamicList({ label, items, onChange, placeholder }: { label: string; items: ListItem[]; onChange: (v: ListItem[]) => void; placeholder: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">{label}</p>
      {items.map((item, i) => (
        <div key={item.id} className="flex items-center gap-2">
          <Input
            value={item.label}
            onChange={(e) => { const next = [...items]; next[i] = { ...item, label: e.target.value }; onChange(next); }}
            placeholder={placeholder}
            className="flex-1"
          />
          {items.length > 1 && (
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-muted-fg hover:text-danger">
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, { id: uid(), label: "" }])} className="flex items-center gap-1 text-xs text-brand hover:underline">
        <Plus className="size-3" /> Hinzufügen
      </button>
    </div>
  );
}

function extractBlanks(text: string): { id: string }[] {
  const matches = text.match(/\{\{blank:(\d+)\}\}/g) ?? [];
  return matches.map((m) => ({ id: m.match(/\d+/)?.[0] ?? "0" }));
}

function buildNumberWallRows(bottom: (number | null)[]): (number | null)[][] {
  const rows: (number | null)[][] = [bottom];
  let current = bottom;
  while (current.length > 1) {
    const next: (number | null)[] = [];
    for (let i = 0; i < current.length - 1; i++) {
      const a = current[i], b = current[i + 1];
      next.push(a !== null && b !== null ? a + b : null);
    }
    rows.unshift(next);
    current = next;
  }
  return rows.reverse();
}
