import { ArrowLeft, KeyRound, Plus, ShieldOff, Timer, Users } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { CopyButton } from "./CopyButton";
import { createClassJoinCode, revokeClassCode } from "./actions";

export const metadata: Metadata = { title: "Beitrittscodes · Admin" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClassCodesPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "admin") redirect(ROLE_HOME[effectiveRole(session)]);

  const { id } = await params;

  const klass = await prisma.schoolClass.findUnique({
    where: { id },
    select: { id: true, name: true, schoolId: true, _count: { select: { students: true } } },
  });

  if (!klass || klass.schoolId !== session.schoolId) notFound();

  const codes = await prisma.provisioningCode.findMany({
    where: { classId: id, kind: "CLASS_JOIN" },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true, email: true } } },
  });

  const createCode = createClassJoinCode.bind(null, id, klass.schoolId);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header className="flex flex-col gap-3">
        <Link
          href={`/admin/klassen/${id}`}
          className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          {klass.name}
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Beitrittscodes</h1>
          <p className="mt-1 text-sm text-muted-fg">
            Codes, mit denen Schüler dieser Klasse ({klass.name}) beitreten können.
            Aktuell {klass._count.students} Schüler.
          </p>
        </div>
      </header>

      {/* Generate form */}
      <form action={createCode} className="flex flex-col gap-4 rounded-2xl border border-border bg-bg p-6">
        <div className="flex items-center gap-2 mb-2">
          <Plus className="size-4 text-brand" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-fg">Neuen Code generieren</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-fg" htmlFor="maxUses">
              Max. Einlösungen
            </label>
            <input
              id="maxUses"
              name="maxUses"
              type="number"
              min={1}
              max={500}
              defaultValue={30}
              className="h-10 rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-fg" htmlFor="expiresInDays">
              Ablauf (Tage, 0 = nie)
            </label>
            <input
              id="expiresInDays"
              name="expiresInDays"
              type="number"
              min={0}
              max={365}
              defaultValue={14}
              className="h-10 rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-fg" htmlFor="note">
            Notiz (optional)
          </label>
          <input
            id="note"
            name="note"
            type="text"
            placeholder="z.B. Schuljahresbeginn 2025/26"
            className="h-10 rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
          />
        </div>

        <button
          type="submit"
          className="flex items-center justify-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-brand/90 active:scale-95"
        >
          <KeyRound className="size-4" />
          Code generieren
        </button>
      </form>

      {/* Info box */}
      <div className="rounded-2xl border border-info/20 bg-info/5 p-4">
        <div className="flex items-start gap-3">
          <Users className="size-4 shrink-0 text-info mt-0.5" />
          <div className="text-sm text-muted-fg">
            <strong className="text-fg">So treten Schüler bei:</strong> Schüler öffnen MasterMind →
            Einstellungen → „Klasse beitreten" → Code eingeben. Sie werden automatisch dieser Klasse zugeordnet.
          </div>
        </div>
      </div>

      {/* Code list */}
      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-fg">
          {codes.length} Code{codes.length !== 1 ? "s" : ""}
        </h2>

        {codes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
            <KeyRound className="mx-auto mb-3 size-8 text-muted-fg" strokeWidth={1.5} />
            <p className="font-semibold text-muted-fg">Noch keine Beitrittscodes</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {codes.map((c) => {
              const expired = c.expiresAt ? c.expiresAt < new Date() : false;
              const exhausted = c.uses >= c.maxUses;
              const active = !c.revoked && !expired && !exhausted;
              const revokeAction = revokeClassCode.bind(null, c.id, id);

              return (
                <li
                  key={c.id}
                  className={cn(
                    "flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center",
                    active ? "border-border bg-bg" : "border-border/50 bg-surface opacity-60"
                  )}
                >
                  <div className="flex flex-1 flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-base font-black tracking-widest">{c.code}</code>
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                        active ? "bg-success/10 text-success" : "bg-muted/10 text-muted-fg"
                      )}>
                        {c.revoked ? "widerrufen" : expired ? "abgelaufen" : exhausted ? "ausgeschöpft" : "aktiv"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-fg">
                      <span>{c.uses} / {c.maxUses} eingelöst</span>
                      {c.expiresAt && (
                        <span className="flex items-center gap-1">
                          <Timer className="size-3" />
                          bis {c.expiresAt.toLocaleDateString("de-DE")}
                        </span>
                      )}
                      {c.note && <span className="italic">{c.note}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <CopyButton code={c.code} />
                    {active && (
                      <form action={revokeAction}>
                        <button
                          type="submit"
                          className="flex items-center gap-1.5 rounded-lg border border-error/30 bg-error/5 px-3 py-1.5 text-xs font-semibold text-error transition-colors hover:bg-error/10"
                        >
                          <ShieldOff className="size-3.5" />
                          Widerrufen
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
