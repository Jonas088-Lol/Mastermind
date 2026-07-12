/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Clock, Package, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { BOOSTER_DEFS } from "@/lib/booster";
import { SHOP_ITEMS } from "@/lib/shop";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Inventar · MasterMind" };

const RARITY_BADGE: Record<string, { label: string; className: string }> = {
  common:    { label: "Gewöhnlich",   className: "bg-surface-2 text-muted-fg border border-border" },
  uncommon:  { label: "Ungewöhnlich", className: "bg-success/15 text-success" },
  rare:      { label: "Selten",       className: "bg-info/15 text-info" },
  epic:      { label: "Episch",       className: "bg-brand/15 text-brand" },
  legendary: { label: "Legendär",     className: "bg-warning/15 text-warning" },
  mythic:    { label: "Mythisch",     className: "bg-danger/15 text-danger" },
};

const RARITY_BORDER: Record<string, string> = {
  common:    "border-border",
  uncommon:  "border-success/30",
  rare:      "border-info/30",
  epic:      "border-brand/30",
  legendary: "border-warning/40",
  mythic:    "border-danger/40",
};

// Anzeige-Reihenfolge + deutsche Labels der Item-Kategorien
const CATEGORY_SECTIONS: { key: string; label: string; hint: string }[] = [
  { key: "cosmetic",      label: "Kosmetik",          hint: "Rahmen, Hintergründe, Badges & mehr" },
  { key: "title",         label: "Titel",             hint: "Freigeschaltete Profil-Titel" },
  { key: "powerup",       label: "Power-Ups",         hint: "Einmalige Verbrauchsgegenstände" },
  { key: "booster",       label: "Booster",           hint: "Gekaufte XP-Booster" },
  { key: "streak_freeze", label: "Streak-Schutz",     hint: "Schutz-Gegenstände" },
  { key: "bundle",        label: "Pakete",            hint: "Gekaufte Bundles" },
  { key: "sonstiges",     label: "Sonstiges",         hint: "Weitere Gegenstände" },
];

function timeLeft(expiresAt: Date, now: Date): string {
  const ms = expiresAt.getTime() - now.getTime();
  if (ms <= 0) return "Abgelaufen";
  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}T ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default async function InventarPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect(ROLE_HOME[effectiveRole(session)]);

  const now = new Date();
  const userId = session.userId;

  const [user, activeBoosters, inventoryItems] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { streakFreezes: true },
    }),
    prisma.userBooster.findMany({
      where: { userId, expiresAt: { gt: now } },
      orderBy: { multiplier: "desc" },
    }),
    prisma.userInventoryItem.findMany({
      where: { userId },
      orderBy: { acquiredAt: "desc" },
    }),
  ]);

  const streakFreezes = user?.streakFreezes ?? 0;
  const totalItems = inventoryItems.reduce((sum, i) => sum + i.quantity, 0);

  // Gruppierung nach Shop-Kategorie
  const grouped = new Map<string, typeof inventoryItems>();
  for (const item of inventoryItems) {
    const def = SHOP_ITEMS.find((s) => s.slug === item.itemSlug);
    const key = def?.category ?? "sonstiges";
    const list = grouped.get(key) ?? [];
    list.push(item);
    grouped.set(key, list);
  }
  const sections = CATEGORY_SECTIONS.filter((c) => (grouped.get(c.key)?.length ?? 0) > 0);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      {/* Header */}
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Gamification</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Inventar</h1>
          <p className="mt-1 text-sm text-muted-fg">
            {totalItems} {totalItems === 1 ? "Gegenstand" : "Gegenstände"} · {activeBoosters.length} aktive{" "}
            {activeBoosters.length === 1 ? "Booster" : "Booster"}
          </p>
        </div>
        <Package className="size-10 text-brand opacity-20" strokeWidth={1} />
      </header>

      {/* Active Boosters */}
      {activeBoosters.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <div>
              <h2 className="text-lg font-bold">Aktive Booster</h2>
              <p className="text-xs text-muted-fg">Aktuell laufende XP-Multiplikatoren</p>
            </div>
            <span className="font-mono text-sm text-muted-fg">{activeBoosters.length} aktiv</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeBoosters.map((booster) => {
              const def = BOOSTER_DEFS.find((b) => b.slug === booster.boosterSlug);
              const name = def?.name ?? booster.boosterSlug;
              const icon = def?.icon ?? "⚡";
              const remaining = timeLeft(booster.expiresAt, now);

              return (
                <div
                  key={booster.id}
                  className="flex flex-col gap-3 border border-warning/40 bg-warning/3 p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl leading-none">{icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold leading-tight">{name}</p>
                      <p className="mt-0.5 text-xs text-muted-fg">XP-Multiplikator aktiv</p>
                    </div>
                    <span className="shrink-0 rounded bg-warning/15 px-2 py-0.5 text-xs font-bold text-warning">
                      ×{booster.multiplier}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-fg">
                    <Clock className="size-3 shrink-0" />
                    <span>Noch {remaining}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Streak Freezes */}
      <section>
        <div className="mb-3">
          <h2 className="text-lg font-bold">Streak-Schutz</h2>
          <p className="text-xs text-muted-fg">Schützt deinen Streak wenn du einen Tag aussetzt</p>
        </div>
        <div className="border border-border bg-bg p-4">
          <div className="flex items-center gap-4">
            <span className="text-4xl leading-none">🧊</span>
            <div className="flex-1">
              <p className="font-bold">Streak-Schutz verfügbar</p>
              <p className="text-sm text-muted-fg">
                Schützt deinen Streak automatisch, wenn du einen Tag nicht lernst
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold tabular-nums">{streakFreezes}</p>
              <p className="text-xs text-muted-fg">{streakFreezes === 1 ? "Tag" : "Tage"}</p>
            </div>
          </div>
          {streakFreezes === 0 && (
            <div className="mt-3 border-t border-border pt-3">
              <p className="text-xs text-muted-fg">
                Kein Schutz verfügbar.{" "}
                <Link href="/app/shop?cat=streak_freeze" className="text-brand hover:underline">
                  Im Shop kaufen →
                </Link>
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Inventory Grid */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <div>
            <h2 className="text-lg font-bold">Gegenstände</h2>
            <p className="text-xs text-muted-fg">Alle erworbenen Items</p>
          </div>
          {inventoryItems.length > 0 && (
            <span className="font-mono text-sm text-muted-fg">{inventoryItems.length} {inventoryItems.length === 1 ? "Slot" : "Slots"}</span>
          )}
        </div>

        {inventoryItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 border border-dashed border-border py-16 text-center">
            <ShoppingBag className="size-10 text-muted-fg/30" strokeWidth={1} />
            <div>
              <p className="font-semibold text-muted-fg">Dein Inventar ist leer</p>
              <p className="mt-1 text-sm text-muted-fg/70">
                Kaufe Items im Shop, um sie hier zu sehen.
              </p>
            </div>
            <Link
              href="/app/shop"
              className="inline-flex items-center gap-2 rounded bg-brand px-4 py-2 text-sm font-semibold text-brand-fg transition-opacity hover:opacity-90"
            >
              <ShoppingBag className="size-4" />
              Zum Shop
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {sections.map((section) => {
              const items = grouped.get(section.key)!;
              const sectionQty = items.reduce((sum, i) => sum + i.quantity, 0);
              return (
                <div key={section.key}>
                  <div className="mb-2 flex items-center gap-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-fg">{section.label}</h3>
                    <span className="inline-flex items-center rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[10px] font-bold text-muted-fg">
                      {sectionQty}
                    </span>
                    <span className="hidden text-xs text-muted-fg/70 sm:inline">· {section.hint}</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((item) => {
              const def = SHOP_ITEMS.find((s) => s.slug === item.itemSlug);
              const name = def?.name ?? item.itemSlug;
              const icon = def?.icon ?? "📦";
              const description = def?.description ?? "";
              const rarity = def?.rarity ?? "common";
              const rarityInfo = RARITY_BADGE[rarity] ?? RARITY_BADGE.common;
              const borderClass = RARITY_BORDER[rarity] ?? RARITY_BORDER.common;
              const hasExpiry = item.expiresAt !== null;
              const isExpired = hasExpiry && item.expiresAt! < now;
              const remaining = hasExpiry && !isExpired ? timeLeft(item.expiresAt!, now) : null;

              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex flex-col gap-3 border p-4 transition-opacity",
                    borderClass,
                    isExpired && "opacity-50",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <span className="text-2xl leading-none">{icon}</span>
                      {item.quantity > 1 && (
                        <span className="absolute -right-2 -top-1 flex size-5 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-brand-fg">
                          {item.quantity > 99 ? "99+" : item.quantity}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold leading-tight">{name}</p>
                      {description && (
                        <p className="mt-0.5 text-xs text-muted-fg">{description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", rarityInfo.className)}>
                      {rarityInfo.label}
                    </span>
                    {remaining && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-fg">
                        <Clock className="size-3" />
                        {remaining}
                      </div>
                    )}
                    {isExpired && (
                      <span className="text-[10px] text-danger">Abgelaufen</span>
                    )}
                  </div>
                </div>
              );
            })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Shop CTA */}
      <div className="flex items-center justify-between border border-dashed border-border px-5 py-4">
        <div>
          <p className="text-sm font-semibold">Mehr Items entdecken</p>
          <p className="text-xs text-muted-fg">Kaufe Booster, Kosmetik und mehr</p>
        </div>
        <Link
          href="/app/shop"
          className="inline-flex items-center gap-2 rounded bg-surface-2 px-4 py-2 text-sm font-semibold transition-colors hover:bg-surface-3"
        >
          <ShoppingBag className="size-4" />
          Shop
        </Link>
      </div>
    </div>
  );
}
