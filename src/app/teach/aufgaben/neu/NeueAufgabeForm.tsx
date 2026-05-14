"use client";

import { useState, useTransition } from "react";
import { CalendarClock, ClipboardList, Loader2, Save, Send, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAssignment } from "./actions";

interface ClassOption {
  id: string;
  name: string;
  subjects: { id: string; name: string }[];
  studentCount: number;
}

const TYPES = [
  { value: "homework", label: "Hausaufgabe" },
  { value: "test", label: "Test" },
  { value: "project", label: "Projekt" },
  { value: "exam", label: "Klassenarbeit" },
];

export function NeueAufgabeForm({ classes }: { classes: ClassOption[] }) {
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();
  const [aiOn, setAiOn] = useState(true);
  const [lateOn, setLateOn] = useState(true);
  const [reminderOn, setReminderOn] = useState(true);

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const subjects = selectedClass?.subjects ?? [];

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await createAssignment(fd);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <Card>
        <CardHeader><CardTitle>Grunddaten</CardTitle></CardHeader>
        <CardBody className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="title">Titel *</Label>
            <Input id="title" name="title" placeholder="z. B. Aufgabe 6 — Quadratische Gleichungen" required />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="classId">Klasse *</Label>
              <select
                id="classId"
                name="classId"
                required
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="h-10 w-full border border-border bg-bg px-3 text-sm focus:border-fg/30 focus:outline-none"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.studentCount} Schüler)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="subjectId">Fach *</Label>
              <select
                id="subjectId"
                name="subjectId"
                required
                className="h-10 w-full border border-border bg-bg px-3 text-sm focus:border-fg/30 focus:outline-none"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="type">Typ</Label>
              <select
                id="type"
                name="type"
                className="h-10 w-full border border-border bg-bg px-3 text-sm focus:border-fg/30 focus:outline-none"
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dueAt">Abgabetermin *</Label>
              <Input id="dueAt" name="dueAt" type="datetime-local" required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="maxPoints">Max. Punkte (optional)</Label>
              <Input id="maxPoints" name="maxPoints" type="number" min="1" max="999" placeholder="z. B. 20" />
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aufgabenstellung</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="border border-border bg-bg focus-within:border-fg/30">
            <textarea
              name="description"
              rows={8}
              placeholder="Formuliere die Aufgabenstellung…"
              className="w-full resize-y bg-transparent p-3 text-sm leading-relaxed focus:outline-none"
            />
            <div className="flex items-center border-t border-border px-3 py-2">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-fg">
                Markdown · LaTeX unterstützt
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Optionen</CardTitle></CardHeader>
        <CardBody className="space-y-3">
          <ToggleRow
            name="aiCorrection"
            label="KI-Vorkorrektur aktiviert"
            detail="Automatische Vorbewertung · du behältst die Endkontrolle"
            checked={aiOn}
            onChange={setAiOn}
          />
          <ToggleRow
            name="lateAllowed"
            label="Späte Abgaben akzeptieren"
            detail="Mit Hinweis für den Schüler"
            checked={lateOn}
            onChange={setLateOn}
          />
          <ToggleRow
            name="reminder"
            label="Auto-Reminder 2 Std. vor Abgabe"
            detail="Push an alle, die noch nicht abgegeben haben"
            checked={reminderOn}
            onChange={setReminderOn}
          />
        </CardBody>
      </Card>

      <div className="flex flex-col items-center gap-2 border-t border-border pt-6 sm:flex-row sm:justify-between">
        {selectedClass && (
          <p className="flex items-center gap-2 text-xs text-muted-fg">
            <CalendarClock className="size-3.5" />
            Wird sofort veröffentlicht und benachrichtigt {selectedClass.studentCount} Schüler in {selectedClass.name}
          </p>
        )}
        <div className="flex gap-2 sm:ml-auto">
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            Aufgabe veröffentlichen
          </Button>
        </div>
      </div>
    </form>
  );
}

function ToggleRow({
  name,
  label,
  detail,
  checked,
  onChange,
}: {
  name: string;
  label: string;
  detail: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-border py-3 last:border-b-0">
      <input type="hidden" name={name} value="off" />
      <input type="checkbox" name={name} value="on" checked={checked} onChange={() => onChange(!checked)} className="sr-only" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-0.5 text-xs text-muted-fg">{detail}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 transition-colors ${checked ? "bg-brand" : "bg-border"}`}
      >
        <span
          className={`absolute top-0.5 size-4 bg-bg transition-[left] ${checked ? "left-[18px]" : "left-0.5"}`}
        />
      </button>
    </div>
  );
}
