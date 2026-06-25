"use client";

import Link from "next/link";
import { Search, Zap, Coins } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationCenter, type NotificationItem } from "@/components/app/NotificationCenter";
import { logout } from "@/app/login/actions";
import { CoinIcon } from "@/components/ui/CoinIcon";

export interface AppHeaderProps {
  user: { name: string; subtitle: string; avatarUrl?: string | null };
  searchPlaceholder?: string;
  unreadCount?: number;
  notifications?: NotificationItem[];
  coinBalance?: number;
  premiumCoinBalance?: number;
  appName?: string;
  activeBooster?: { multiplier: number; expiresAt: Date } | null;
  eventBanner?: string | null;
  doubleXp?: boolean;
  doubleCoins?: boolean;
}

export function AppHeader({
  user,
  searchPlaceholder = "Suchen …",
  unreadCount = 0,
  notifications = [],
  coinBalance,
  premiumCoinBalance,
  appName,
  activeBooster,
  eventBanner,
  doubleXp,
  doubleCoins,
}: AppHeaderProps) {
  const hasEvent = doubleXp || doubleCoins;

  return (
    <div>
      {/* Event Banner */}
      {(eventBanner || hasEvent) && (
        <div className="flex items-center justify-center gap-3 bg-linear-to-r from-brand/90 to-purple-600/90 px-4 py-1.5 text-xs font-semibold text-white">
          <Zap className="size-3.5 shrink-0" />
          <span>
            {eventBanner
              ? eventBanner
              : [
                  doubleXp && "2× XP",
                  doubleCoins && "2× Münzen",
                ].filter(Boolean).join(" · ")}
          </span>
          {activeBooster && (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px]">
              +Booster {activeBooster.multiplier}×
            </span>
          )}
        </div>
      )}

      <header className="safe-top flex h-15 items-center gap-2 border-b border-border bg-bg/95 px-3 backdrop-blur-md supports-backdrop-filter:bg-bg/80 sm:h-16 sm:gap-3 sm:px-5 lg:h-17 lg:gap-4 lg:px-6">
        {/* Mobile title — replaces search bar on small screens */}
        <span className="flex-1 truncate text-sm font-semibold lg:hidden">
          {appName ?? "MasterMind"}
        </span>

        {/* Search — desktop only (mobile: in "Mehr" drawer) */}
        <Link
          href="/search"
          className="group hidden lg:flex flex-1 items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-muted-fg transition-all hover:border-border-strong hover:bg-surface-2 hover:text-fg sm:gap-2.5 sm:px-3.5 sm:py-2.5 sm:max-w-sm"
          aria-label="Suche öffnen"
        >
          <Search className="size-4 shrink-0 text-muted-fg" />
          <span className="flex-1 truncate text-sm">{searchPlaceholder}</span>
          <kbd className="hidden items-center gap-0.5 rounded-md border border-border bg-bg px-1.5 py-0.5 font-mono text-[10px] text-muted-fg sm:inline-flex">
            ⌘K
          </kbd>
        </Link>

        {appName && (
          <span className="hidden rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-muted-fg lg:inline-block">
            {appName}
          </span>
        )}

        <div className="flex items-center gap-0.5 sm:gap-1">
          {/* Active booster indicator */}
          {activeBooster && !hasEvent && (
            <span className="hidden items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-bold text-brand sm:flex">
              <Zap className="size-3" />
              {activeBooster.multiplier}× Booster
            </span>
          )}

          {/* Premium Coins (💎) — desktop only */}
          {premiumCoinBalance !== undefined && premiumCoinBalance > 0 && (
            <Link
              href="/app/coins"
              className="hidden items-center gap-1 rounded-xl px-2 py-1.5 text-sm font-semibold text-cyan-500 transition-colors hover:bg-cyan-50 dark:hover:bg-cyan-950/30 sm:flex"
              title="Premium-Münzen"
            >
              <span className="text-base leading-none">💎</span>
              <span>{premiumCoinBalance.toLocaleString("de-DE")}</span>
            </Link>
          )}

          {/* Coins — desktop only */}
          {coinBalance !== undefined && (
            <Link
              href="/app/coins"
              className="hidden items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm font-semibold text-amber-600 transition-colors hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30 sm:flex"
              title="Münzen"
            >
              <CoinIcon className="size-4 text-amber-500" />
              <span>{coinBalance.toLocaleString("de-DE")}</span>
              {doubleCoins && (
                <span className="rounded-full bg-amber-500 px-1 py-0.5 text-[9px] font-black text-white">2×</span>
              )}
            </Link>
          )}

          {/* Mobile: coin + gem in one compact pill */}
          {(coinBalance !== undefined || (premiumCoinBalance !== undefined && premiumCoinBalance > 0)) && (
            <Link
              href="/app/coins"
              className="flex items-center gap-1.5 rounded-xl px-2 py-1 sm:hidden"
              title="Münzen"
            >
              {premiumCoinBalance !== undefined && premiumCoinBalance > 0 && (
                <span className="text-sm font-bold text-cyan-500">💎{premiumCoinBalance.toLocaleString("de-DE")}</span>
              )}
              {coinBalance !== undefined && (
                <span className="flex items-center gap-1 text-sm font-bold text-amber-500">
                  <CoinIcon className="size-3.5" />
                  {coinBalance.toLocaleString("de-DE")}
                </span>
              )}
            </Link>
          )}

          <NotificationCenter unreadCount={unreadCount} notifications={notifications} />
          <ThemeToggle />

          {/* User avatar → links to profile — desktop only (mobile: in "Mehr" drawer) */}
          <div className="ml-0.5 hidden lg:flex items-center gap-2 border-l border-border pl-2 sm:ml-1 sm:gap-2.5 sm:pl-3">
            <Link href="/app/profil" className="relative shrink-0 transition-transform hover:scale-105" title="Mein Profil">
              <Avatar name={user.name} src={user.avatarUrl ?? undefined} size="md" />
              {doubleXp && (
                <span className="absolute -right-1 -top-1 rounded-full bg-brand px-1 py-0.5 text-[8px] font-black text-white leading-none">2×</span>
              )}
            </Link>
            <div className="hidden flex-col text-xs leading-tight md:flex">
              <p className="font-semibold">{user.name}</p>
              <p className="text-muted-fg">{user.subtitle}</p>
            </div>
            <form action={logout} className="hidden sm:block">
              <button
                type="submit"
                aria-label="Abmelden"
                title="Abmelden"
                className="ml-1 grid size-9 place-items-center rounded-lg text-muted-fg transition-colors hover:bg-surface hover:text-fg"
              >
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </header>
    </div>
  );
}
