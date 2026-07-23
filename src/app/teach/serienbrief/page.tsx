/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Mail, Plus, Users } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { createTemplate } from "./actions";

export const metadata: Metadata = { title: "Serienbrief · MasterDoc" };

export default async function SerienbriefPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  const mayMerge = await can(session, "teacher.mail_merge");

  const templates = mayMerge
    ? await prisma.mailMergeTemplate.findMany({
        where: { schoolId: session.schoolId ?? "", createdById: session.userId },
        orderBy: { updatedAt: "desc" },
        take: 100,
        select: { id: true, title: true, subject: true, sourceType: true, updatedAt: true },
      })
    : [];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">MasterDoc</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Serienbrief</h1>
          <p className="mt-1 text-sm text-muted-fg">
            Einen Brief an viele — mit persönlichen Platzhaltern aus Tabelle oder Liste.
          </p>
        </div>
        {mayMerge && (
          <form action={createTemplate}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-fg px-3 py-2 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
            >
              <Plus className="size-4" />
              Neuer Serienbrief
            </button>
          </form>
        )}
      </header>

      {!mayMerge ? (
        <Card>
          <CardBody className="flex items-start gap-3">
            <Users className="mt-0.5 size-4 shrink-0 text-muted-fg" strokeWidth={1.75} />
            <p className="text-sm text-muted-fg">
              Der Serienbrief ist an deiner Schule noch nicht für Lehrkräfte freigeschaltet.
              Die Schulleitung kann das unter <strong>Rechte</strong> aktivieren.
            </p>
          </CardBody>
        </Card>
      ) : templates.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border-2 border-dashed border-border py-16 text-center">
          <Mail className="size-8 text-muted-fg" strokeWidth={1.5} />
          <p className="mt-4 font-semibold">Noch kein Serienbrief</p>
          <p className="mt-1 text-sm text-muted-fg">Lege oben deinen ersten an.</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border rounded-2xl border border-border">
          {templates.map((t) => (
            <Link
              key={t.id}
              href={`/teach/serienbrief/${t.id}`}
              className="flex items-center gap-3 p-4 transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-surface"
            >
              <Mail className="size-4 shrink-0 text-brand" strokeWidth={1.75} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{t.title}</p>
                <p className="truncate text-xs text-muted-fg">
                  {t.subject || "Kein Betreff"} · geändert {t.updatedAt.toLocaleDateString("de-DE")}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
