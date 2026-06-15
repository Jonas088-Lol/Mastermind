import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { updateSubject, deleteSubject } from "./actions";
import { SUBJECT_CATEGORIES } from "../neu/page";

interface PageParams { params: Promise<{ id: string }> }

export const metadata: Metadata = { title: "Fach bearbeiten · Admin" };

const PRESET_COLORS = [
  "#6366f1", "#3b82f6", "#06b6d4", "#10b981", "#84cc16",
  "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#64748b",
];

export default async function FachBearbeitenPage({ params }: PageParams) {
  const { id } = await params;
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/admin");

  const subject = await prisma.subject.findFirst({
    where: { id, schoolId: session.schoolId ?? "" },
    include: { _count: { select: { assignments: true, timetableEntries: true } } },
  });
  if (!subject) notFound();

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <header className="flex items-center gap-3">
        <Link href="/admin/faecher" className="text-muted-fg hover:text-fg">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schul-Admin</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Fach bearbeiten</h1>
        </div>
      </header>

      <form action={updateSubject.bind(null, id)} className="flex flex-col gap-5">
        {/* Fachtyp */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold">Fachtyp</label>
          <div className="flex flex-wrap gap-2">
            {SUBJECT_CATEGORIES.map((cat) => (
              <label key={cat.value} className="cursor-pointer">
                <input
                  type="radio"
                  name="category"
                  value={cat.value}
                  defaultChecked={(subject.category ?? "allgemein") === cat.value}
                  className="peer sr-only"
                />
                <span className="inline-flex items-center rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted-fg transition-colors peer-checked:border-brand peer-checked:bg-brand/10 peer-checked:text-brand">
                  {cat.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-semibold">Fachname *</label>
          <input
            id="name" name="name" type="text" required defaultValue={subject.name}
            className="h-10 rounded-xl border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        {/* Kürzel */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="shortName" className="text-sm font-semibold">Kürzel *</label>
          <input
            id="shortName" name="shortName" type="text" required maxLength={4} defaultValue={subject.shortName}
            className="h-10 w-24 rounded-xl border border-border bg-bg px-3 text-sm font-mono uppercase focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        {/* Farbe */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold">Farbe</label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((c) => (
              <label key={c} className="relative cursor-pointer">
                <input type="radio" name="color" value={c} className="sr-only" defaultChecked={subject.color === c} />
                <span
                  className="block size-8 rounded-lg border-2 border-transparent ring-offset-1 has-checked:ring-2 has-checked:ring-brand"
                  style={{ backgroundColor: c }}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" className="rounded-xl bg-fg px-5 py-2.5 text-sm font-semibold text-bg hover:bg-fg/90">
            Speichern
          </button>
          <Link href="/admin/faecher" className="text-sm text-muted-fg hover:text-fg">
            Abbrechen
          </Link>
        </div>
      </form>

      <div className="rounded-2xl border border-danger/30 p-4">
        <p className="text-sm font-semibold text-danger">Fach löschen</p>
        <p className="mt-1 text-xs text-muted-fg">
          Dieses Fach hat {subject._count.assignments} Aufgaben und {subject._count.timetableEntries} Stundenplan-Einträge.
          Löschen entfernt das Fach aus allen Plänen.
        </p>
        <form action={deleteSubject.bind(null, id)} className="mt-3">
          <button
            type="submit"
            className="rounded-xl border border-danger px-4 py-1.5 text-xs font-semibold text-danger hover:bg-danger hover:text-white"
          >
            Fach löschen
          </button>
        </form>
      </div>
    </div>
  );
}
