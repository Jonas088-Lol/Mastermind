"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationCenter, type NotificationItem } from "@/components/app/NotificationCenter";
import { logout } from "@/app/login/actions";

export interface AppHeaderProps {
  user: { name: string; subtitle: string };
  searchPlaceholder?: string;
  unreadCount?: number;
  notifications?: NotificationItem[];
  coinBalance?: number;
  appName?: string;
}

export function AppHeader({
  user,
  searchPlaceholder = "Suchen …",
  unreadCount = 0,
  notifications = [],
  coinBalance,
  appName,
}: AppHeaderProps) {
  return (
    <header className="safe-top flex h-14 items-center gap-2 border-b border-border bg-bg/90 px-4 backdrop-blur-md supports-backdrop-filter:bg-bg/75 sm:h-16 sm:gap-4 sm:px-5">
      {/* Search */}
      <Link
        href="/search"
        className="group flex flex-1 items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-2 text-sm text-muted-fg transition-all hover:border-border-strong hover:bg-surface-2 hover:text-fg sm:max-w-sm"
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

      <div className="flex items-center gap-1">
        {/* Coins — desktop only */}
        {coinBalance !== undefined && (
          <Link
            href="/app/coins"
            className="hidden items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm font-semibold text-amber-600 transition-colors hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30 sm:flex"
            title="Münzen"
          >
            <span>🪙</span>
            <span>{coinBalance.toLocaleString("de-DE")}</span>
          </Link>
        )}

        <NotificationCenter unreadCount={unreadCount} notifications={notifications} />
        <ThemeToggle />

        {/* User — avatar always visible, name+logout only on sm+ */}
        <div className="ml-1 flex items-center gap-2 border-l border-border pl-3">
          <Avatar name={user.name} size="sm" />
          <div className="hidden flex-col text-xs leading-tight md:flex">
            <p className="font-semibold">{user.name}</p>
            <p className="text-muted-fg">{user.subtitle}</p>
          </div>
          <form action={logout} className="hidden sm:block">
            <button
              type="submit"
              aria-label="Abmelden"
              title="Abmelden"
              className="ml-1 grid size-8 place-items-center rounded-lg text-muted-fg transition-colors hover:bg-surface hover:text-fg"
            >
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
