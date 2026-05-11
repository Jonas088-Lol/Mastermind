"use client";

import {
  Atom,
  Beaker,
  Calculator,
  Check,
  Download,
  FileEdit,
  GraduationCap,
  Languages,
  Leaf,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { sendToClass } from "./actions";

// ── Types ─────────────────────────────────────────────────────────

interface TscItem {
  id: string;
  class: { id: string; name: string };
  subject: { id: string; name: string };
}

interface GeneratorClientProps {
  tscList: TscItem[];
}

// ── Constants ─────────────────────────────────────────────────────

const TEMPLATES = [
  { icon: Calculator, label: "Mathe-Klassenarbeit", body: "8 Aufgaben · 45 Min.", topic: "Quadratische Funktionen", duration: "45", questions: 8 },
  { icon: Atom, label: "Physik-Klausur", body: "6 Aufgaben · 60 Min.", topic: "Optik", duration: "60", questions: 6 },
  { icon: Languages, label: "Englisch Reading & Writing", body: "Text + 4 Aufgaben", topic: "Reading Comprehension", duration: "45", questions: 4 },
  { icon: Leaf, label: "Bio-Test", body: "10 Multiple-Choice + 2 Freitext", topic: "Photosynthese", duration: "30", questions: 12 },
  { icon: Beaker, label: "Chemie-Praktikum", body: "Versuchsprotokoll-Vorlage", topic: "Säuren und Basen", duration: "90", questions: 5 },
  { icon: GraduationCap, label: "Lernzielkontrolle", body: "Kurz · 15 Min.", topic: "Lernzielkontrolle", duration: "20", questions: 4 },
];

const RECENT = [
  { title: "KA Mathe 9b — Quadratische Funktionen", klasse: "9b", when: "vor 2 Std.", questions: 8, points: 36 },
  { title: "Test Physik 10a — Optik", klasse: "10a", when: "gestern", questions: 6, points: 20 },
  { title: "Wochen-Quiz 8c — Bruchrechnen", klasse: "8c", when: "vor 3 Tagen", questions: 10, points: 15 },
];

const SAMPLE_QUESTIONS = [
  { n: 1, points: 4, type: "Rechnung", title: "Wende die pq-Formel auf x² + 4x − 12 = 0 an. Notiere alle Schritte." },
  { n: 2, points: 6, type: "Rechnung & Begründung", title: "Bestimme die Nullstellen von f(x) = x² − 6x + 5. Erkläre, was die Diskriminante über die Lösungen aussagt." },
  { n: 3, points: 5, type: "Anwendung", title: "Ein Stein wird mit der Geschwindigkeit v₀ = 20 m/s senkrecht nach oben geworfen. Berechne die Steighöhe und die Steigzeit (g = 10 m/s²)." },
  { n: 4, points: 5, type: "Skizze & Interpretation", title: "Skizziere die Funktion f(x) = (x − 2)² − 4 ohne Wertetabelle. Beschreibe, wie sie aus der Normalparabel entsteht." },
];

const ALL_TASK_TYPES = ["Rechnen", "Begründen", "Skizzieren", "Multiple Choice", "Anwendung"];

const DEFAULT_FORM = {
  klasseId: "",
  topic: "",
  duration: "45",
  questions: 8,
  difficulty: "Mittel" as "Leicht" | "Mittel" | "Schwer",
  taskTypes: ["Rechnen", "Begründen", "Skizzieren", "Multiple Choice"] as string[],
  lernziel: "",
};

// ── Main component ────────────────────────────────────────────────

export function GeneratorClient({ tscList }: GeneratorClientProps) {
  const [form, setForm] = useState(() => {
    const first = tscList[0];
    return {
      ...DEFAULT_FORM,
      klasseId: first?.id ?? "",
      topic: "Quadratische Funktionen",
      lernziel: "Schüler sollen pq-Formel anwenden, Diskriminante interpretieren und Anwendungsaufgaben lösen.",
    };
  });
  const [phase, setPhase] = useState<"idle" | "generating" | "done">("idle");
  const [sending, setSending] = useState(false);

  const totalPoints = SAMPLE_QUESTIONS.reduce((s, q) => s + q.points, 0);
  const expectedTime = SAMPLE_QUESTIONS.length * 6;

  const selectedTsc = tscList.find((t) => t.id === form.klasseId);

  function handleGenerate() {
    setPhase("generating");
    setTimeout(() => setPhase("done"), 1500);
  }

  function handleReset() {
    setPhase("idle");
  }

  function handleEmptyTemplate() {
    setForm({ ...DEFAULT_FORM, klasseId: form.klasseId });
    setPhase("idle");
  }

  function handlePdf() {
    // Trigger browser print dialog — user can save as PDF from there
    window.print();
  }

  async function handleSendToClass() {
    if (!selectedTsc) return;
    setSending(true);
    try {
      const title = form.topic
        ? `${form.topic} · ${selectedTsc.class.name}`
        : `Generierter Test · ${selectedTsc.class.name}`;
      await sendToClass(selectedTsc.class.id, selectedTsc.subject.id, title);
      alert("Aufgabe wurde an die Klasse gesendet!");
    } catch {
      alert("Fehler beim Senden.");
    } finally {
      setSending(false);
    }
  }

  function applyTemplate(t: typeof TEMPLATES[0]) {
    setForm((f) => ({
      ...f,
      topic: t.topic,
      duration: t.duration,
      questions: t.questions,
    }));
  }

  function toggleTaskType(type: string) {
    setForm((f) => ({
      ...f,
      taskTypes: f.taskTypes.includes(type)
        ? f.taskTypes.filter((x) => x !== type)
        : [...f.taskTypes, type],
    }));
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
            KI-Generator · v3
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            Klassenarbeit in 60 Sekunden
          </h1>
          <p className="mt-1 text-sm text-muted-fg">
            Lehrplan-konform · Bewertungsraster inklusive · du behältst die Endkontrolle
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleEmptyTemplate}>
          <Plus className="size-3.5" />
          Leere Vorlage
        </Button>
      </header>

      {/* Templates */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-fg">Vorlagen</h2>
          <span className="font-mono text-xs text-muted-fg">6 Templates</span>
        </div>
        <div className="grid grid-cols-2 gap-px border border-border bg-border md:grid-cols-3">
          {TEMPLATES.map((t, i) => (
            <button
              key={t.label}
              type="button"
              onClick={() => applyTemplate(t)}
              className={`group flex flex-col items-start gap-2 bg-bg p-4 text-left transition-colors hover:bg-surface ${
                i === 0 ? "border-l-2 border-l-brand" : ""
              }`}
            >
              <span className="grid size-9 place-items-center bg-fg text-bg">
                <t.icon className="size-4" strokeWidth={1.75} />
              </span>
              <p className="text-sm font-semibold">{t.label}</p>
              <p className="text-xs text-muted-fg">{t.body}</p>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        {/* Config card */}
        <Card>
          <CardHeader>
            <CardTitle>Konfiguration</CardTitle>
            <Badge variant="brand">
              <Sparkles className="size-3" />
              KI
            </Badge>
          </CardHeader>
          <CardBody className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="klasse">Klasse</Label>
              <select
                id="klasse"
                value={form.klasseId}
                onChange={(e) => setForm((f) => ({ ...f, klasseId: e.target.value }))}
                className="h-10 w-full border border-border bg-bg px-3 text-sm focus:border-fg/30 focus:outline-none"
              >
                {tscList.length === 0 && (
                  <option value="">— keine Klassen —</option>
                )}
                {tscList.map((tsc) => (
                  <option key={tsc.id} value={tsc.id}>
                    {tsc.class.name} · {tsc.subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="topic">Thema</Label>
              <Input
                id="topic"
                value={form.topic}
                onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="duration">Dauer</Label>
                <select
                  id="duration"
                  value={form.duration}
                  onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                  className="h-10 w-full border border-border bg-bg px-3 text-sm focus:border-fg/30 focus:outline-none"
                >
                  <option value="20">20 Min.</option>
                  <option value="30">30 Min.</option>
                  <option value="45">45 Min.</option>
                  <option value="60">60 Min.</option>
                  <option value="90">90 Min.</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="questions">Aufgaben</Label>
                <Input
                  id="questions"
                  type="number"
                  value={form.questions}
                  min={1}
                  max={20}
                  onChange={(e) => setForm((f) => ({ ...f, questions: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Schwierigkeit</Label>
              <div className="grid grid-cols-3 gap-px border border-border bg-border">
                {(["Leicht", "Mittel", "Schwer"] as const).map((d) => (
                  <DiffOption
                    key={d}
                    label={d}
                    active={form.difficulty === d}
                    onClick={() => setForm((f) => ({ ...f, difficulty: d }))}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Aufgabentypen</Label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_TASK_TYPES.map((t) => (
                  <Chip
                    key={t}
                    active={form.taskTypes.includes(t)}
                    onClick={() => toggleTaskType(t)}
                  >
                    {t}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lernziel">Lernziel-Hinweis</Label>
              <textarea
                id="lernziel"
                rows={3}
                value={form.lernziel}
                onChange={(e) => setForm((f) => ({ ...f, lernziel: e.target.value }))}
                className="w-full resize-y border border-border bg-bg p-2.5 text-sm focus:border-fg/30 focus:outline-none"
              />
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleGenerate}
              disabled={phase === "generating"}
            >
              {phase === "generating" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Wand2 className="size-4" />
              )}
              {phase === "generating" ? "Generiert..." : "Generieren"}
            </Button>

            <p className="text-center text-[10px] uppercase tracking-wider text-muted-fg">
              Verbraucht 1 Generator-Anfrage · 47 von 50 frei
            </p>
          </CardBody>
        </Card>

        {/* Preview card */}
        <Card>
          {phase === "idle" && (
            <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
              <Sparkles className="size-10 text-muted-fg" strokeWidth={1.5} />
              <p className="text-base font-semibold">Bereit zum Generieren</p>
              <p className="max-w-sm text-sm text-muted-fg">
                Konfiguriere Klasse, Thema und Aufgabentypen — dann klicke auf{" "}
                <strong>Generieren</strong>.
              </p>
            </div>
          )}

          {phase === "generating" && (
            <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
              <Loader2 className="size-12 animate-spin text-brand" strokeWidth={1.5} />
              <p className="text-base font-semibold">KI generiert Aufgaben...</p>
              <p className="text-sm text-muted-fg">
                Analysiere Lehrplan · Passe Schwierigkeit an · Formuliere Aufgaben
              </p>
              <Progress value={66} tone="brand" className="w-48" />
            </div>
          )}

          {phase === "done" && (
            <>
              <CardHeader>
                <div>
                  <CardTitle>
                    Vorschau ·{" "}
                    {form.topic || "Generierter Test"}{" "}
                    {selectedTsc ? `· ${selectedTsc.class.name}` : ""}
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-fg">
                    {SAMPLE_QUESTIONS.length} Aufgaben · {totalPoints} Punkte · {expectedTime} Min.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={handleReset}>
                    <RefreshCw className="size-3.5" />
                    Neu
                  </Button>
                  <Button variant="outline" size="sm" onClick={handlePdf}>
                    <Download className="size-3.5" />
                    PDF
                  </Button>
                  <Button size="sm" onClick={handleSendToClass} disabled={sending || !selectedTsc}>
                    <Send className="size-3.5" />
                    {sending ? "Sende..." : "An Klasse senden"}
                  </Button>
                </div>
              </CardHeader>
              <CardBody className="!px-0 !pb-0">
                <div className="border-t border-border bg-surface px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
                  Aufgaben
                </div>
                <ol className="divide-y divide-border">
                  {SAMPLE_QUESTIONS.map((q) => (
                    <li
                      key={q.n}
                      className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-surface lg:flex-row"
                    >
                      <div className="flex shrink-0 items-start gap-3 lg:flex-col lg:items-center">
                        <span className="grid size-8 place-items-center bg-fg text-bg font-mono text-xs font-bold">
                          {q.n}
                        </span>
                        <span className="hidden font-mono text-[10px] uppercase tracking-wider text-muted-fg lg:block">
                          {q.points} P.
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{q.type}</Badge>
                          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-fg lg:hidden">
                            {q.points} Punkte
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm leading-relaxed">{q.title}</p>
                        <div className="mt-2 flex gap-1.5">
                          <Button variant="ghost" size="sm">
                            <FileEdit className="size-3.5" />
                            Bearbeiten
                          </Button>
                          <Button variant="ghost" size="sm">
                            <RefreshCw className="size-3.5" />
                            Variante
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>

                <div className="border-t border-border bg-surface px-5 py-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">Gesamt</span>
                    <span className="font-mono">
                      <span className="font-bold">{totalPoints}</span>
                      <span className="text-muted-fg"> Punkte · {expectedTime} Min.</span>
                    </span>
                  </div>
                </div>

                <div className="border-t border-border p-5">
                  <div className="flex items-center gap-2 text-xs">
                    <Sparkles className="size-3.5 text-brand" />
                    <span className="font-semibold uppercase tracking-wider text-brand">
                      Lehrplan-Check
                    </span>
                  </div>
                  <ul className="mt-3 space-y-2 text-xs">
                    <CheckItem label={`${form.difficulty}e Schwierigkeit ausgewogen`} />
                    <CheckItem label="Kompetenz K3 · Kommunizieren" />
                    <CheckItem label="Aufgabentypen variiert" />
                  </ul>
                  <Progress value={92} tone="success" className="mt-4" />
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-fg">
                    92 % Lehrplan-Übereinstimmung
                  </p>
                </div>
              </CardBody>
            </>
          )}
        </Card>
      </div>

      {/* Recent generations */}
      <Card>
        <CardHeader>
          <CardTitle>Letzte Generierungen</CardTitle>
          <span className="font-mono text-xs text-muted-fg">3 von 50 Anfragen heute</span>
        </CardHeader>
        <CardBody className="!px-0 !pb-0">
          <ul className="divide-y divide-border border-t border-border">
            {RECENT.map((r) => (
              <li
                key={r.title}
                className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-surface"
              >
                <Avatar name="MasterMind KI" size="sm" className="bg-fg text-bg ring-fg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{r.title}</p>
                  <p className="text-xs text-muted-fg">
                    {r.klasse} · {r.questions} Aufgaben · {r.points} Punkte
                  </p>
                </div>
                <span className="hidden font-mono text-[10px] uppercase tracking-wider text-muted-fg sm:inline">
                  {r.when}
                </span>
                {/* No history stored yet — button is visually disabled */}
                <Button
                  variant="ghost"
                  size="sm"
                  aria-disabled="true"
                  className="cursor-not-allowed opacity-50"
                  onClick={(e) => e.preventDefault()}
                >
                  Öffnen
                </Button>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────

function DiffOption({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`px-3 py-2 text-xs font-medium transition-colors ${
        active ? "bg-fg text-bg" : "bg-bg text-muted-fg hover:bg-surface"
      }`}
    >
      {label}
    </button>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
        active
          ? "bg-fg text-bg"
          : "border border-border bg-bg text-muted-fg hover:bg-surface"
      }`}
    >
      {active && <Check className="size-3" />}
      {children}
    </button>
  );
}

function CheckItem({ label }: { label: string }) {
  return (
    <li className="flex items-center gap-2">
      <Check className="size-3.5 text-success" strokeWidth={2.5} />
      <span>{label}</span>
    </li>
  );
}
