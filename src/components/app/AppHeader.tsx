"use client";

import Link from "next/link";
import { Command, LogOut, Search } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationCenter, type NotificationItem } from "@/components/app/NotificationCenter";
import { logout } from "@/app/login/actions";

export interface AppHeaderProps {
  user: { name: string; subtitle: string };
  searchPlaceholder?: string;
  unreadCount?: number;
  notifications?: NotificationItem[];
}

export function AppHeader({
  user,
  searchPlaceholder = "Suchen — Aufgaben, Karten, Lehrer …",
  unreadCount = 0,
  notifications = [],
}: AppHeaderProps) {
  return (
    <header className="flex h-16 items-center gap-4 border-b border-border bg-bg/85 px-6 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
      <Link
        href="/search"
        className="group flex flex-1 max-w-md items-center gap-2 border border-border bg-surface px-3 py-1.5 text-left text-sm text-muted-fg transition-colors hover:border-border-strong hover:text-fg"
        aria-label="Suche öffnen"
      >
        <Search className="size-4 shrink-0" />
        <span className="flex-1 truncate">{searchPlaceholder}</span>
        <kbd className="hidden items-center gap-0.5 border border-border bg-bg px-1.5 py-0.5 font-mono text-[10px] text-muted-fg sm:inline-flex">
          <Command className="size-3" />
          K
        </kbd>
      </Link>

      <div className="flex items-center gap-1">
        <NotificationCenter unreadCount={unreadCount} notifications={notifications} />
        <ThemeToggle />
        <div className="ml-2 flex items-center gap-2 border-l border-border pl-3">
          <Avatar name={user.name} size="sm" />
          <div className="hidden text-xs leading-tight md:block">
            <p className="font-semibold">{user.name}</p>
            <p className="text-muted-fg">{user.subtitle}</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              aria-label="Abmelden"
              title="Abmelden"
              className="ml-1 grid size-9 place-items-center text-muted-fg transition-colors hover:bg-surface hover:text-fg"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
