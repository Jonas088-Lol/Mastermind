import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { levelFromXp } from "@/lib/xp";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Erfolge · Schüler" };

const RARITY_LABELS: Record<string, string> = {
  common: "Normal",
  rare: "Selten",
  epic: "Episch",
};

const RARITY_ORDER = ["epic", "rare", "common"];

const CATEGORY: Record<string, { label: string; slugPrefixes: string[] }> = {
  streak:      { label: "Streak",       slugPrefixes: ["streak_"] },
  level:       { label: "Level",        slugPrefixes: ["level_"] },
  xp:          { label: "XP",           slugPrefixes: ["xp_", "first_xp"] },
  aufgaben:    { label: "Aufgaben",     slugPrefixes: ["assignments_"] },
  karteikarten:{ label: "Karteikarten", slugPrefixes: ["flashcards_"] },
  notizen:     { label: "Notizen",      slugPrefixes: ["notes_"] },
};

function getCategory(slug: string): string {
  for (const [key, { slugPrefixes }] of Object.entries(CATEGORY)) {
    if (slugPrefixes.some((p) => slug.startsWith(p) || slug === p)) return key;
  }
  return "sonstiges";
}

export default async function ErfolgePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect(ROLE_HOME[effectiveRole(session)]);

  const [earned, user, xpLogs] = await Promise.all([
    prisma.userAchievement.findMany({
      where: { userId: session.userId },
      select: { slug: true, unlockedAt: true },
      orderBy: { unlockedAt: "desc" },
    }),
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { xp: true, streak: true },
    }),
    prisma.xpLog.groupBy({
      by: ["reason"],
      where: { userId: session.userId },
      _count: { id: true },
    }),
  ]);

  const earnedMap = new Map(earned.map((a) => [a.slug, a.unlockedAt]));
  const earnedCount = earnedMap.size;
  const totalCount = ACHIEVEMENTS.length;
  const overallPct = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;

  // Progress values for locked achievements, derived from existing user fields/counts
  const reasonCounts = Object.fromEntries(xpLogs.map((l) => [l.reason, l._count.id]));
  const assignmentCount = reasonCounts["aufgabe_abgabe"] ?? 0;
  const noteCount = reasonCounts["note_geteilt"] ?? 0;
  const flashcardCount = reasonCounts["karteikarte_session"] ?? 0;
  const xp = user?.xp ?? 0;
  const streak = user?.streak ?? 0;
  const level = levelFromXp(xp);

  const PROGRESS: Record<string, { current: number; target: number; unit: string }> = {
    streak_3:       { current: streak, target: 3,  unit: "Tage Streak" },
    streak_7:       { current: streak, target: 7,  unit: "Tage Streak" },
    streak_30:      { current: streak, target: 30, unit: "Tage Streak" },
    level_5:        { current: level, target: 5,  unit: "Level" },
    level_10:       { current: level, target: 10, unit: "Level" },
    level_25:       { current: level, target: 25, unit: "Level" },
    assignments_5:  { current: assignmentCount, target: 5,  unit: "Aufgaben" },
    assignments_25: { current: assignmentCount, target: 25, unit: "Aufgaben" },
    notes_5:        { current: noteCount, target: 5, unit: "Notizen" },
    flashcards_50:  { current: flashcardCount, target: 50, unit: "Karteikarten" },
    xp_500:         { current: xp, target: 500,  unit: "XP" },
    xp_2500:        { current: xp, target: 2500, unit: "XP" },
  };

  const almostThere = ACHIEVEMENTS
    .filter((a) => !earnedMap.has(a.slug) && PROGRESS[a.slug])
    .map((a) => {
      const p = PROGRESS[a.slug];
      return { ...a, ...p, ratio: Math.min(p.current / p.target, 1) };
    })
    .filter((a) => a.ratio > 0)
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 5);

  const byCategory = new Map<string, typeof ACHIEVEMENTS>();
  for (const a of ACHIEVEMENTS) {
    const cat = getCategory(a.slug);
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(a);
  }

  const categoryOrder = Object.keys(CATEGORY);
  const orderedCategories = [
    ...categoryOrder.filter((k) => byCategory.has(k)),
    ...(byCategory.has("sonstiges") ? ["sonstiges"] : []),
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Gamification</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Erfolge</h1>
          <p className="mt-1 text-sm text-muted-fg">
            {earnedCount} von {ACHIEVEMENTS.length} freigeschaltet
          </p>
        </div>
        <div className="flex items-center gap-3 text-right">
          <div>
            <p className="text-2xl font-bold">{earnedCount}</p>
            <p className="text-xs text-muted-fg">Verdient</p>
          </div>
          <div className="h-10 w-px bg-border" />
          <div>
            <p className="text-2xl font-bold text-muted-fg">{ACHIEVEMENTS.length - earnedCount}</p>
            <p className="text-xs text-muted-fg">Ausstehend</p>
          </div>
        </div>
      </header>

      {/* Overall progress */}
      <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold">Gesamtfortschritt</p>
          <p className="font-mono text-sm text-muted-fg">
            {earnedCount}/{totalCount} · {overallPct}%
          </p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-xl bg-bg">
          <div
            className="h-full rounded-xl bg-brand transition-all"
            style={{ width: `${overallPct}%` }}
          />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {orderedCategories.map((cat) => {
            const items = byCategory.get(cat) ?? [];
            const catEarned = items.filter((a) => earnedMap.has(a.slug)).length;
            const catPct = items.length > 0 ? Math.round((catEarned / items.length) * 100) : 0;
            return (
              <div key={cat}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-fg">{CATEGORY[cat]?.label ?? "Sonstiges"}</span>
                  <span className="font-mono text-muted-fg">{catEarned}/{items.length}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-xl bg-bg">
                  <div className="h-full rounded-xl bg-brand/70" style={{ width: `${catPct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Almost there */}
      {almostThere.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted-fg">
            Fast geschafft
          </h2>
          <div className="grid gap-px border border-border bg-border sm:grid-cols-2">
            {almostThere.map((a) => (
              <div key={a.slug} className="flex gap-3 bg-bg p-4">
                <div className="grid size-11 shrink-0 place-items-center bg-surface text-xl grayscale">
                  {a.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{a.title}</p>
                    <span className="shrink-0 font-mono text-xs text-muted-fg">
                      {a.current}/{a.target}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-fg">{a.description}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-xl bg-surface">
                    <div
                      className="h-full rounded-xl bg-brand"
                      style={{ width: `${Math.round(a.ratio * 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-muted-fg/70">
                    Noch {Math.max(a.target - a.current, 0)} {a.unit}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recently earned */}
      {earned.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted-fg">
            Zuletzt freigeschaltet
          </h2>
          <div className="flex flex-wrap gap-2">
            {earned.slice(0, 6).map((e) => {
              const a = ACHIEVEMENTS.find((x) => x.slug === e.slug);
              if (!a) return null;
              return (
                <div
                  key={e.slug}
                  className="flex items-center gap-2 border border-border bg-bg px-3 py-2 text-sm"
                >
                  <span className="text-lg">{a.icon}</span>
                  <div>
                    <p className="font-semibold leading-tight">{a.title}</p>
                    <p className="text-[10px] text-muted-fg">
                      {e.unlockedAt.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* By category */}
      {orderedCategories.map((cat) => {
        const items = byCategory.get(cat) ?? [];
        const catEarned = items.filter((a) => earnedMap.has(a.slug)).length;
        const catLabel = CATEGORY[cat]?.label ?? "Sonstiges";

        return (
          <section key={cat}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-fg">{catLabel}</h2>
              <span className="font-mono text-xs text-muted-fg">{catEarned}/{items.length}</span>
            </div>
            <div className="grid gap-px border border-border bg-border sm:grid-cols-2">
              {[...items].sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity)).map((a) => {
                const isEarned = earnedMap.has(a.slug);
                const unlockedAt = earnedMap.get(a.slug);
                return (
                  <div
                    key={a.slug}
                    className={cn(
                      "flex gap-3 bg-bg p-4",
                      !isEarned && "opacity-40",
                      isEarned && a.rarity === "epic" && "bg-linear-to-br from-brand/6 to-transparent",
                    )}
                  >
                    <div
                      className={cn(
                        "grid size-11 shrink-0 place-items-center bg-surface text-xl",
                        !isEarned && "grayscale",
                      )}
                    >
                      {isEarned ? a.icon : <Lock className="size-4 text-muted-fg" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{a.title}</p>
                        {a.rarity !== "common" && (
                          <Badge variant={a.rarity === "epic" ? "brand" : "info"} className="shrink-0">
                            {RARITY_LABELS[a.rarity]}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-fg">{a.description}</p>
                      {isEarned && unlockedAt && (
                        <p className="mt-1 text-[10px] text-muted-fg/70">
                          Freigeschaltet {unlockedAt.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
