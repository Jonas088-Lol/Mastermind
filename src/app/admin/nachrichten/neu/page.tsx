/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { createAdminThread } from "./actions";
import { canManageSchool, canAccessArea } from "@/lib/school-admin";

export const metadata: Metadata = { title: "Neue Nachricht · Admin" };

const ROLE_LABEL: Record<string, string> = {
  teacher: "Lehrer",
  student: "Schüler",
  parent: "Eltern",
  admin: "Admin",
};

const ROLE_ORDER = ["teacher", "student", "parent", "admin"];

export default async function AdminNachrichtNeuPage() {
  const session = await getSession();
  if (!session || !canManageSchool(effectiveRole(session))) redirect("/admin");
  if (!canAccessArea(effectiveRole(session), "nachrichten")) redirect("/admin");

  const users = await prisma.user.findMany({
    where: {
      schoolId: session.schoolId,
      id: { not: session.userId },
    },
    select: { id: true, name: true, role: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  const classes = await prisma.schoolClass.findMany({
    where: { schoolId: session.schoolId ?? undefined },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const byRole = new Map<string, typeof users>();
  for (const u of users) {
    if (!byRole.has(u.role)) byRole.set(u.role, []);
    byRole.get(u.role)!.push(u);
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header className="flex items-center gap-3">
        <Link href="/admin/nachrichten" className="text-muted-fg hover:text-fg">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Admin</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Neue Nachricht</h1>
        </div>
      </header>

      <form action={createAdminThread} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="recipientId" className="text-sm font-semibold">Empfänger</label>
          <select
            id="recipientId" name="recipientId"
            className="h-10 border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="">Empfänger auswählen…</option>
            {ROLE_ORDER.filter((r) => byRole.has(r)).map((role) => (
              <optgroup key={role} label={ROLE_LABEL[role] ?? role}>
                {byRole.get(role)!.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {classes.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="classId" className="text-sm font-semibold">Oder an ganze Klasse</label>
            <select
              id="classId" name="classId"
              className="h-10 border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="">Keine Klasse — nur Einzelempfänger</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>Klasse {c.name} (alle Schüler)</option>
              ))}
            </select>
            <p className="text-xs text-muted-fg">
              Bei Auswahl einer Klasse geht die Nachricht an alle Schüler der Klasse; der Einzelempfänger wird ignoriert.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="subject" className="text-sm font-semibold">Betreff</label>
          <input
            id="subject" name="subject" type="text" required
            placeholder="Betreff eingeben…"
            className="h-10 border border-border bg-bg px-3 text-sm placeholder:text-muted-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="content" className="text-sm font-semibold">Nachricht</label>
          <textarea
            id="content" name="content" rows={6} required
            placeholder="Nachricht schreiben…"
            className="resize-y border border-border bg-bg px-3 py-2 text-sm placeholder:text-muted-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <Link href="/admin/nachrichten" className="text-sm text-muted-fg hover:text-fg">
            Abbrechen
          </Link>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center gap-2 bg-brand px-5 text-sm font-semibold text-brand-fg transition-opacity hover:opacity-90"
          >
            Senden
          </button>
        </div>
      </form>
    </div>
  );
}
