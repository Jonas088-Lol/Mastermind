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
import type { ExamResult } from "@/lib/ai/exam";
import { runAiGenerate, sendToClass } from "./actions";

// ── Types ─────────────────────────────────────────────────────────

interface TscItem {
  id: string;
  class: { id: string; name: string };
  subject: { id: string; name: string };
}

interface RecentAssignment {
  id: string;
  title: string;
  klasse: string;
  when: string;
  submissionCount: number;
  maxPoints: number | null;
}

interface GeneratorClientProps {
  tscList: TscItem[];
  recentAssignments: RecentAssignment[];
  quotaUsed: number;
  quotaLimit: number;
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

export function GeneratorClient({ tscList, recentAssignments, quotaUsed, quotaLimit }: GeneratorClientProps) {
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
  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<"sent" | "error" | null>(null);

  const selectedTsc = tscList.find((t) => t.id === form.klasseId);

  const questions = examResult?.questions ?? [];
  const totalPoints = examResult?.totalPoints ?? 0;
  const expectedTime = examResult?.estimatedMinutes ?? 0;
  const curriculumScore = examResult?.curriculumScore ?? 0;

  async function handleGenerate() {
    if (!selectedTsc) return;
    setPhase("generating");
    setGenerateError(null);
    const result = await runAiGenerate({
      klasse: selectedTsc.class.name,
      subject: selectedTsc.subject.name,
      topic: form.topic,
      duration: Number(form.duration),
      questionCount: form.questions,
      difficulty: form.difficulty.toLowerCase() as "leicht" | "mittel" | "schwer",
      types: form.taskTypes,
      goalHint: form.lernziel || undefined,
    });
    if (result.ok && result.result) {
      setExamResult(result.result);
      setPhase("done");
    } else {
      setGenerateError(result.error ?? "Unbekannter Fehler beim Generieren.");
      setPhase("idle");
    }
  }

  function handleReset() {
    setPhase("idle");
    setExamResult(null);
    setGenerateError(null);
    setSendResult(null);
  }

  function handleEmptyTemplate() {
    setForm({ ...DEFAULT_FORM, klasseId: form.klasseId });
    setPhase("idle");
    setExamResult(null);
    setGenerateError(null);
  }

  function handlePdf() {
    window.print();
  }

  async function handleSendToClass() {
    if (!selectedTsc || !examResult) return;
    setSending(true);
    setSendResult(null);
    try {
      const title = examResult.title ?? `${form.topic} · ${selectedTsc.class.name}`;
      const description = examResult.questions
        .map((q) => `Aufgabe ${q.number} (${q.points} P.) — ${q.type}\n${q.title}${q.expected ? `\n→ ${q.expected}` : ""}`)
        .join("\n\n");
      await sendToClass(selectedTsc.class.id, selectedTsc.subject.id, title, description, examResult.totalPoints);
      setSendResult("sent");
    } catch {
      setSendResult("error");
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
              disabled={phase === "generating" || !selectedTsc || !form.topic.trim()}
            >
              {phase === "generating" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Wand2 className="size-4" />
              )}
              {phase === "generating" ? "Generiert..." : "Generieren"}
            </Button>

            {generateError && (
              <p className="text-center text-xs font-semibold text-danger">{generateError}</p>
            )}

            <p className="text-center text-[10px] uppercase tracking-wider text-muted-fg">
              Verbraucht 1 Generator-Anfrage · {quotaLimit - quotaUsed} von {quotaLimit} frei
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

          {phase === "done" && examResult && (
            <>
              <CardHeader>
                <div>
                  <CardTitle>{examResult.title}</CardTitle>
                  <p className="mt-1 text-sm text-muted-fg">
                    {questions.length} Aufgaben · {totalPoints} Punkte · {expectedTime} Min.
                    {examResult.source === "mock" && (
                      <span className="ml-2 text-warning">· Mock-Modus</span>
                    )}
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
                    {sending ? "Sende..." : sendResult === "sent" ? "Gesendet ✓" : "An Klasse senden"}
                  </Button>
                </div>
                {sendResult === "error" && (
                  <p className="text-xs font-semibold text-danger">
                    Fehler beim Senden. Bitte erneut versuchen.
                  </p>
                )}
              </CardHeader>
              <CardBody className="px-0! pb-0!">
                <div className="border-t border-border bg-surface px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
                  Aufgaben
                </div>
                <ol className="divide-y divide-border">
                  {questions.map((q) => (
                    <li
                      key={q.number}
                      className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-surface lg:flex-row"
                    >
                      <div className="flex shrink-0 items-start gap-3 lg:flex-col lg:items-center">
                        <span className="grid size-8 place-items-center bg-fg text-bg font-mono text-xs font-bold">
                          {q.number}
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
                        {q.expected && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs text-muted-fg hover:text-fg">
                              Erwartungshorizont
                            </summary>
                            <p className="mt-1 text-xs text-muted-fg">{q.expected}</p>
                          </details>
                        )}
                        <div className="mt-2 flex gap-1.5">
                          <Button variant="ghost" size="sm">
                            <FileEdit className="size-3.5" />
                            Bearbeiten
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

                {examResult.rubric.length > 0 && (
                  <div className="border-t border-border p-5">
                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
                      Bewertungsraster
                    </p>
                    <ul className="space-y-1.5">
                      {examResult.rubric.map((r) => (
                        <li key={r.label} className="flex items-center justify-between text-xs">
                          <span>{r.label}</span>
                          <span className="font-mono text-muted-fg">{r.maxPoints} P.</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="border-t border-border p-5">
                  <div className="flex items-center gap-2 text-xs">
                    <Sparkles className="size-3.5 text-brand" />
                    <span className="font-semibold uppercase tracking-wider text-brand">
                      Lehrplan-Check
                    </span>
                  </div>
                  <ul className="mt-3 space-y-2 text-xs">
                    <CheckItem label={`${form.difficulty}e Schwierigkeit ausgewogen`} />
                    <CheckItem label={`${questions.length} Aufgaben · ${form.taskTypes.length} Typen`} />
                    <CheckItem label="Erwartungshorizonte für alle Aufgaben" />
                  </ul>
                  <Progress value={curriculumScore} tone={curriculumScore >= 80 ? "success" : "warning"} className="mt-4" />
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-fg">
                    {curriculumScore} % Lehrplan-Übereinstimmung
                  </p>
                </div>
              </CardBody>
            </>
          )}
        </Card>
      </div>

      {/* Recent assignments */}
      <Card>
        <CardHeader>
          <CardTitle>Letzte Aufgaben</CardTitle>
          <span className="font-mono text-xs text-muted-fg">{quotaUsed} von {quotaLimit} Anfragen verbraucht</span>
        </CardHeader>
        <CardBody className="px-0! pb-0!">
          {recentAssignments.length === 0 ? (
            <p className="border-t border-border px-5 py-8 text-center text-sm text-muted-fg">
              Noch keine Aufgaben erstellt.
            </p>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {recentAssignments.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-surface"
                >
                  <Avatar name="MasterMind KI" size="sm" className="bg-fg text-bg ring-fg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{r.title}</p>
                    <p className="text-xs text-muted-fg">
                      {r.klasse} · {r.submissionCount} Abgaben
                      {r.maxPoints != null ? ` · ${r.maxPoints} Punkte` : ""}
                    </p>
                  </div>
                  <span className="hidden font-mono text-[10px] uppercase tracking-wider text-muted-fg sm:inline">
                    {r.when}
                  </span>
                </li>
              ))}
            </ul>
          )}
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
