/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  BarChart3,
  BookMarked,
  BookOpen,
  Box,
  Brain,
  Building2,
  Calculator,
  Calendar,
  CalendarDays,
  CalendarMinus,
  CheckSquare,
  ClipboardEdit,
  ClipboardList,
  Coins,
  Compass,
  FileCheck,
  FileText,
  Flame,
  Gift,
  Grid3X3,
  HardDrive,
  Home,
  Pencil,
  Languages,
  LayoutGrid,
  Layers,
  LineChart,
  LogOut,
  Megaphone,
  MessageSquare,
  Monitor,
  Package,
  PencilLine,
  RefreshCw,
  Search,
  Settings,
  Shield,
  ShoppingBag,
  Sparkles,
  Star,
  Sun,
  Swords,
  Tag,
  Target,
  Timer,
  TrendingUp,
  Trophy,
  UserCheck,
  UserCircle,
  Users,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { logout } from "@/app/login/actions";
import { NavCategories } from "@/components/app/NavCategories";

const ICONS = {
  award: Award,
  barChart3: BarChart3,
  bookMarked: BookMarked,
  bookOpen: BookOpen,
  box: Box,
  brain: Brain,
  calculator: Calculator,
  building2: Building2,
  calendar: Calendar,
  calendarDays: CalendarDays,
  calendarX: CalendarMinus,
  checkSquare: CheckSquare,
  clipboardEdit: ClipboardEdit,
  clipboardList: ClipboardList,
  coins: Coins,
  compass: Compass,
  fileCheck: FileCheck,
  fileText: FileText,
  flame: Flame,
  gift: Gift,
  grid: Grid3X3,
  hardDrive: HardDrive,
  home: Home,
  pencil: Pencil,
  languages: Languages,
  layers: Layers,
  lineChart: LineChart,
  megaphone: Megaphone,
  messageSquare: MessageSquare,
  monitor: Monitor,
  package: Package,
  pencilLine: PencilLine,
  refreshCw: RefreshCw,
  search: Search,
  settings: Settings,
  shield: Shield,
  shoppingBag: ShoppingBag,
  sparkles: Sparkles,
  star: Star,
  sun: Sun,
  swords: Swords,
  tag: Tag,
  target: Target,
  timer: Timer,
  trendingUp: TrendingUp,
  trophy: Trophy,
  userCheck: UserCheck,
  userCircle: UserCircle,
  users: Users,
  zap: Zap,
} satisfies Record<string, LucideIcon>;

export type BottomNavIcon = keyof typeof ICONS;

export type BottomNavItem = {
  href: string;
  label: string;
  icon: BottomNavIcon;
  badge?: string;
  exact?: boolean;
  modal?: string;
};

export type MoreNavItem = {
  href: string;
  label: string;
  icon: string;
  badge?: string;
  exact?: boolean;
  modal?: string;
};

/** Kategorien für das „Mehr"-Menü (vom Layout vorbereitet). */
export interface MoreNavCategory {
  id: string;
  label: string;
  collapsed: boolean;
  items: { href: string; label: string }[];
}

export interface BottomNavProps {
  items: BottomNavItem[];
  /** All nav items shown in the full-screen "Mehr" drawer. */
  moreItems?: MoreNavItem[];
  /** When provided, Search + Profile are shown at top of "Mehr" drawer and hidden from AppHeader on mobile. */
  user?: { name: string; subtitle: string; avatarUrl?: string | null };
  /** Gruppierte, personalisierbare Navigation im „Mehr"-Menü. */
  categories?: MoreNavCategory[];
  /** Immer unten, ohne Kategorie (z. B. Suche). */
  pinnedItems?: MoreNavItem[];
}

function getIcon(key: string): LucideIcon {
  return (ICONS as Record<string, LucideIcon>)[key] ?? Home;
}

function isActive(pathname: string, item: { href: string; exact?: boolean }) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function BottomNav({
  items,
  moreItems,
  user,
  categories,
  pinnedItems = [],
}: BottomNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  // Scroll-based visibility: always visible initially, hides after 3s of inactivity once user has scrolled
  const [navVisible, setNavVisible] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasScrolledRef = useRef(false);

  // Close "Mehr" drawer on navigation — show nav briefly so it's visible on the new page
  useEffect(() => {
    if (moreOpen) {
      setMoreOpen(false);
      setNavVisible(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = moreOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [moreOpen]);

  // Scroll + touch: show nav immediately, hide after 3s inactivity.
  // capture:true catches scroll events from overflow-y-auto containers too.
  // touchmove covers mobile scroll on iOS/Android where document-scroll may not fire.
  // When "Mehr" is open we ignore scroll/touch events — the drawer itself is
  // scrollable and we don't want it to accidentally trigger hide logic.
  useEffect(() => {
    const onActivity = () => {
      if (moreOpen) return;
      hasScrolledRef.current = true;
      setNavVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => setNavVisible(false), 3000);
    };
    document.addEventListener("scroll",     onActivity, { passive: true, capture: true });
    document.addEventListener("touchmove",  onActivity, { passive: true, capture: true });
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      document.removeEventListener("scroll",    onActivity, { capture: true });
      document.removeEventListener("touchmove", onActivity, { capture: true });
    };
  }, [moreOpen]);

  const displayItems = moreItems ? items.slice(0, 4) : items.slice(0, 5);

  /** Ein Eintrag im „Mehr"-Menü. `bare` = ohne <li> (Kategorie-Liste liefert es). */
  function renderMoreItem(item: MoreNavItem, bare = false) {
    const Icon = getIcon(item.icon);
    const active = isActive(pathname, item);
    const itemCls = cn(
      "flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-150",
      active ? "bg-brand/10 text-brand" : "text-fg hover:bg-surface",
    );
    const itemInner = (
      <>
        <Icon
          className={cn("size-4 shrink-0", active ? "text-brand" : "text-muted-fg")}
          strokeWidth={1.75}
        />
        <span className="flex-1">{item.label}</span>
        {item.badge && (
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold",
              active ? "bg-brand/15 text-brand" : "bg-brand text-brand-fg",
            )}
          >
            {item.badge}
          </span>
        )}
      </>
    );

    const node = item.modal ? (
      <button
        type="button"
        className={cn(itemCls, "w-full text-left")}
        onClick={() => {
          setMoreOpen(false);
          window.dispatchEvent(new CustomEvent("ms:open"));
        }}
      >
        {itemInner}
      </button>
    ) : (
      <Link href={item.href} aria-current={active ? "page" : undefined} className={itemCls}>
        {itemInner}
      </Link>
    );

    return bare ? node : <li key={item.href}>{node}</li>;
  }

  return (
    <>
      <nav
        aria-label="Untere Navigation"
        // fixed statt Flex-Kind: sonst bleibt beim Ausblenden (translateY) der
        // Layout-Platz leer und der Inhalt darunter fehlt. Als Overlay gibt die
        // Leiste den Bereich frei, sobald sie ausgeblendet wird.
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/90 backdrop-blur-lg supports-backdrop-filter:bg-bg/80 lg:hidden"
        style={{
          paddingBottom: "max(env(safe-area-inset-bottom), 8px)",
          transform: (navVisible || moreOpen) ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <ul className="grid grid-cols-5 px-1">
          {displayItems.map((item) => {
            const Icon = ICONS[item.icon];
            const active = isActive(pathname, item);
            const inner = (
              <>
                <span
                  className={cn(
                    "relative grid size-10 place-items-center rounded-2xl transition-all duration-200",
                    active ? "bg-brand/12 text-brand" : "text-muted-fg"
                  )}
                >
                  <Icon className="size-5" strokeWidth={1.75} />
                  {item.badge && (
                    <span
                      className="absolute -right-1 -top-1 grid min-w-3.5 place-items-center rounded-full bg-brand px-1 font-mono text-[8px] font-bold leading-tight text-white"
                      aria-label={`${item.badge} ungelesen`}
                    >
                      {item.badge}
                    </span>
                  )}
                </span>
                <span className={cn("truncate text-[10px] font-semibold", active ? "text-brand" : "text-muted-fg")}>
                  {item.label}
                </span>
              </>
            );
            return (
              <li key={item.href}>
                {item.modal ? (
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent("ms:open"))}
                    className="relative flex w-full flex-col items-center gap-0.5 px-1 py-3 transition-colors"
                  >
                    {inner}
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className="relative flex flex-col items-center gap-0.5 px-1 py-3 transition-colors"
                  >
                    {inner}
                  </Link>
                )}
              </li>
            );
          })}

          {moreItems && (
            <li>
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                aria-label="Alle Navigation anzeigen"
                aria-expanded={moreOpen}
                className="flex w-full flex-col items-center gap-0.5 px-1 py-3 text-muted-fg transition-colors"
              >
                <span className="grid size-10 place-items-center rounded-2xl transition-all duration-200 hover:bg-surface-2">
                  <LayoutGrid className="size-5" strokeWidth={1.75} />
                </span>
                <span className="text-[10px] font-semibold">Mehr</span>
              </button>
            </li>
          )}
        </ul>
      </nav>

      {/* Full-screen "Mehr" drawer */}
      {moreItems && (
        <div
          role="dialog"
          aria-label="Alle Navigation"
          aria-modal="true"
          className={cn(
            "fixed inset-0 z-50 flex flex-col bg-bg/95 backdrop-blur-xl transition-transform duration-300 ease-out lg:hidden",
            moreOpen ? "translate-y-0" : "translate-y-full pointer-events-none"
          )}
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {/* Drawer header */}
          <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-fg">Navigation</span>
            <button
              type="button"
              onClick={() => {
                if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
                setMoreOpen(false);
                setNavVisible(true);
              }}
              aria-label="Schließen"
              className="grid size-9 place-items-center rounded-xl text-muted-fg transition-colors hover:bg-surface hover:text-fg"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Search + Profile (mobile-only, replaces header) */}
          {user && (
            <div className="shrink-0 border-b border-border">
              {/* Search */}
              <Link
                href="/search"
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-surface"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2">
                  <Search className="size-4 text-muted-fg" />
                </span>
                <span className="text-sm font-medium text-fg">Suchen</span>
              </Link>

              {/* Profile */}
              <Link
                href="/app/profil"
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3.5 px-5 py-3 transition-colors hover:bg-surface"
              >
                <Avatar name={user.name} src={user.avatarUrl ?? undefined} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{user.name}</p>
                  <p className="truncate text-xs text-muted-fg">{user.subtitle}</p>
                </div>
              </Link>

              {/* Logout */}
              <form action={logout}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3.5 px-5 py-3.5 text-sm font-medium text-danger transition-colors hover:bg-surface"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-danger/10">
                    <LogOut className="size-4" />
                  </span>
                  Abmelden
                </button>
              </form>
            </div>
          )}

          {/* Nav item list — kategorisiert, verschiebbar, klappbar */}
          <nav className="flex-1 overflow-y-auto p-3" aria-label="Alle Seiten">
            {categories && categories.length > 0 ? (
              <>
                <NavCategories
                  dense
                  categories={categories}
                  renderItem={(ci) => {
                    // optional chaining: moreItems ist im Callback nicht verengt
                    const item = moreItems?.find((m) => m.href === ci.href);
                    return item ? renderMoreItem(item, true) : null;
                  }}
                />
                {pinnedItems.length > 0 && (
                  <ul className="mt-3 space-y-0.5 border-t border-border pt-3">
                    {pinnedItems.map((item) => renderMoreItem(item))}
                  </ul>
                )}
              </>
            ) : (
              <ul className="space-y-0.5">
                {moreItems.map((item) => renderMoreItem(item))}
              </ul>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
