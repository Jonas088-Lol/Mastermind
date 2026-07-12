/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShoppingBag, Sparkles, Zap } from "lucide-react";
import { CoinIcon } from "@/components/ui/CoinIcon";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { getBalance } from "@/lib/coins";
import { COMPONENT_ICON } from "@/lib/shop";
import { safeJsonParse } from "@/lib/safe-json";
import { cn } from "@/lib/utils";
import { purchaseItemDef } from "./actions";

export const metadata: Metadata = { title: "Shop · MasterMind" };

interface PageProps { searchParams: Promise<{ cat?: string; rarity?: string; sort?: string }> }

// Map ItemKind → category tab key
const CATEGORIES = [
  { key: "alle",        label: "Alle" },
  { key: "CONSUMABLE",  label: "Booster & Power-Ups" },
  { key: "COSMETIC",    label: "Kosmetik" },
  { key: "GEAR",        label: "Ausrüstung" },
  { key: "TITLE",       label: "Titel" },
  { key: "featured",    label: "✨ Featured" },
] as const;
type CatKey = typeof CATEGORIES[number]["key"];

const RARITY_STYLE: Record<string, { label: string; badge: string; border: string }> = {
  COMMON:    { label: "Gewöhnlich",   badge: "bg-surface-2 text-muted-fg border border-border", border: "border-border" },
  UNCOMMON:  { label: "Ungewöhnlich", badge: "bg-success/15 text-success",                       border: "border-success/30" },
  RARE:      { label: "Selten",       badge: "bg-info/15 text-info",                             border: "border-info/30" },
  EPIC:      { label: "Episch",       badge: "bg-brand/15 text-brand",                           border: "border-brand/30" },
  LEGENDARY: { label: "Legendär",     badge: "bg-warning/15 text-warning",                       border: "border-warning/40" },
  MYTHIC:    { label: "Mythisch",     badge: "bg-danger/15 text-danger",                         border: "border-danger/40" },
  SECRET:    { label: "Geheim",       badge: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400", border: "border-yellow-400/40" },
};

const RARITY_FILTERS = ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC", "SECRET"] as const;

const SORT_OPTIONS = [
  { key: "standard",  label: "Standard" },
  { key: "preis_auf", label: "Preis ↑" },
  { key: "preis_ab",  label: "Preis ↓" },
  { key: "neueste",   label: "Neueste" },
] as const;
type SortKey = typeof SORT_OPTIONS[number]["key"];

function shopHref(cat: CatKey, rarity: string | null, sort: SortKey): string {
  const params = new URLSearchParams();
  if (cat !== "alle") params.set("cat", cat);
  if (rarity) params.set("rarity", rarity);
  if (sort !== "standard") params.set("sort", sort);
  const qs = params.toString();
  return qs ? `/app/shop?${qs}` : "/app/shop";
}

function dayOfYear(d: Date): number {
  return Math.floor((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 0)) / 86_400_000);
}

const BOOSTER_LABEL: Record<string, string> = {
  boost_xp: "XP-Booster", streak_freeze: "Streak-Schutz", ai_quota: "KI-Anfragen",
};

export default async function ShopPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect(ROLE_HOME[effectiveRole(session)]);

  const { cat: catParam, rarity: rarityParam, sort: sortParam } = await searchParams;
  const activeCat: CatKey = (CATEGORIES.find((c) => c.key === catParam)?.key ?? "alle") as CatKey;
  const activeRarity: string | null = RARITY_FILTERS.find((r) => r === rarityParam?.trim().toUpperCase()) ?? null;
  const activeSort: SortKey = (SORT_OPTIONS.find((s) => s.key === sortParam)?.key ?? "standard") as SortKey;

  const now = new Date();

  const [balance, listings, activeBoosters, ownedItems] = await Promise.all([
    getBalance(session.userId),

    // All active ShopListings with their ItemDef
    prisma.shopListing.findMany({
      where: {
        item: { isActive: true },
        OR: [{ activeFrom: null }, { activeFrom: { lte: now } }],
        AND: [{ OR: [{ activeTo: null }, { activeTo: { gte: now } }] }],
      },
      include: { item: true },
      orderBy: { featured: "desc" },
    }),

    // Active boosters (old system)
    prisma.userBooster.findMany({
      where: { userId: session.userId, expiresAt: { gt: now } },
      orderBy: { expiresAt: "asc" },
    }),

    // Owned ItemDef items
    prisma.userItem.findMany({
      where: { userId: session.userId },
      select: { itemId: true, qty: true, equipped: true },
    }),
  ]);

  const ownedMap = new Map(ownedItems.map((o) => [o.itemId, o]));

  const filtered = listings
    .filter((l) => {
      if (activeRarity && l.item.rarity !== activeRarity) return false;
      if (activeCat === "alle")     return true;
      if (activeCat === "featured") return l.featured;
      return l.item.kind === activeCat;
    })
    .sort((a, b) => {
      if (activeSort === "preis_auf") return (a.item.priceCoins ?? Infinity) - (b.item.priceCoins ?? Infinity);
      if (activeSort === "preis_ab")  return (b.item.priceCoins ?? -1) - (a.item.priceCoins ?? -1);
      if (activeSort === "neueste")   return b.item.createdAt.getTime() - a.item.createdAt.getTime();
      return 0; // "standard": keep featured-first order from query
    });

  // Deterministische Empfehlung des Tages (kein Math.random im Render)
  const dailyPool = [...listings].sort((a, b) => a.item.key.localeCompare(b.item.key));
  const dailyPick = dailyPool.length > 0 ? dailyPool[dayOfYear(now) % dailyPool.length] : null;

  // Wie viele Artikel kann sich der User aktuell leisten?
  const affordableCount = listings.filter(
    (l) => l.item.priceCoins != null && l.item.priceCoins > 0 && l.item.priceCoins <= balance,
  ).length;

  function boosterTimeLeft(expiresAt: Date): string {
    const ms = expiresAt.getTime() - now.getTime();
    if (ms <= 0) return "Abgelaufen";
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    if (h >= 24) return `${Math.floor(h / 24)}T`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      {/* Header */}
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Gamification</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Shop</h1>
          <p className="mt-1 text-sm text-muted-fg">Kaufe Booster, Kosmetiken und Ausrüstung mit Münzen</p>
        </div>
        <div className="flex flex-col items-end gap-1 rounded-2xl border border-warning/30 bg-warning/5 px-5 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <CoinIcon className="size-6 text-warning" />
            <span className="font-mono text-2xl font-bold tabular-nums">{balance.toLocaleString("de-DE")}</span>
            <span className="text-sm text-muted-fg">Münzen</span>
          </div>
          <p className="text-xs text-muted-fg">
            {affordableCount === 0
              ? "Reicht aktuell für keinen Artikel"
              : `Reicht für ${affordableCount} ${affordableCount === 1 ? "Artikel" : "Artikel"} im Shop`}
          </p>
        </div>
      </header>

      {/* Empfehlung des Tages */}
      {dailyPick && (
        <div className="relative overflow-hidden rounded-2xl border-2 border-brand/50 bg-surface p-4 shadow-[0_0_24px_-6px] shadow-brand/40 sm:p-5">
          <div className="pointer-events-none absolute -top-12 -right-12 size-40 rounded-full bg-brand/10 blur-2xl" />
          <div className="flex items-center gap-4">
            <span className="text-5xl leading-none">{COMPONENT_ICON[dailyPick.item.componentKey] ?? "📦"}</span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand">
                <Sparkles className="size-3.5" /> Empfehlung des Tages
              </p>
              <p className="mt-0.5 truncate text-base font-bold">{dailyPick.item.name}</p>
              <p className="truncate text-xs text-muted-fg">{dailyPick.item.description}</p>
            </div>
            {dailyPick.item.priceCoins ? (
              <div className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-bg px-3 py-2">
                <CoinIcon className="size-4 text-warning" />
                <span className="font-mono text-sm font-bold">{dailyPick.item.priceCoins.toLocaleString("de-DE")}</span>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Active boosters */}
      {activeBoosters.length > 0 && (
        <div className="rounded-2xl border border-warning/40 bg-warning/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Zap className="size-4 text-warning" />
            <span className="text-sm font-semibold text-warning">Aktive Booster</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeBoosters.map((b) => (
              <div key={b.id} className="flex items-center gap-2 rounded-lg border border-warning/30 bg-surface px-3 py-1.5">
                <span className="text-sm font-semibold">
                  {BOOSTER_LABEL[b.boosterSlug.includes("boost") ? "boost_xp" : b.boosterSlug] ?? b.boosterSlug}
                </span>
                <span className="font-mono text-xs font-bold text-warning">×{b.multiplier}</span>
                <span className="text-xs text-muted-fg">· {boosterTimeLeft(b.expiresAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category tabs */}
      <div className="flex flex-col gap-3">
        <nav className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => {
            const isActive = activeCat === cat.key;
            return (
              <Link key={cat.key}
                href={shopHref(cat.key, activeRarity, activeSort)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive ? "bg-brand text-brand-fg" : "bg-surface border border-border text-fg hover:border-fg/30",
                )}>
                {cat.label}
              </Link>
            );
          })}
        </nav>

        {/* Rarity filter pills */}
        <nav className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-fg mr-1">Seltenheit</span>
          <Link
            href={shopHref(activeCat, null, activeSort)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
              !activeRarity ? "bg-brand text-brand-fg" : "bg-surface border border-border text-fg hover:border-fg/30",
            )}>
            Alle
          </Link>
          {RARITY_FILTERS.map((r) => {
            const style = RARITY_STYLE[r]!;
            const isActive = activeRarity === r;
            return (
              <Link key={r}
                href={shopHref(activeCat, isActive ? null : r, activeSort)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  isActive ? "bg-brand text-brand-fg" : cn(style.badge, "hover:opacity-80"),
                )}>
                {style.label}
              </Link>
            );
          })}
        </nav>

        {/* Sort pills */}
        <nav className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-fg mr-1">Sortierung</span>
          {SORT_OPTIONS.map((s) => {
            const isActive = activeSort === s.key;
            return (
              <Link key={s.key}
                href={shopHref(activeCat, activeRarity, s.key)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  isActive ? "bg-brand text-brand-fg" : "bg-surface border border-border text-fg hover:border-fg/30",
                )}>
                {s.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Items grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface py-16 text-center">
          <ShoppingBag className="size-10 text-muted-fg/40" strokeWidth={1} />
          <p className="text-lg font-bold">Keine Artikel gefunden</p>
          <p className="text-sm text-muted-fg">Mit diesen Filtern gibt es aktuell keine Artikel</p>
          <Link href="/app/shop" className="text-sm font-semibold text-brand hover:underline">Filter zurücksetzen</Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(({ item, featured, activeTo }) => {
            const style    = RARITY_STYLE[item.rarity] ?? RARITY_STYLE.COMMON!;
            const owned    = ownedMap.get(item.id);
            const price    = item.priceCoins;
            const premium  = item.pricePremium;
            const canAfford = price ? balance >= price : false;
            const icon     = COMPONENT_ICON[item.componentKey] ?? "📦";
            const isLimited = !!activeTo;
            const isDailyPick = dailyPick?.item.id === item.id;
            const meta = safeJsonParse(item.meta, {}) as {
              multiplier?: number; minutes?: number; days?: number;
              amount?: number; hpBonus?: number; dmgBonus?: number;
              slot?: string; text?: string;
            };

            return (
              <div key={item.id}
                className={cn(
                  "relative flex flex-col gap-3 rounded-2xl border-2 bg-bg p-4 transition-colors",
                  style.border,
                  featured && "ring-1 ring-brand/40",
                  isDailyPick && "border-brand/60 shadow-[0_0_20px_-4px] shadow-brand/40",
                )}>
                {featured && (
                  <span className="absolute top-2 left-2 text-[10px] font-bold text-brand bg-brand/10 border border-brand/20 rounded-full px-1.5 py-0.5">
                    ✨ Featured
                  </span>
                )}

                {/* Icon + rarity */}
                <div className="flex items-start justify-between gap-2 mt-1">
                  <span className="text-4xl leading-none">{icon}</span>
                  <div className="flex flex-col items-end gap-1">
                    <span className={cn("inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full", style.badge)}>
                      {style.label}
                    </span>
                    {isLimited && <Badge variant="danger" className="text-[10px]">Limitiert</Badge>}
                  </div>
                </div>

                {/* Name + description */}
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-bold leading-tight">{item.name}</p>
                  <p className="text-xs text-muted-fg">{item.description}</p>
                  {/* Effect hint */}
                  {meta.multiplier && <p className="text-[10px] text-warning font-mono">×{String(meta.multiplier)} XP · {String(meta.minutes)}min</p>}
                  {meta.days       && <p className="text-[10px] text-info font-mono">+{String(meta.days)} Streak-Tage</p>}
                  {meta.amount     && <p className="text-[10px] text-brand font-mono">+{String(meta.amount)} KI-Anfragen</p>}
                  {meta.hpBonus    && <p className="text-[10px] text-success font-mono">+{Math.round(Number(meta.hpBonus)*100)}% HP</p>}
                  {meta.dmgBonus   && <p className="text-[10px] text-danger font-mono">+{Math.round(Number(meta.dmgBonus)*100)}% DMG</p>}
                </div>

                {/* Price + buy */}
                <div className="mt-auto space-y-2">
                  {premium && !price ? (
                    <div className="flex items-center gap-1 text-sm font-bold text-yellow-600 dark:text-yellow-400">
                      💎 {premium} Premium
                    </div>
                  ) : price ? (
                    <div className="flex items-center gap-1">
                      <CoinIcon className="size-4 text-warning" />
                      <span className={cn("font-mono text-sm font-bold", canAfford ? "text-fg" : "text-danger")}>
                        {price.toLocaleString("de-DE")}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-fg">Durch Achievement</p>
                  )}

                  {owned ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="success" className="text-[10px]">
                        {owned.qty > 1 ? `×${owned.qty} Im Besitz` : "Im Besitz"}
                      </Badge>
                      {/* Consumables can be bought again */}
                      {item.kind === "CONSUMABLE" && price && (
                        <form action={purchaseItemDef.bind(null, item.id)}>
                          <button type="submit" disabled={!canAfford}
                            className="inline-flex h-8 items-center px-3 text-xs font-semibold bg-surface border border-border rounded-lg disabled:opacity-50">
                            Nochmal
                          </button>
                        </form>
                      )}
                    </div>
                  ) : price ? (
                    <form action={purchaseItemDef.bind(null, item.id)}>
                      <button type="submit" disabled={!canAfford}
                        className={cn(
                          "inline-flex w-full h-10 items-center justify-center gap-2 text-sm font-semibold rounded-xl transition-all outline-none",
                          "focus-visible:ring-2 focus-visible:ring-brand disabled:pointer-events-none disabled:opacity-50",
                          canAfford
                            ? "bg-brand text-brand-fg hover:bg-brand-dark hover:-translate-y-px active:translate-y-0"
                            : "bg-surface border border-border text-fg",
                        )}>
                        {!canAfford ? "Zu wenig Münzen" : "Kaufen"}
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
