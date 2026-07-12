/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { ArrowLeft, KeyRound, Plus, ShieldCheck, ShieldOff, Timer } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getSession, isSuper } from "@/lib/session";
import { cn } from "@/lib/utils";
import { createSchoolActivationCode, revokeCode } from "./actions";
import { CopyButton } from "./CopyButton";

export const metadata: Metadata = { title: "Aktivierungscodes · Plattform" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SchoolCodesPage({ params }: PageProps) {
  const session = await getSession();
  if (!session || !isSuper(session)) redirect("/login");

  const { id } = await params;

  const school = await prisma.school.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!school) notFound();

  const codes = await prisma.provisioningCode.findMany({
    where: { schoolId: id, kind: "SCHOOL_ACTIVATION" },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { displayName: true, email: true } } },
  });

  const createCode = createSchoolActivationCode.bind(null, id);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header className="flex flex-col gap-3">
        <Link
          href={`/plattform/schulen/${id}`}
          className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          {school.name}
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Aktivierungscodes</h1>
          <p className="mt-1 text-sm text-muted-fg">
            Codes, mit denen sich der Schul-Admin dieser Schule registrieren und den Zugang aktivieren kann.
          </p>
        </div>
      </header>

      {/* Generate form */}
      <form action={createCode} className="flex flex-col gap-4 rounded-2xl border border-border bg-bg p-6">
        <div className="flex items-center gap-2 mb-2">
          <Plus className="size-4 text-brand" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-fg">Neuen Code ausstellen</h2>
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
              max={100}
              defaultValue={1}
              className="h-10 rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
            />
            <p className="text-[11px] text-muted-fg">1 = einmalig; für Bulk-Onboarding höher setzen</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-fg" htmlFor="expiresInDays">
              Ablauf (Tage)
            </label>
            <input
              id="expiresInDays"
              name="expiresInDays"
              type="number"
              min={0}
              max={365}
              defaultValue={30}
              className="h-10 rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
            />
            <p className="text-[11px] text-muted-fg">0 = kein Ablaufdatum</p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-fg" htmlFor="note">
            Notiz (intern)
          </label>
          <input
            id="note"
            name="note"
            type="text"
            placeholder="z.B. Fuer Herrn Mueller, Schulleiter"
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

      {/* Code list */}
      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-fg">
          {codes.length} Code{codes.length !== 1 ? "s" : ""}
        </h2>

        {codes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
            <KeyRound className="mx-auto mb-3 size-8 text-muted-fg" strokeWidth={1.5} />
            <p className="font-semibold text-muted-fg">Noch keine Codes</p>
            <p className="mt-1 text-sm text-muted-fg">Generiere oben den ersten Aktivierungscode.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {codes.map((c) => {
              const expired = c.expiresAt ? c.expiresAt < new Date() : false;
              const exhausted = c.uses >= c.maxUses;
              const active = !c.revoked && !expired && !exhausted;

              const revokeAction = revokeCode.bind(null, c.id, id);

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
                      <code className="font-mono text-base font-black tracking-widest text-fg">
                        {c.code}
                      </code>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                          active ? "bg-success/10 text-success" : "bg-muted/10 text-muted-fg"
                        )}
                      >
                        {c.revoked ? "widerrufen" : expired ? "abgelaufen" : exhausted ? "ausgeschöpft" : "aktiv"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-fg">
                      <span>{c.uses} / {c.maxUses} Einlösungen</span>
                      {c.expiresAt && (
                        <span className="flex items-center gap-1">
                          <Timer className="size-3" />
                          bis {c.expiresAt.toLocaleDateString("de-DE")}
                        </span>
                      )}
                      {c.note && <span className="italic">{c.note}</span>}
                      <span>von {c.createdBy.displayName ?? c.createdBy.email}</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <CopyButton code={c.code} />
                    {active && (
                      <form action={revokeAction}>
                        <button
                          type="submit"
                          title="Widerrufen"
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

      {/* Info box */}
      <div className="rounded-2xl border border-brand/20 bg-brand/5 p-5">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="size-4 text-brand" />
          <p className="text-xs font-bold text-brand uppercase tracking-widest">So funktioniert's</p>
        </div>
        <ol className="flex flex-col gap-2 text-sm text-muted-fg list-decimal list-inside">
          <li>Du generierst hier einen Code und schickst ihn dem Schulleiter.</li>
          <li>Der Schulleiter registriert sich und gibt den Code unter Einstellungen → Lizenz ein.</li>
          <li>Die Schule wird automatisch aktiviert und der Schulleiter als Admin zugewiesen.</li>
        </ol>
      </div>
    </div>
  );
}

