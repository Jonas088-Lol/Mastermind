import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FileCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { createConsentForm, toggleConsentForm } from "./actions";

export const metadata: Metadata = { title: "Einwilligungen · Admin" };

interface PageProps {
  searchParams: Promise<{ formId?: string; create?: string }>;
}

export default async function AdminEinwilligungenPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "admin") redirect(ROLE_HOME[effectiveRole(session)]);

  const { formId: selectedFormId, create: showCreateParam } = await searchParams;
  const schoolId = session.schoolId ?? "";
  const showCreate = showCreateParam === "1";

  const [forms, classes] = await Promise.all([
    prisma.consentForm.findMany({
      where: { schoolId },
      include: {
        responses: {
          select: { id: true, agreed: true, parent: { select: { id: true, name: true } }, student: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.schoolClass.findMany({
      where: { schoolId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Count total parents per school for response rate estimation
  const parentCount = await prisma.user.count({
    where: { schoolId, role: "parent" },
  });

  const selectedForm = selectedFormId ? forms.find((f) => f.id === selectedFormId) : null;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schul-Admin</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Einwilligungen</h1>
        <p className="mt-1 text-sm text-muted-fg">
          {forms.length} Formulare · {forms.filter((f) => f.isActive).length} aktiv
        </p>
      </header>

      {/* Create button */}
      <div className="flex justify-end">
        <Link href={showCreate ? "/admin/einwilligungen" : "/admin/einwilligungen?create=1"}>
          <Button variant="secondary" size="sm">
            <FileCheck className="size-4" />
            {showCreate ? "Abbrechen" : "Neues Formular"}
          </Button>
        </Link>
      </div>

      {/* Create Form */}
      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Neues Einwilligungsformular</CardTitle>
          </CardHeader>
          <CardBody>
            <form action={createConsentForm} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-fg">
                    Titel
                  </label>
                  <input
                    type="text"
                    name="title"
                    placeholder="z.B. Einwilligung Klassenfahrt 2026"
                    required
                    className="w-full border border-border bg-bg px-3 py-2 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-fg">
                    Beschreibung
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    placeholder="Bitte stimmen Sie der Teilnahme Ihres Kindes zu…"
                    required
                    className="w-full border border-border bg-bg px-3 py-2 text-sm resize-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-fg">
                    Frist (optional)
                  </label>
                  <input
                    type="date"
                    name="deadline"
                    className="w-full border border-border bg-bg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-fg">
                    Zielklassen (leer = alle)
                  </label>
                  <select
                    name="targetClassIds"
                    multiple
                    className="w-full border border-border bg-bg px-3 py-2 text-sm min-h-[80px]"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Button type="submit" variant="secondary">
                <FileCheck className="size-4" />
                Formular erstellen
              </Button>
            </form>
          </CardBody>
        </Card>
      )}

      {/* Forms list */}
      {forms.length === 0 ? (
        <Card>
          <CardBody>
            <p className="py-8 text-center text-sm text-muted-fg">
              Noch keine Einwilligungsformulare erstellt.
            </p>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Alle Formulare</CardTitle>
          </CardHeader>
          <CardBody className="!px-0 !pb-0">
            <ul className="divide-y divide-border border-t border-border">
              {forms.map((form) => {
                const responseCount = form.responses.length;
                const agreedCount = form.responses.filter((r) => r.agreed).length;
                const rate =
                  parentCount > 0 ? Math.round((responseCount / parentCount) * 100) : 0;
                const isSelected = selectedFormId === form.id;

                return (
                  <li key={form.id}>
                    <div
                      className={cn(
                        "flex items-start gap-4 px-5 py-4",
                        isSelected && "bg-surface"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">{form.title}</p>
                          <Badge variant={form.isActive ? "success" : "warning"}>
                            {form.isActive ? "Aktiv" : "Inaktiv"}
                          </Badge>
                          {form.deadline && (
                            <Badge
                              variant={
                                form.deadline < new Date() ? "danger" : "info"
                              }
                            >
                              Frist:{" "}
                              {form.deadline.toLocaleDateString("de-DE", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-fg line-clamp-2">
                          {form.description}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-fg">
                          {responseCount} Antworten · {agreedCount} zugestimmt ·{" "}
                          {responseCount - agreedCount} abgelehnt
                          {parentCount > 0 && ` · ${rate}% Rücklauf`}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Link
                          href={
                            isSelected
                              ? "/admin/einwilligungen"
                              : `/admin/einwilligungen?formId=${form.id}`
                          }
                        >
                          <Button size="sm" variant="ghost">
                            {isSelected ? "Schließen" : "Antworten"}
                          </Button>
                        </Link>
                        <form action={toggleConsentForm.bind(null, form.id)}>
                          <Button size="sm" variant="ghost" type="submit">
                            {form.isActive ? "Deaktivieren" : "Aktivieren"}
                          </Button>
                        </form>
                      </div>
                    </div>

                    {/* Response details */}
                    {isSelected && form.responses.length > 0 && (
                      <div className="border-t border-dashed border-border bg-surface px-5 py-4">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-fg">
                          Antworten ({form.responses.length})
                        </p>
                        <ul className="space-y-2">
                          {form.responses.map((r) => (
                            <li
                              key={r.id}
                              className="flex items-center gap-3 text-sm"
                            >
                              <Badge variant={r.agreed ? "success" : "danger"}>
                                {r.agreed ? "Zugestimmt" : "Abgelehnt"}
                              </Badge>
                              <span className="font-medium">{r.parent.name}</span>
                              <span className="text-muted-fg">
                                für {r.student.name}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {isSelected && form.responses.length === 0 && (
                      <div className="border-t border-dashed border-border bg-surface px-5 py-4">
                        <p className="text-sm text-muted-fg">
                          Noch keine Antworten eingegangen.
                        </p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
