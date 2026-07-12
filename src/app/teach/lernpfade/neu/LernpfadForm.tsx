/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { createLearningPath } from "../actions";

interface Question {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

interface Module {
  title: string;
  questions: Question[];
}

interface Subject {
  id: string;
  name: string;
}

function emptyQuestion(): Question {
  return { question: "", options: ["", "", "", ""], correct: 0, explanation: "" };
}

function emptyModule(): Module {
  return { title: "", questions: [emptyQuestion()] };
}

export function LernpfadForm({ subjects }: { subjects: Subject[] }) {
  const [modules, setModules] = useState<Module[]>([emptyModule()]);

  function updateModule(mi: number, patch: Partial<Module>) {
    setModules((ms) => ms.map((m, i) => (i === mi ? { ...m, ...patch } : m)));
  }

  function updateQuestion(mi: number, qi: number, patch: Partial<Question>) {
    setModules((ms) =>
      ms.map((m, i) =>
        i !== mi
          ? m
          : { ...m, questions: m.questions.map((q, j) => (j === qi ? { ...q, ...patch } : q)) }
      )
    );
  }

  function updateOption(mi: number, qi: number, oi: number, value: string) {
    setModules((ms) =>
      ms.map((m, i) =>
        i !== mi
          ? m
          : {
              ...m,
              questions: m.questions.map((q, j) =>
                j !== qi
                  ? q
                  : { ...q, options: q.options.map((o, k) => (k === oi ? value : o)) }
              ),
            }
      )
    );
  }

  async function handleSubmit(formData: FormData) {
    formData.set("modules", JSON.stringify(modules));
    await createLearningPath(formData);
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-fg">
            Titel *
          </label>
          <input
            name="title"
            required
            className="border border-border bg-bg px-3 py-2 text-sm focus:border-brand focus:outline-none"
            placeholder="z.B. Quadratische Funktionen"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-fg">
            Fach *
          </label>
          <select
            name="subjectId"
            required
            className="border border-border bg-bg px-3 py-2 text-sm focus:border-brand focus:outline-none"
          >
            <option value="">Fach wählen …</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-fg">
          Beschreibung
        </label>
        <textarea
          name="description"
          rows={2}
          className="border border-border bg-bg px-3 py-2 text-sm focus:border-brand focus:outline-none"
          placeholder="Kurze Beschreibung …"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Module ({modules.length})</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setModules((ms) => [...ms, emptyModule()])}
          >
            <Plus className="size-3.5" />
            Modul hinzufügen
          </Button>
        </div>

        {modules.map((m, mi) => (
          <Card key={mi}>
            <CardHeader>
              <div className="flex flex-1 items-center gap-3">
                <span className="grid size-7 shrink-0 place-items-center border border-border font-mono text-xs font-bold">
                  {mi + 1}
                </span>
                <input
                  value={m.title}
                  onChange={(e) => updateModule(mi, { title: e.target.value })}
                  className="flex-1 border-b border-border bg-transparent text-sm font-semibold focus:border-brand focus:outline-none"
                  placeholder="Modul-Titel …"
                />
              </div>
              {modules.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setModules((ms) => ms.filter((_, i) => i !== mi))}
                >
                  <Trash2 className="size-4 text-muted-fg" />
                </Button>
              )}
            </CardHeader>
            <CardBody className="space-y-4">
              {m.questions.map((q, qi) => (
                <div key={qi} className="space-y-3 border border-border p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">
                      Frage {qi + 1}
                    </p>
                    {m.questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          updateModule(mi, {
                            questions: m.questions.filter((_, j) => j !== qi),
                          })
                        }
                        className="text-danger hover:opacity-70"
                        aria-label="Frage löschen"
                      >
                        <Minus className="size-4" />
                      </button>
                    )}
                  </div>
                  <input
                    value={q.question}
                    onChange={(e) => updateQuestion(mi, qi, { question: e.target.value })}
                    className="w-full border-b border-border bg-transparent text-sm focus:border-brand focus:outline-none"
                    placeholder="Fragetext …"
                  />
                  <div className="grid gap-2">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${mi}-${qi}`}
                          checked={q.correct === oi}
                          onChange={() => updateQuestion(mi, qi, { correct: oi })}
                          className="accent-brand"
                          aria-label={`Option ${oi + 1} als korrekt markieren`}
                        />
                        <input
                          value={opt}
                          onChange={(e) => updateOption(mi, qi, oi, e.target.value)}
                          className="flex-1 border-b border-border bg-transparent text-sm focus:border-brand focus:outline-none"
                          placeholder={`Option ${String.fromCharCode(65 + oi)} …`}
                        />
                      </div>
                    ))}
                  </div>
                  <input
                    value={q.explanation}
                    onChange={(e) => updateQuestion(mi, qi, { explanation: e.target.value })}
                    className="w-full border-b border-border bg-transparent text-xs text-muted-fg focus:border-brand focus:outline-none"
                    placeholder="Erklärung (optional) …"
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  updateModule(mi, { questions: [...m.questions, emptyQuestion()] })
                }
              >
                <Plus className="size-3.5" />
                Frage hinzufügen
              </Button>
            </CardBody>
          </Card>
        ))}
      </div>

      <Button type="submit" className="w-full">
        Lernpfad erstellen
      </Button>
    </form>
  );
}
