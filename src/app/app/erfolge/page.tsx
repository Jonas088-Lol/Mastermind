import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { ACHIEVEMENTS } from "@/lib/achievements";
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

  const earned = await prisma.userAchievement.findMany({
    where: { userId: session.userId },
    select: { slug: true, unlockedAt: true },
    orderBy: { unlockedAt: "desc" },
  });

  const earnedMap = new Map(earned.map((a) => [a.slug, a.unlockedAt]));
  const earnedCount = earnedMap.size;

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
                      isEarned && a.rarity === "epic" && "bg-gradient-to-br from-brand/[0.06] to-transparent",
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
