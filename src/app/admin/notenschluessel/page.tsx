/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Check, Star, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { saveGradeScale, setDefaultGradeScale, deleteGradeScale } from "./actions";
import { canManageSchool, canAccessArea } from "@/lib/school-admin";

export const metadata: Metadata = { title: "Notenschlüssel · Schulverwaltung" };

const DEFAULT_ENTRIES = [
  { grade: 1, label: "Sehr gut",     minPercent: 87 },
  { grade: 2, label: "Gut",          minPercent: 73 },
  { grade: 3, label: "Befriedigend", minPercent: 59 },
  { grade: 4, label: "Ausreichend",  minPercent: 45 },
  { grade: 5, label: "Mangelhaft",   minPercent: 18 },
  { grade: 6, label: "Ungenügend",   minPercent: 0  },
];

interface PageProps {
  searchParams: Promise<{ edit?: string }>;
}

export default async function AdminNotenschluesselPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session || !canManageSchool(effectiveRole(session))) redirect("/admin");
  if (!canAccessArea(effectiveRole(session), "notenschluessel")) redirect("/admin");

  const { edit } = await searchParams;

  const scales = await prisma.gradeScale.findMany({
    where: { schoolId: session.schoolId ?? "" },
    include: { entries: { orderBy: { grade: "asc" } } },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  // Bearbeiten, wenn ein eigener Schlüssel gewählt ist — sonst neu anlegen.
  const editing = edit ? scales.find((s) => s.id === edit) ?? null : null;
  const entries = editing?.entries.length ? editing.entries : DEFAULT_ENTRIES;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
          Schulverwaltung
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Notenschlüssel</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Lege fest, ab wie viel Prozent welche Note vergeben wird. Du kannst mehrere
          Schlüssel anlegen — etwa je einen für den R- und den M-Zweig. Lehrkräfte
          wählen beim Korrigieren den passenden aus.
        </p>
      </header>

      {/* ── Vorhandene Schlüssel ─────────────────────────────────────────── */}
      {scales.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vorhandene Schlüssel · {scales.length}</CardTitle>
          </CardHeader>
          <CardBody className="px-0! pb-0!">
            <ul className="divide-y divide-border border-t border-border">
              {scales.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold">{s.name}</p>
                      {s.isDefault && <Badge variant="brand">Standard</Badge>}
                    </div>
                    {s.description && (
                      <p className="truncate text-xs text-muted-fg">{s.description}</p>
                    )}
                    <p className="mt-0.5 text-xs text-muted-fg">
                      {s.entries.length} Stufen · zuletzt{" "}
                      {s.updatedAt.toLocaleDateString("de-DE", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <a
                      href={`/admin/notenschluessel?edit=${s.id}`}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition-colors hover:border-brand/40 hover:bg-surface"
                    >
                      Bearbeiten
                    </a>
                    {!s.isDefault && (
                      <>
                        <form action={setDefaultGradeScale}>
                          <input type="hidden" name="id" value={s.id} />
                          <button
                            type="submit"
                            title="Als Standard festlegen"
                            className="grid size-8 place-items-center rounded-lg border border-border text-muted-fg transition-colors hover:border-brand/40 hover:text-brand"
                          >
                            <Star className="size-3.5" />
                          </button>
                        </form>
                        <form action={deleteGradeScale}>
                          <input type="hidden" name="id" value={s.id} />
                          <button
                            type="submit"
                            title="Schlüssel löschen"
                            className="grid size-8 place-items-center rounded-lg border border-border text-muted-fg transition-colors hover:border-danger/40 hover:bg-danger/10 hover:text-danger"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </form>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {/* ── Anlegen / Bearbeiten ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>
              {editing ? `„${editing.name}" bearbeiten` : "Neuen Schlüssel anlegen"}
            </CardTitle>
            <p className="mt-0.5 text-sm text-muted-fg">
              Jede Note erhält einen Mindestwert in Prozent.
            </p>
          </div>
          {editing && (
            <a href="/admin/notenschluessel" className="text-xs text-muted-fg hover:text-fg">
              Abbrechen
            </a>
          )}
        </CardHeader>
        <CardBody>
          <form action={saveGradeScale} className="flex flex-col gap-5">
            {editing && <input type="hidden" name="id" value={editing.id} />}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="name" className="text-sm font-semibold">Name</label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editing?.name ?? ""}
                  placeholder="z. B. Notenschlüssel R-Zweig"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="description" className="text-sm font-semibold">
                  Beschreibung <span className="font-normal text-muted-fg">(optional)</span>
                </label>
                <Input
                  id="description"
                  name="description"
                  defaultValue={editing?.description ?? ""}
                  placeholder="z. B. Realschulzweig, Jahrgang 7–10"
                />
              </div>
            </div>

            {/* Notenstufen */}
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold">Noten &amp; Mindestwerte</p>
              <div className="overflow-hidden rounded-xl border border-border">
                <div className="grid grid-cols-[40px_1fr_110px] border-b border-border bg-surface px-4 py-2 text-xs font-semibold text-muted-fg sm:grid-cols-[40px_1fr_130px]">
                  <span>Note</span>
                  <span>Bezeichnung</span>
                  <span>Ab % (≥)</span>
                </div>
                {entries.map((e) => (
                  <div
                    key={e.grade}
                    className="grid grid-cols-[40px_1fr_110px] items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0 sm:grid-cols-[40px_1fr_130px]"
                  >
                    <span className="text-lg font-bold">{e.grade}</span>
                    <Input name={`label_${e.grade}`} defaultValue={e.label} required className="h-8 text-sm" />
                    <Input
                      name={`minPercent_${e.grade}`}
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      defaultValue={e.minPercent}
                      required
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-fg">
                Note 6 sollte immer bei 0 % beginnen. Die Werte müssen von oben nach unten abnehmen.
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isDefault"
                defaultChecked={editing?.isDefault ?? scales.length === 0}
                className="size-4 accent-brand"
              />
              Als Standard für die Schule verwenden
            </label>

            <button
              type="submit"
              className="inline-flex items-center gap-2 self-start rounded-xl bg-fg px-5 py-2.5 text-sm font-semibold text-bg hover:bg-fg/90"
            >
              <Check className="size-4" />
              {editing ? "Änderungen speichern" : "Schlüssel anlegen"}
            </button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
