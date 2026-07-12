/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { Check, Copy, Globe, Loader2, Lock, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTemplate, deleteTemplate, toggleShared } from "./actions";

export interface TemplateItem {
  id: string;
  title: string;
  description: string | null;
  subjectName: string | null;
  teacherName: string;
  shared: boolean;
  own: boolean;
  taskText: string;
  type: string;
  maxPoints: number | null;
  createdAt: string;
}

const TYPE_LABEL: Record<string, string> = {
  homework: "Hausaufgabe",
  test: "Test",
  project: "Projekt",
};

export function VorlagenClient({ mine, shared }: { mine: TemplateItem[]; shared: TemplateItem[] }) {
  const [tab, setTab] = useState<"mine" | "shared">("mine");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createTemplate(formData);
      if (!res.ok) setError(res.error ?? "Fehler beim Speichern");
      else setShowForm(false);
    });
  }

  function handleToggle(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await toggleShared(id);
      if (!res.ok) setError(res.error ?? "Fehler");
    });
  }

  function handleDelete(id: string) {
    if (!window.confirm("Vorlage wirklich löschen?")) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteTemplate(id);
      if (!res.ok) setError(res.error ?? "Fehler beim Löschen");
    });
  }

  const list = tab === "mine" ? mine : shared;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border">
          <TabButton active={tab === "mine"} onClick={() => setTab("mine")}>
            Meine Vorlagen ({mine.length})
          </TabButton>
          <TabButton active={tab === "shared"} onClick={() => setTab("shared")}>
            Schulweite Vorlagen ({shared.length})
          </TabButton>
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="size-3.5" />
          Neue Vorlage
        </Button>
      </div>

      {error && (
        <p className="rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-danger">
          {error}
        </p>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Neue Vorlage</CardTitle>
          </CardHeader>
          <CardBody>
            <form action={handleCreate} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="tpl-title">Titel *</Label>
                  <Input id="tpl-title" name="title" required maxLength={200} placeholder="z. B. Lesetagebuch Kapitel-Aufgabe" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tpl-subject">Fach</Label>
                  <Input id="tpl-subject" name="subjectName" maxLength={100} placeholder="z. B. Deutsch" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tpl-desc">Beschreibung</Label>
                <textarea
                  id="tpl-desc"
                  name="description"
                  rows={2}
                  maxLength={2000}
                  className="w-full resize-y rounded-xl border border-border bg-bg p-2.5 text-sm focus:border-fg/30 focus:outline-none"
                  placeholder="Wofür ist diese Vorlage gedacht?"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tpl-text">Aufgabentext</Label>
                <textarea
                  id="tpl-text"
                  name="taskText"
                  rows={5}
                  maxLength={8000}
                  className="w-full resize-y rounded-xl border border-border bg-bg p-2.5 text-sm focus:border-fg/30 focus:outline-none"
                  placeholder="Der eigentliche Aufgabentext, der später in die Aufgabe kopiert wird."
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="tpl-type">Aufgabentyp</Label>
                  <select
                    id="tpl-type"
                    name="type"
                    className="h-10 w-full rounded-xl border border-border bg-bg px-3 text-sm focus:border-fg/30 focus:outline-none"
                  >
                    <option value="homework">Hausaufgabe</option>
                    <option value="test">Test</option>
                    <option value="project">Projekt</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tpl-points">Max. Punkte</Label>
                  <Input id="tpl-points" name="maxPoints" type="number" min={0} max={1000} />
                </div>
                <label className="flex items-center gap-2 pt-6 text-sm">
                  <input type="checkbox" name="shared" className="size-4 accent-current" />
                  Schulweit teilen
                </label>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={pending}>
                  {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                  Speichern
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                  Abbrechen
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <p className="font-semibold">
            {tab === "mine" ? "Noch keine eigenen Vorlagen" : "Noch keine schulweiten Vorlagen"}
          </p>
          <p className="mt-1 text-sm text-muted-fg">
            {tab === "mine"
              ? "Erstelle deine erste Vorlage über den Button oben."
              : "Sobald Kolleg:innen Vorlagen teilen, erscheinen sie hier."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((t) => (
            <TemplateCard
              key={t.id}
              tpl={t}
              pending={pending}
              onToggle={() => handleToggle(t.id)}
              onDelete={() => handleDelete(t.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateCard({
  tpl,
  pending,
  onToggle,
  onDelete,
}: {
  tpl: TemplateItem;
  pending: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-bg p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{tpl.title}</p>
          <p className="mt-0.5 text-xs text-muted-fg">
            {tpl.subjectName ? `${tpl.subjectName} · ` : ""}
            {tpl.teacherName} · {tpl.createdAt}
          </p>
        </div>
        <Badge variant={tpl.shared ? "brand" : "outline"}>
          {tpl.shared ? "Schulweit" : "Privat"}
        </Badge>
      </div>

      {tpl.description && <p className="text-xs text-muted-fg">{tpl.description}</p>}
      <p className="text-xs text-muted-fg">
        {TYPE_LABEL[tpl.type] ?? tpl.type}
        {tpl.maxPoints != null ? ` · ${tpl.maxPoints} Punkte` : ""}
      </p>

      <div className="mt-auto flex flex-wrap gap-2">
        <Button size="xs" variant="outline" onClick={() => setOpen((v) => !v)}>
          Als Aufgabe verwenden
        </Button>
        {tpl.own && (
          <>
            <Button size="xs" variant="ghost" onClick={onToggle} disabled={pending}>
              {tpl.shared ? <Lock className="size-3" /> : <Globe className="size-3" />}
              {tpl.shared ? "Privat schalten" : "Teilen"}
            </Button>
            <Button size="xs" variant="ghost" onClick={onDelete} disabled={pending} className="text-danger">
              <Trash2 className="size-3" />
              Löschen
            </Button>
          </>
        )}
      </div>

      {open && (
        <div className="space-y-3 rounded-xl border border-border bg-surface p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
            Felder kopieren und unter „Aufgaben → Neue Aufgabe“ einfügen
          </p>
          <CopyField label="Titel" value={tpl.title} />
          {tpl.taskText && <CopyField label="Aufgabentext" value={tpl.taskText} multiline />}
          {tpl.maxPoints != null && <CopyField label="Max. Punkte" value={String(tpl.maxPoints)} />}
        </div>
      )}
    </div>
  );
}

function CopyField({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard nicht verfügbar — ignorieren
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">{label}</span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-fg hover:text-fg"
        >
          {copied ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
          {copied ? "Kopiert" : "Kopieren"}
        </button>
      </div>
      <p className={`rounded-lg border border-border bg-bg p-2 text-xs ${multiline ? "whitespace-pre-wrap" : "truncate"}`}>
        {value}
      </p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-xs font-semibold transition-colors ${
        active ? "bg-fg text-bg" : "bg-bg text-muted-fg hover:bg-surface"
      }`}
    >
      {children}
    </button>
  );
}
