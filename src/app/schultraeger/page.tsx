import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Building2, GraduationCap, Users } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Schulträger-Portal" };

export default async function SchultraegerPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "school_company" && effectiveRole(session) !== "super") redirect("/login");

  const schools = await prisma.school.findMany({
    include: {
      _count: {
        select: {
          users: true,
          classes: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const totalUsers = schools.reduce((s, sc) => s + sc._count.users, 0);
  const totalClasses = schools.reduce((s, sc) => s + sc._count.classes, 0);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Übersicht</h1>
        <p className="mt-1 text-sm text-muted-fg">Alle Schulen im Träger auf einen Blick.</p>
      </header>

      <div className="grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-3">
        <div className="bg-bg p-6">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Schulen gesamt</p>
          <p className="mt-3 font-mono text-4xl font-bold">{schools.length}</p>
        </div>
        <div className="bg-bg p-6">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Nutzer gesamt</p>
          <p className="mt-3 font-mono text-4xl font-bold">{totalUsers}</p>
        </div>
        <div className="bg-bg p-6">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Klassen gesamt</p>
          <p className="mt-3 font-mono text-4xl font-bold">{totalClasses}</p>
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Schulen</h2>
          <Link
            href="/schultraeger/schulen"
            className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
          >
            Alle anzeigen <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-border border border-border">
          {schools.map((school) => (
            <div key={school.id} className="flex items-center gap-5 bg-bg px-5 py-4">
              <div className="flex size-10 items-center justify-center bg-surface">
                <Building2 className="size-5 text-muted-fg" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{school.name}</p>
                <p className="text-xs text-muted-fg">
                  {school.city ?? "—"}{school.state ? ` · ${school.state}` : ""} · Plan: {school.plan}
                </p>
              </div>
              <div className="hidden items-center gap-6 text-xs text-muted-fg sm:flex">
                <span className="flex items-center gap-1.5">
                  <Users className="size-3.5" />
                  {school._count.users}
                </span>
                <span className="flex items-center gap-1.5">
                  <GraduationCap className="size-3.5" />
                  {school._count.classes}
                </span>
              </div>
            </div>
          ))}
          {schools.length === 0 && (
            <p className="bg-bg px-5 py-8 text-sm text-muted-fg">Keine Schulen gefunden.</p>
          )}
        </div>
      </div>
    </div>
  );
}
