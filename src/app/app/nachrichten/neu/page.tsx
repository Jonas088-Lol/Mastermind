/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { createThread } from "./actions";

export const metadata: Metadata = { title: "Neue Nachricht" };

const ROLE_LABEL: Record<string, string> = {
  teacher: "Lehrer",
  student: "Schüler",
  parent: "Eltern",
  admin: "Schul-Admin",
};

const ROLE_ORDER = ["teacher", "student", "parent", "admin"];

interface PageProps {
  searchParams: Promise<{ to?: string }>;
}

export default async function NeueNachrichtPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { to: preSelectedId } = await searchParams;

  const senderRole = effectiveRole(session);

  const allowedRoles: string[] =
    senderRole === "student"
      ? ["teacher"]
      : senderRole === "parent"
      ? ["teacher", "admin"]
      : ["student", "teacher", "parent", "admin"];

  const users = await prisma.user.findMany({
    where: {
      schoolId: session.schoolId,
      id: { not: session.userId },
      role: { in: allowedRoles },
    },
    select: { id: true, name: true, role: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  const byRole = new Map<string, typeof users>();
  for (const u of users) {
    if (!byRole.has(u.role)) byRole.set(u.role, []);
    byRole.get(u.role)!.push(u);
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header className="flex items-center gap-3">
        <Link href="/app/nachrichten" className="text-muted-fg hover:text-fg">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Intern</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Neue Nachricht</h1>
        </div>
      </header>

      <form action={createThread} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="recipientId" className="text-sm font-semibold">
            Empfänger
          </label>
          <select
            id="recipientId"
            name="recipientId"
            required
            defaultValue={preSelectedId ?? ""}
            className="h-10 border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="">Empfänger auswählen…</option>
            {ROLE_ORDER.filter((r) => byRole.has(r)).map((role) => (
              <optgroup key={role} label={ROLE_LABEL[role] ?? role}>
                {byRole.get(role)!.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </optgroup>
            ))}
            {/* Remaining roles not in ROLE_ORDER */}
            {Array.from(byRole.keys())
              .filter((r) => !ROLE_ORDER.includes(r))
              .map((role) => (
                <optgroup key={role} label={ROLE_LABEL[role] ?? role}>
                  {byRole.get(role)!.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </optgroup>
              ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="subject" className="text-sm font-semibold">
            Betreff
          </label>
          <input
            id="subject"
            name="subject"
            type="text"
            required
            placeholder="Betreff eingeben…"
            className="h-10 border border-border bg-bg px-3 text-sm placeholder:text-muted-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="content" className="text-sm font-semibold">
            Nachricht
          </label>
          <textarea
            id="content"
            name="content"
            rows={6}
            required
            placeholder="Nachricht schreiben…"
            className="resize-y border border-border bg-bg px-3 py-2 text-sm placeholder:text-muted-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <Link href="/app/nachrichten" className="text-sm text-muted-fg hover:text-fg">
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
