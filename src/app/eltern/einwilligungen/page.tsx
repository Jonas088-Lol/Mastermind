/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock, XCircle, FileText } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { respondToConsent } from "./actions";

export const metadata: Metadata = { title: "Einwilligungen · Eltern" };

export default async function EinwilligungenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "parent") redirect(ROLE_HOME[effectiveRole(session)]);

  const now = new Date();

  const links = await prisma.parentStudentLink.findMany({
    where: { parentId: session.userId },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          schoolId: true,
          classId: true,
          schoolClass: { select: { name: true } },
        },
      },
    },
    orderBy: { student: { name: "asc" } },
  });

  const schoolIds = [...new Set(links.map((l) => l.student.schoolId).filter(Boolean))] as string[];
  const childClassIds = [...new Set(links.map((l) => l.student.classId).filter(Boolean))] as string[];

  // Fetch active consent forms for this school
  const allForms = schoolIds.length > 0
    ? await prisma.consentForm.findMany({
        where: {
          schoolId: { in: schoolIds },
          isActive: true,
        },
        include: {
          responses: {
            where: { parentId: session.userId },
          },
        },
        orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
      })
    : [];

  // Filter forms relevant to children's classes
  const forms = allForms.filter((form) => {
    if (!form.targetClassIds) return true; // applies to all
    try {
      const ids = JSON.parse(form.targetClassIds) as string[];
      return childClassIds.some((cid) => ids.includes(cid));
    } catch {
      return true;
    }
  });

  const isOverdue = (deadline: Date | null) =>
    deadline !== null && deadline < now;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schule</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Einwilligungen</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Zustimmungen und Ablehnungen für schulische Formulare.
        </p>
      </header>

      {links.length === 0 && (
        <p className="text-sm text-muted-fg">Kein Kind mit deinem Konto verknüpft.</p>
      )}

      {forms.length === 0 && links.length > 0 && (
        <p className="text-sm text-muted-fg">Aktuell keine offenen Einwilligungsformulare.</p>
      )}

      <div className="flex flex-col gap-6">
        {forms.map((form) => {
          const overdue = isOverdue(form.deadline);

          return (
            <Card key={form.id}>
              <CardHeader>
                <div className="flex flex-col gap-1.5">
                  <h2 className="font-semibold text-fg">{form.title}</h2>
                  {form.createdByName && (
                    <p className="text-xs text-muted-fg">von {form.createdByName}</p>
                  )}
                  <p className="whitespace-pre-line text-sm text-muted-fg">{form.description}</p>
                  {form.fileUrl && (
                    <a
                      href={form.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-brand transition-colors hover:border-brand/40 hover:bg-surface"
                    >
                      <FileText className="size-3.5" />
                      {form.fileName ?? "Elternbrief öffnen"}
                    </a>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {form.deadline && (
                    <Badge variant={overdue ? "danger" : "warning"}>
                      <Clock className="size-2.5" strokeWidth={2.5} />
                      {overdue ? "Abgelaufen" : `Bis ${form.deadline.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}`}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardBody className="px-0! pb-0!">
                <ul className="divide-y divide-border border-t border-border">
                  {links.map(({ student }) => {
                    const response = form.responses.find(
                      (r) => r.studentId === student.id
                    );
                    const isPending = !response;
                    const hasAgreed = response?.agreed === true;
                    const hasRejected = response?.agreed === false;

                    return (
                      <li key={student.id} className="flex items-center gap-4 px-5 py-3.5 text-sm">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{student.name}</p>
                          {student.schoolClass && (
                            <p className="text-xs text-muted-fg">Klasse {student.schoolClass.name}</p>
                          )}
                        </div>

                        {/* Response status */}
                        {hasAgreed && (
                          <div className="flex items-center gap-1.5 text-success">
                            <CheckCircle2 className="size-4 shrink-0" strokeWidth={1.75} />
                            <span className="text-xs font-medium">Zugestimmt</span>
                          </div>
                        )}
                        {hasRejected && (
                          <div className="flex items-center gap-1.5 text-danger">
                            <XCircle className="size-4 shrink-0" strokeWidth={1.75} />
                            <span className="text-xs font-medium">Abgelehnt</span>
                          </div>
                        )}
                        {isPending && (
                          <span className="flex items-center gap-1.5 text-muted-fg">
                            <Clock className="size-4 shrink-0" strokeWidth={1.75} />
                            <span className="text-xs font-medium">Ausstehend</span>
                          </span>
                        )}

                        {/* Action buttons */}
                        {!overdue && (
                          <div className="flex items-center gap-2">
                            {!hasAgreed && (
                              <form
                                action={async () => {
                                  "use server";
                                  await respondToConsent(form.id, student.id, true);
                                }}
                              >
                                <button
                                  type="submit"
                                  className={cn(
                                    "px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80",
                                    hasRejected
                                      ? "bg-success/15 text-success"
                                      : "bg-fg text-bg"
                                  )}
                                >
                                  Zustimmen
                                </button>
                              </form>
                            )}
                            {!hasRejected && (
                              <form
                                action={async () => {
                                  "use server";
                                  await respondToConsent(form.id, student.id, false);
                                }}
                              >
                                <button
                                  type="submit"
                                  className={cn(
                                    "px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80",
                                    hasAgreed
                                      ? "bg-danger/15 text-danger"
                                      : "border border-border text-muted-fg hover:text-fg"
                                  )}
                                >
                                  Ablehnen
                                </button>
                              </form>
                            )}
                            {(hasAgreed || hasRejected) && (
                              <form
                                action={async () => {
                                  "use server";
                                  await respondToConsent(
                                    form.id,
                                    student.id,
                                    hasAgreed ? false : true
                                  );
                                }}
                              >
                                <button
                                  type="submit"
                                  className="text-xs text-muted-fg underline-offset-2 hover:underline"
                                >
                                  Ändern
                                </button>
                              </form>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
