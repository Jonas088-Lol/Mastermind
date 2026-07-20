/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, FileText, Upload, Users } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { isAiConfigured } from "@/lib/ai";
import { can } from "@/lib/permissions";
import { ElternbriefClient } from "./ElternbriefClient";
import { publishParentLetter, withdrawParentLetter } from "./letter-actions";

export const metadata: Metadata = { title: "Elternbriefe" };

export default async function ElternbriefPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  const { error, sent } = await searchParams;
  const mayPublish = await can(session, "teacher.parent_letters");

  // Klassen der Lehrkraft + eigene bereits eingestellte Briefe
  const [classLinks, letters] = await Promise.all([
    mayPublish
      ? prisma.teacherSubjectClass.findMany({
          where: { teacherId: session.userId },
          select: { class: { select: { id: true, name: true } } },
        })
      : Promise.resolve([]),
    mayPublish
      ? prisma.consentForm.findMany({
          where: { schoolId: session.schoolId ?? "", createdById: session.userId },
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            id: true,
            title: true,
            isActive: true,
            fileUrl: true,
            fileName: true,
            deadline: true,
            _count: { select: { responses: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  // Eine Lehrkraft unterrichtet dieselbe Klasse oft in mehreren Fächern.
  const classes = [...new Map(classLinks.map((l) => [l.class.id, l.class])).values()].sort(
    (a, b) => a.name.localeCompare(b.name),
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Lehrer</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Elternbriefe</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Brief verfassen oder hochladen — Eltern bekommen eine Benachrichtigung und bestätigen digital.
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}
      {sent && (
        <div className="rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
          Elternbrief eingestellt — {sent} Elternteil(e) benachrichtigt.
        </div>
      )}

      {/* ── Einstellen ────────────────────────────────────────────────────── */}
      {mayPublish ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="size-4 text-brand" strokeWidth={1.75} />
              Elternbrief einstellen
            </CardTitle>
          </CardHeader>
          <CardBody>
            {classes.length === 0 ? (
              <p className="text-sm text-muted-fg">
                Dir ist noch keine Klasse zugeordnet — wende dich an das Sekretariat.
              </p>
            ) : (
              <form action={publishParentLetter} className="flex flex-col gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pl-title">Titel</Label>
                  <Input
                    id="pl-title"
                    name="title"
                    required
                    maxLength={140}
                    placeholder="z. B. Wandertag am 12. Mai"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pl-desc">Text</Label>
                  <textarea
                    id="pl-desc"
                    name="description"
                    required
                    rows={6}
                    className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg outline-none transition-colors placeholder:text-muted-fg focus:border-brand"
                    placeholder="Inhalt des Elternbriefs — auch als Begleittext zur angehängten Datei."
                  />
                  <p className="text-xs text-muted-fg">
                    Tipp: Den Text kannst du dir unten vom Generator vorschreiben lassen.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="pl-file">Datei (optional)</Label>
                    <Input
                      id="pl-file"
                      name="file"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                    />
                    <p className="text-xs text-muted-fg">PDF, PNG, JPEG oder WebP · max. 10 MB</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pl-deadline">Rückmeldung bis (optional)</Label>
                    <Input id="pl-deadline" name="deadline" type="date" />
                  </div>
                </div>

                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">Klassen</legend>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {classes.map((c) => (
                      <label
                        key={c.id}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm transition-colors hover:border-brand/40"
                      >
                        <input
                          type="checkbox"
                          name="classIds"
                          value={c.id}
                          className="accent-brand"
                        />
                        <span className="truncate">{c.name}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <Button type="submit" className="w-full sm:w-auto">
                  Einstellen &amp; Eltern benachrichtigen
                </Button>
              </form>
            )}
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="flex items-start gap-3">
            <Users className="mt-0.5 size-4 shrink-0 text-muted-fg" strokeWidth={1.75} />
            <p className="text-sm text-muted-fg">
              Das Einstellen eigener Elternbriefe ist an deiner Schule der Verwaltung vorbehalten.
              Die Schulleitung kann dir dieses Recht unter <strong>Rechte</strong> erteilen.
            </p>
          </CardBody>
        </Card>
      )}

      {/* ── Eigene Briefe ─────────────────────────────────────────────────── */}
      {mayPublish && letters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Deine Elternbriefe</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col divide-y divide-border">
            {letters.map((l) => (
              <div
                key={l.id}
                className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <span className="truncate">{l.title}</span>
                    {!l.isActive && (
                      <span className="shrink-0 rounded bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted-fg">
                        zurückgezogen
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-fg">
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="size-3" />
                      {l._count.responses} Rückmeldung(en)
                    </span>
                    {l.fileUrl && (
                      <a
                        href={l.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-brand hover:underline"
                      >
                        <FileText className="size-3" />
                        {l.fileName ?? "Datei"}
                      </a>
                    )}
                    {l.deadline && <span>Frist: {l.deadline.toLocaleDateString("de-DE")}</span>}
                  </p>
                </div>
                {l.isActive && (
                  <form action={withdrawParentLetter} className="shrink-0">
                    <input type="hidden" name="id" value={l.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-danger transition-colors hover:border-danger/40 hover:bg-danger/10"
                    >
                      Zurückziehen
                    </button>
                  </form>
                )}
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {/* ── KI-Generator (unverändert) ────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
          Text-Generator
        </h2>
        <ElternbriefClient aiConfigured={isAiConfigured()} />
      </div>
    </div>
  );
}
