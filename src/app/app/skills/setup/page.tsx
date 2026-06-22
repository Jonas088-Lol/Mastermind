import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import {
  getSchularten, SCHULART_LABELS, GRADE_RANGE,
  deriveSubjects, type DerivedSubject,
} from "@/lib/curriculum";
import { Schulart } from "@prisma/client";
import { saveCurriculumSetup } from "./actions";
import { LandkreisSelect } from "./LandkreisSelect";

export const metadata: Metadata = { title: "Skill-Baum einrichten · MasterMind" };

interface SetupProps {
  searchParams: Promise<{
    bundesland?: string;
    schulart?:   string;
    grade?:      string;
    step?:       string;
  }>;
}

export default async function CurriculumSetupPage({ searchParams }: SetupProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect(ROLE_HOME[effectiveRole(session)]);

  const params         = await searchParams;
  const bundeslandCode = params.bundesland ?? "";
  const schulartRaw    = params.schulart   ?? "";
  const gradeRaw       = parseInt(params.grade ?? "0", 10);

  // Step 1 — Bundesland already selected, show Schulart + Jahrgang
  // Step 2 — All selected, show subject confirmation

  const bundeslaender = await prisma.bundesland.findMany({ orderBy: { name: "asc" } });
  const schularten    = bundeslandCode ? getSchularten(bundeslandCode) : [];
  const schulart      = schulartRaw ? Schulart[schulartRaw as keyof typeof Schulart] : null;
  const gradeRange    = schulart ? GRADE_RANGE[schulart] : null;

  let derivedSubjects: DerivedSubject[] = [];
  let wahlpflichtSubjects: DerivedSubject[] = [];

  if (bundeslandCode && schulart && gradeRaw >= 1) {
    const all = await deriveSubjects(bundeslandCode, schulart, gradeRaw);
    derivedSubjects      = all.filter((s) => !s.isWahlpflicht);
    wahlpflichtSubjects  = all.filter((s) =>  s.isWahlpflicht);
  }

  const step = params.step === "2" && derivedSubjects.length > 0 ? 2 : 1;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-8 px-4 py-8">
      <header>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">Einrichtung</p>
        <h1 className="mt-1 text-2xl font-black text-white">Dein Skill-Baum</h1>
        <p className="mt-1 text-sm text-white/50">
          {step === 1
            ? "Wähle dein Bundesland, deine Schulart und Jahrgangsstufe."
            : "Deine Fächer wurden automatisch abgeleitet. Bestätige oder passe sie an."}
        </p>
      </header>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[1, 2].map((s) => (
          <div key={s} className={`flex-1 h-1.5 rounded-full ${s <= step ? "bg-indigo-500" : "bg-white/10"}`} />
        ))}
      </div>

      {step === 1 ? (
        /* ── Step 1: Location + School ── */
        <form action="" method="GET" className="flex flex-col gap-5">
          {/* Bundesland */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Bundesland</label>
            <select
              name="bundesland"
              defaultValue={bundeslandCode}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              onChange={undefined}
            >
              <option value="">— Bitte wählen —</option>
              {bundeslaender.map((bl) => (
                <option key={bl.code} value={bl.code}>{bl.name}</option>
              ))}
            </select>
          </div>

          {/* Schulart (client-side dependency handled via URL params + page reload) */}
          {bundeslandCode && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Schulart</label>
              <select
                name="schulart"
                defaultValue={schulartRaw}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">— Bitte wählen —</option>
                {schularten.map((sa) => (
                  <option key={sa} value={sa}>{SCHULART_LABELS[sa]}</option>
                ))}
              </select>
            </div>
          )}

          {/* Jahrgangsstufe */}
          {schulart && gradeRange && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Jahrgangsstufe</label>
              <select
                name="grade"
                defaultValue={gradeRaw || ""}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">— Bitte wählen —</option>
                {Array.from({ length: gradeRange[1] - gradeRange[0] + 1 }, (_, i) => gradeRange[0] + i).map((g) => (
                  <option key={g} value={g}>{g}. Jahrgangsstufe</option>
                ))}
              </select>
            </div>
          )}

          <input type="hidden" name="step" value="1" />

          {bundeslandCode && schulartRaw && gradeRaw >= 1 ? (
            <a
              href={`?bundesland=${bundeslandCode}&schulart=${schulartRaw}&grade=${gradeRaw}&step=2`}
              className="w-full rounded-2xl bg-indigo-600 py-3 text-center text-sm font-bold text-white transition-all active:scale-95"
            >
              Weiter →
            </a>
          ) : (
            <button
              type="submit"
              className="w-full rounded-2xl bg-white/10 py-3 text-sm font-bold text-white/50"
              disabled
            >
              Alle Felder ausfüllen
            </button>
          )}
        </form>
      ) : (
        /* ── Step 2: Subject confirmation + optional settings ── */
        <form action={saveCurriculumSetup} className="flex flex-col gap-6">
          <input type="hidden" name="bundeslandCode"   value={bundeslandCode} />
          <input type="hidden" name="schulart"          value={schulartRaw} />
          <input type="hidden" name="jahrgangsstufe"    value={gradeRaw} />

          {/* Landkreis */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-white/60 uppercase tracking-wider">
              Landkreis <span className="text-white/30 font-normal">(für Ranglisten)</span>
            </label>
            <LandkreisSelect bundeslandCode={bundeslandCode} />
          </div>

          {/* Pflichtfächer */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold text-white/60 uppercase tracking-wider">Pflichtfächer</p>
            <div className="grid grid-cols-2 gap-2">
              {derivedSubjects.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 bg-white/5"
                >
                  <span className="text-base">{s.icon}</span>
                  <span className="text-xs font-semibold text-white">{s.label}</span>
                  {s.wochenstunden && (
                    <span className="ml-auto text-[10px] text-white/30">{s.wochenstunden}h</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Wahlpflichtfächer */}
          {wahlpflichtSubjects.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold text-white/60 uppercase tracking-wider">
                Wahlpflichtfächer <span className="font-normal text-white/30">(wähle deine)</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                {wahlpflichtSubjects.map((s) => (
                  <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 px-3 py-2 bg-white/5 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-500/10">
                    <input type="checkbox" name="extraSubjectId" value={s.id} className="accent-indigo-500" />
                    <span className="text-base">{s.icon}</span>
                    <span className="text-xs font-semibold text-white">{s.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Leaderboard opt-in */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col gap-3">
            <p className="text-xs font-bold text-white/70">Ranglisten</p>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" name="leaderboardOptIn" className="accent-indigo-500" />
              <div>
                <p className="text-sm font-semibold text-white">Auf Ranglisten erscheinen</p>
                <p className="text-[11px] text-white/40">Nur dein Pseudonym wird angezeigt. Jederzeit deaktivierbar.</p>
              </div>
            </label>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Pseudonym</label>
              <input
                type="text"
                name="displayName"
                placeholder="z.B. LernProfi42"
                maxLength={24}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-white/30">Kein Klarname — wird auf Ranglisten angezeigt.</p>
            </div>
          </div>

          <div className="flex gap-3">
            <a
              href={`?bundesland=${bundeslandCode}&schulart=${schulartRaw}&grade=${gradeRaw}&step=1`}
              className="flex-1 rounded-2xl border border-white/10 py-3 text-center text-sm font-semibold text-white/50"
            >
              ← Zurück
            </a>
            <button
              type="submit"
              className="flex-1 rounded-2xl bg-indigo-600 py-3 text-sm font-bold text-white transition-all active:scale-95"
            >
              Loslegen ⚡
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
