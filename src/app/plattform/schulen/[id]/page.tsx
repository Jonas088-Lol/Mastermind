import { ArrowLeft, Building2, Users, Save, KeyRound } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db/client";
import { getSession, isSuper } from "@/lib/session";
import { updateSchool } from "./actions";

export const metadata: Metadata = { title: "Schule bearbeiten · Plattform" };

const BUNDESLAENDER: { code: string; name: string }[] = [
  { code: "BB", name: "Brandenburg" },
  { code: "BE", name: "Berlin" },
  { code: "BW", name: "Baden-Württemberg" },
  { code: "BY", name: "Bayern" },
  { code: "HB", name: "Bremen" },
  { code: "HE", name: "Hessen" },
  { code: "HH", name: "Hamburg" },
  { code: "MV", name: "Mecklenburg-Vorpommern" },
  { code: "NI", name: "Niedersachsen" },
  { code: "NW", name: "Nordrhein-Westfalen" },
  { code: "RP", name: "Rheinland-Pfalz" },
  { code: "SH", name: "Schleswig-Holstein" },
  { code: "SL", name: "Saarland" },
  { code: "SN", name: "Sachsen" },
  { code: "ST", name: "Sachsen-Anhalt" },
  { code: "TH", name: "Thüringen" },
];

const PLAN_LABEL: Record<string, string> = { enterprise: "Enterprise", pro: "Pro", basic: "Basic" };
const PLAN_TONE: Record<string, "success" | "brand" | "outline"> = { enterprise: "success", pro: "brand", basic: "outline" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SchoolDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session || !isSuper(session)) redirect("/login");

  const { id } = await params;

  const school = await prisma.school.findUnique({
    where: { id },
    include: {
      _count: { select: { users: true } },
    },
  });

  if (!school) notFound();

  const update = updateSchool.bind(null, id);
  const pct = school.seats > 0 ? Math.round((school._count.users / school.seats) * 100) : 0;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header className="flex flex-col gap-3">
        <Link
          href="/plattform/schulen"
          className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          Schulen
        </Link>
        <div className="flex items-center gap-4">
          <div className="grid size-12 shrink-0 place-items-center bg-fg text-bg">
            <Building2 className="size-5" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{school.name}</h1>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant={PLAN_TONE[school.plan] ?? "outline"}>{PLAN_LABEL[school.plan] ?? school.plan}</Badge>
              <span className="text-xs text-muted-fg">
                <Users className="mr-1 inline size-3" />
                {school._count.users} / {school.seats} ({pct}%)
              </span>
              {school.bundeslandCode && (
                <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-bold text-muted-fg">
                  {school.bundeslandCode}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <form action={update} className="flex flex-col gap-6 rounded-2xl border border-border bg-bg p-6">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-fg">Schule bearbeiten</h2>

        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-fg uppercase tracking-wider" htmlFor="name">Name</label>
          <input
            id="name"
            name="name"
            type="text"
            defaultValue={school.name}
            required
            className="h-10 rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
          />
        </div>

        {/* City */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-fg uppercase tracking-wider" htmlFor="city">Stadt</label>
          <input
            id="city"
            name="city"
            type="text"
            defaultValue={school.city ?? ""}
            placeholder="z.B. München"
            className="h-10 rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
          />
        </div>

        {/* Bundesland — KEY for Skill Tree */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-fg uppercase tracking-wider" htmlFor="bundeslandCode">
            Bundesland <span className="text-brand font-normal normal-case">(für Skill-Tree + Ranglisten)</span>
          </label>
          <select
            id="bundeslandCode"
            name="bundeslandCode"
            defaultValue={school.bundeslandCode ?? ""}
            className="h-10 rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
          >
            <option value="">— nicht angegeben —</option>
            {BUNDESLAENDER.map(({ code, name }) => (
              <option key={code} value={code}>{code} · {name}</option>
            ))}
          </select>
          <p className="text-[11px] text-muted-fg">
            Das Bundesland bestimmt den Lehrplan (Curricula) für den Skill-Baum. Schüler dieser Schule sehen dann ihre Fächer automatisch.
          </p>
        </div>

        {/* Plan */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-fg uppercase tracking-wider" htmlFor="plan">Plan</label>
          <select
            id="plan"
            name="plan"
            defaultValue={school.plan}
            className="h-10 rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
          >
            <option value="basic">Basic</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>

        {/* Seats */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-fg uppercase tracking-wider" htmlFor="seats">Sitz-Kontingent</label>
          <input
            id="seats"
            name="seats"
            type="number"
            min={1}
            max={10000}
            defaultValue={school.seats}
            className="h-10 rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
          />
        </div>

        <button
          type="submit"
          className="flex items-center justify-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-brand/90 active:scale-95"
        >
          <Save className="size-4" />
          Speichern
        </button>
      </form>

      {/* Codes shortcut */}
      <Link
        href={`/plattform/schulen/${id}/codes`}
        className="flex items-center gap-4 rounded-2xl border border-border bg-bg p-5 transition-colors hover:bg-surface"
      >
        <KeyRound className="size-6 shrink-0 text-brand" strokeWidth={1.75} />
        <div className="flex-1">
          <p className="font-semibold">Aktivierungscodes</p>
          <p className="text-sm text-muted-fg">Codes für den Schul-Admin ausstellen und verwalten</p>
        </div>
        <span className="text-xs text-muted-fg">→</span>
      </Link>

      {/* Info box about skill tree */}
      <div className="rounded-2xl border border-brand/20 bg-brand/5 p-5">
        <p className="text-xs font-bold text-brand uppercase tracking-widest mb-2">Skill-Tree Info</p>
        <p className="text-sm text-muted-fg">
          Sobald das Bundesland gesetzt ist, können Schüler unter{" "}
          <code className="rounded bg-surface px-1 py-0.5 font-mono text-xs">/app/skills/setup</code>{" "}
          ihren Skill-Baum einrichten. Sie wählen dort ihre Schulart und Jahrgangsstufe — die Fächer werden automatisch
          aus dem Lehrplan abgeleitet.
        </p>
      </div>
    </div>
  );
}
