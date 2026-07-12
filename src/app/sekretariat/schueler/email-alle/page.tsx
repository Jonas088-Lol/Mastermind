/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Mail, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { sendBulkStudentEmail } from "./actions";

export const metadata: Metadata = { title: "E-Mail an Schüler · Sekretariat" };

interface PageProps {
  searchParams: Promise<{ sent?: string; error?: string }>;
}

export default async function EmailAllePage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (role !== "secretary" && role !== "rector" && role !== "vice_rector" && role !== "admin" && role !== "super") {
    redirect("/login");
  }

  const { sent, error } = await searchParams;
  const schoolId = session.schoolId ?? "";

  const [school, classes, studentCount] = await Promise.all([
    prisma.school.findUnique({
      where: { id: schoolId },
      select: { mailboxAddress: true, mailboxName: true },
    }),
    prisma.schoolClass.findMany({
      where: { schoolId },
      select: { id: true, name: true, _count: { select: { students: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.user.count({ where: { schoolId, role: "student" } }),
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <header>
        <Link
          href="/sekretariat/schueler"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          Schüler
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">E-Mail an Schüler</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Sende eine E-Mail an alle oder eine Klasse ({studentCount} Schüler gesamt).
        </p>
      </header>

      {sent && (
        <div className="flex items-center gap-3 border border-success/30 bg-success/8 px-4 py-3 text-sm">
          <CheckCircle2 className="size-4 shrink-0 text-success" strokeWidth={1.75} />
          <span className="font-medium text-success">
            {sent} E-Mail{sent === "1" ? "" : "s"} erfolgreich gesendet.
          </span>
        </div>
      )}

      {error === "no-mailbox" && (
        <div className="flex items-center gap-3 border border-warning/30 bg-warning/5 px-4 py-3 text-sm">
          <TriangleAlert className="size-4 shrink-0 text-warning" strokeWidth={1.75} />
          <span>
            Kein Schulpostfach konfiguriert.{" "}
            <Link href="/admin/postfach/einstellungen" className="font-medium text-fg underline underline-offset-2">
              Einstellungen öffnen
            </Link>
          </span>
        </div>
      )}

      {!school?.mailboxAddress ? (
        <div className="border border-dashed border-border p-12 text-center">
          <Mail className="mx-auto size-8 text-muted-fg" strokeWidth={1.5} />
          <p className="mt-4 font-semibold">Kein Postfach konfiguriert</p>
          <p className="mt-1 text-sm text-muted-fg">
            Hinterlege eine Absender-Adresse in den Postfach-Einstellungen.
          </p>
          <Link
            href="/admin/postfach/einstellungen"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4")}
          >
            Postfach einrichten
          </Link>
        </div>
      ) : (
        <form action={sendBulkStudentEmail} className="flex flex-col gap-5">
          <div className="border border-border bg-surface px-4 py-3 text-xs text-muted-fg">
            Von:{" "}
            <span className="font-mono text-fg">
              {school.mailboxName ? `${school.mailboxName} <${school.mailboxAddress}>` : school.mailboxAddress}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold">
              Empfänger{" "}
              <span className="font-normal text-muted-fg">(optional: nur eine Klasse)</span>
            </label>
            <select
              name="classFilter"
              className="h-10 border border-border bg-bg px-3 text-sm focus:border-fg focus:outline-none"
            >
              <option value="">Alle Schüler ({studentCount})</option>
              {classes.map((c) => (
                <option key={c.id} value={c.name}>
                  Klasse {c.name} ({c._count.students} Schüler)
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold">Betreff</label>
            <input
              name="subject"
              type="text"
              required
              placeholder="z. B. Wichtige Mitteilung"
              className="h-10 border border-border bg-bg px-3 text-sm focus:border-fg focus:outline-none focus:ring-1 focus:ring-fg/20"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold">Nachricht</label>
            <textarea
              name="message"
              required
              placeholder="Text der E-Mail…"
              className="border border-border bg-bg px-3 py-2.5 text-sm focus:border-fg focus:outline-none focus:ring-1 focus:ring-fg/20"
              style={{ minHeight: 140 }}
            />
          </div>

          <div className="border border-warning/30 bg-warning/5 px-4 py-3 text-xs text-muted-fg">
            <strong className="font-semibold text-fg">Hinweis:</strong> Diese E-Mail wird direkt an alle
            betroffenen Schüler gesendet und kann nicht zurückgerufen werden.
          </div>

          <button
            type="submit"
            className="flex items-center justify-center gap-2 bg-fg px-5 py-2.5 text-sm font-semibold text-bg hover:bg-fg/90"
          >
            <Mail className="size-4" strokeWidth={1.75} />
            E-Mail senden
          </button>
        </form>
      )}
    </div>
  );
}
