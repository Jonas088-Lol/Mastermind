import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, Lock, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { ALL_TITLES, RARITY_COLORS, RARITY_LABELS } from "@/lib/game";
import { cn } from "@/lib/utils";
import { equipTitle, unequipTitle } from "./actions";

export const metadata: Metadata = { title: "Titel · MasterMind" };

const RARITY_ORDER = ["mythic", "legendary", "epic", "rare", "uncommon", "common"];

const RARITY_VARIANT: Record<string, "outline" | "brand" | "warning" | "danger" | "info"> = {
  common:    "outline",
  uncommon:  "info",
  rare:      "brand",
  epic:      "brand",
  legendary: "warning",
  mythic:    "danger",
};

export default async function TitelPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect(ROLE_HOME[effectiveRole(session)]);

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { equippedTitle: true },
  });

  const ownedTitles = await prisma.userTitle.findMany({
    where: { userId: session.userId },
    orderBy: { unlockedAt: "desc" },
  });

  const ownedSlugs = new Set(ownedTitles.map((t) => t.titleSlug));
  const equippedSlug = user?.equippedTitle;
  const equippedTitle = ALL_TITLES.find((t) => t.slug === equippedSlug);

  const sortedTitles = [...ALL_TITLES].sort((a, b) => {
    const ownedA = ownedSlugs.has(a.slug) ? 0 : 1;
    const ownedB = ownedSlugs.has(b.slug) ? 0 : 1;
    if (ownedA !== ownedB) return ownedA - ownedB;
    return RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
  });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Gamification</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Titel</h1>
          <p className="mt-1 text-sm text-muted-fg">
            {ownedSlugs.size} von {ALL_TITLES.length} freigeschaltet
          </p>
        </div>
        <Tag className="size-10 text-muted-fg opacity-20" strokeWidth={1} />
      </header>

      {/* Currently equipped */}
      <div className="border border-border bg-bg p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-fg">Aktuell ausgerüstet</p>
        {equippedTitle ? (
          <div className="flex items-center gap-4">
            <span className="text-3xl">{equippedTitle.icon}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p
                  className="text-lg font-black"
                  style={{ color: equippedTitle.color }}
                >
                  [{equippedTitle.name}]
                </p>
                <Badge variant={RARITY_VARIANT[equippedTitle.rarity] ?? "outline"}>
                  {RARITY_LABELS[equippedTitle.rarity]}
                </Badge>
              </div>
              <p className="text-sm text-muted-fg">{equippedTitle.description}</p>
            </div>
            <form action={unequipTitle}>
              <Button type="submit" size="sm" variant="ghost">Ablegen</Button>
            </form>
          </div>
        ) : (
          <p className="text-sm text-muted-fg">Kein Titel ausgerüstet</p>
        )}
      </div>

      {/* Title grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sortedTitles.map((title) => {
          const isOwned = ownedSlugs.has(title.slug);
          const isEquipped = title.slug === equippedSlug;
          const ownedRecord = ownedTitles.find((t) => t.titleSlug === title.slug);

          return (
            <div
              key={title.slug}
              className={cn(
                "flex flex-col gap-3 border p-4 transition-colors",
                isEquipped && "border-brand/50 bg-brand/4",
                isOwned && !isEquipped && "border-success/30 bg-success/2",
                !isOwned && "border-border opacity-50",
              )}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl leading-none">{isOwned ? title.icon : "❓"}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p
                      className={cn("text-sm font-bold", !isOwned && "text-muted-fg")}
                      style={isOwned ? { color: title.color } : undefined}
                    >
                      {isOwned ? `[${title.name}]` : "???"}
                    </p>
                    {isEquipped && <CheckCircle2 className="size-3.5 text-brand" />}
                    {!isOwned && <Lock className="size-3.5 text-muted-fg/40" />}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-fg">
                    {isOwned ? title.description : title.unlockHint}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Badge variant={RARITY_VARIANT[title.rarity] ?? "outline"} className="text-[10px]">
                  {RARITY_LABELS[title.rarity]}
                </Badge>
                {isOwned && ownedRecord && (
                  <span className="text-[10px] text-muted-fg">
                    {ownedRecord.unlockedAt.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                  </span>
                )}
              </div>

              {isOwned && !isEquipped && (
                <form action={equipTitle.bind(null, title.slug)}>
                  <Button type="submit" size="sm" variant="secondary" className="w-full">
                    Ausrüsten
                  </Button>
                </form>
              )}

              {isEquipped && (
                <p className="text-center text-xs font-semibold text-brand">Ausgerüstet ✓</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
