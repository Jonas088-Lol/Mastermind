import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShoppingBag, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { getBalance } from "@/lib/coins";
import { cn } from "@/lib/utils";
import { purchaseItem } from "./actions";

export const metadata: Metadata = { title: "Shop · MasterMind" };

interface PageProps {
  searchParams: Promise<{ cat?: string }>;
}

const CATEGORIES = [
  { key: "alle",         label: "Alle" },
  { key: "booster",      label: "Booster" },
  { key: "streak_freeze",label: "Streak-Schutz" },
  { key: "powerup",      label: "Power-Ups" },
  { key: "cosmetic",     label: "Kosmetik" },
  { key: "title",        label: "Titel" },
  { key: "bundle",       label: "Bundles" },
  { key: "limitiert",    label: "Limitiert" },
] as const;

type CategoryKey = typeof CATEGORIES[number]["key"];

const RARITY_BADGE: Record<string, { label: string; className: string }> = {
  common:    { label: "Gewöhnlich",  className: "bg-surface-2 text-muted-fg border border-border" },
  uncommon:  { label: "Ungewöhnlich",className: "bg-success/15 text-success" },
  rare:      { label: "Selten",      className: "bg-info/15 text-info" },
  epic:      { label: "Episch",      className: "bg-brand/15 text-brand" },
  legendary: { label: "Legendär",    className: "bg-warning/15 text-warning" },
};

const RARITY_BORDER: Record<string, string> = {
  common:    "border-border",
  uncommon:  "border-success/30",
  rare:      "border-info/30",
  epic:      "border-brand/30",
  legendary: "border-warning/40",
};

const BOOSTER_EFFECT_LABEL: Record<string, string> = {
  xp_boost:    "XP-Booster",
  streak_freeze: "Streak-Schutz",
  ai_quota:    "KI-Anfragen",
  coin_doubler:"Münz-Boost",
  boss_damage: "Boss-Schaden",
  quest_reset: "Quest-Reset",
  xp_grant:    "XP-Sofort",
};

export default async function ShopPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect(ROLE_HOME[effectiveRole(session)]);

  const { cat: catParam } = await searchParams;
  const activeCategory: CategoryKey =
    (CATEGORIES.find((c) => c.key === catParam)?.key ?? "alle") as CategoryKey;

  const now = new Date();

  const [balance, shopItems, activeBoosters, inventoryItems] = await Promise.all([
    getBalance(session.userId),
    prisma.shopItem.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.userBooster.findMany({
      where: { userId: session.userId, expiresAt: { gt: now } },
      orderBy: { expiresAt: "asc" },
    }),
    prisma.userInventoryItem.findMany({
      where: { userId: session.userId },
      select: { itemSlug: true, quantity: true },
    }),
  ]);

  const ownedSlugs = new Set(inventoryItems.map((i) => i.itemSlug));

  // Filter by category
  const filteredItems = shopItems.filter((item) => {
    if (activeCategory === "alle") return true;
    if (activeCategory === "limitiert") return item.isLimited;
    return item.category === activeCategory;
  });

  function timeLeft(expiresAt: Date): string {
    const ms = expiresAt.getTime() - now.getTime();
    if (ms <= 0) return "Abgelaufen";
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    if (h >= 24) return `${Math.floor(h / 24)}T ${h % 24}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      {/* Header */}
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Gamification</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Shop</h1>
          <p className="mt-1 text-sm text-muted-fg">
            Kaufe Booster, Kosmetiken und mehr mit deinen Münzen
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2">
          <span className="text-lg">🪙</span>
          <span className="font-mono text-lg font-bold">{balance.toLocaleString("de-DE")}</span>
          <span className="text-sm text-muted-fg">Münzen</span>
        </div>
      </header>

      {/* Active boosters banner */}
      {activeBoosters.length > 0 && (
        <div className="border border-warning/40 bg-warning/[0.05] p-4">
          <div className="mb-2 flex items-center gap-2">
            <Zap className="size-4 text-warning" />
            <span className="text-sm font-semibold text-warning">Aktive Booster</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeBoosters.map((booster) => (
              <div
                key={booster.id}
                className="flex items-center gap-2 rounded-lg border border-warning/30 bg-surface px-3 py-1.5"
              >
                <span className="text-sm font-semibold">
                  {BOOSTER_EFFECT_LABEL[booster.boosterSlug.includes("boost") ? "xp_boost" : booster.boosterSlug] ?? booster.boosterSlug}
                </span>
                <span className="font-mono text-xs font-bold text-warning">×{booster.multiplier}</span>
                <span className="text-xs text-muted-fg">· {timeLeft(booster.expiresAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category filter tabs */}
      <nav className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.key;
          return (
            <Link
              key={cat.key}
              href={cat.key === "alle" ? "/app/shop" : `/app/shop?cat=${cat.key}`}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand text-brand-fg"
                  : "bg-surface border border-border text-fg hover:border-fg/30",
              )}
            >
              {cat.label}
            </Link>
          );
        })}
      </nav>

      {/* Items grid */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center gap-3 border border-border bg-surface py-16 text-center">
          <ShoppingBag className="size-10 text-muted-fg/40" strokeWidth={1} />
          <p className="text-lg font-bold">Keine Artikel gefunden</p>
          <p className="text-sm text-muted-fg">In dieser Kategorie gibt es aktuell keine Artikel</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item) => {
            const rarity = RARITY_BADGE[item.rarity] ?? RARITY_BADGE.common;
            const border = RARITY_BORDER[item.rarity] ?? RARITY_BORDER.common;
            const isOwned = ownedSlugs.has(item.slug);
            const canAfford = balance >= item.coinPrice;
            const isFree = item.coinPrice === 0;

            return (
              <div
                key={item.id}
                className={cn(
                  "flex flex-col gap-3 border-2 bg-bg p-4 transition-colors",
                  border,
                )}
              >
                {/* Icon + rarity */}
                <div className="flex items-start justify-between gap-2">
                  <span className="text-4xl leading-none">{item.icon}</span>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                        rarity.className,
                      )}
                    >
                      {rarity.label}
                    </span>
                    {item.isLimited && (
                      <Badge variant="danger" className="text-[10px]">Limitiert</Badge>
                    )}
                  </div>
                </div>

                {/* Name + description */}
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-bold leading-tight">{item.name}</p>
                  <p className="text-xs text-muted-fg">{item.description}</p>
                </div>

                {/* Stock */}
                {item.isLimited && item.stock !== null && (
                  <p className="text-xs text-muted-fg">
                    Noch <span className="font-semibold text-warning">{item.stock}</span> verfügbar
                  </p>
                )}

                {/* Price + buy */}
                <div className="mt-auto space-y-2">
                  {isFree ? (
                    <div className="flex items-center gap-1 text-sm font-bold text-success">
                      <span>Gratis</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="text-base">🪙</span>
                      <span
                        className={cn(
                          "font-mono text-sm font-bold",
                          canAfford ? "text-fg" : "text-danger",
                        )}
                      >
                        {item.coinPrice.toLocaleString("de-DE")}
                      </span>
                    </div>
                  )}

                  {isOwned ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="success" className="text-[10px]">Im Besitz</Badge>
                      <form action={purchaseItem.bind(null, item.slug)}>
                        <button
                          type="submit"
                          disabled={isFree || !canAfford}
                          className={cn(
                            "inline-flex h-8 items-center justify-center gap-1.5 px-3 text-xs font-semibold transition-colors",
                            "bg-surface border border-border text-fg hover:border-fg/30",
                            "disabled:pointer-events-none disabled:opacity-50",
                          )}
                        >
                          Nochmal
                        </button>
                      </form>
                    </div>
                  ) : (
                    <form action={purchaseItem.bind(null, item.slug)}>
                      <button
                        type="submit"
                        disabled={isFree || !canAfford}
                        className={cn(
                          "inline-flex w-full h-10 items-center justify-center gap-2 text-sm font-semibold transition-[background-color,color,border-color,transform] outline-none",
                          "focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                          "disabled:pointer-events-none disabled:opacity-50",
                          canAfford && !isFree
                            ? "bg-brand text-brand-fg hover:bg-brand-dark hover:shadow-[0_8px_24px_-8px_hsl(var(--brand)/0.45)] hover:-translate-y-px active:translate-y-0"
                            : "bg-surface border border-border text-fg",
                        )}
                      >
                        {isFree ? "Nur mit Echtgeld" : !canAfford ? "Zu wenig Münzen" : "Kaufen"}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
