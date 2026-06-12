"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  BarChart3,
  BookMarked,
  BookOpen,
  Brain,
  Building2,
  Calendar,
  CalendarDays,
  CalendarMinus,
  CheckSquare,
  ClipboardEdit,
  ClipboardList,
  Coins,
  FileCheck,
  FileText,
  Flame,
  Gift,
  Grid3X3,
  Home,
  Languages,
  LayoutGrid,
  Layers,
  LineChart,
  Megaphone,
  MessageSquare,
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

const ICONS = {
  award: Award,
  barChart3: BarChart3,
  bookMarked: BookMarked,
  bookOpen: BookOpen,
  brain: Brain,
  building2: Building2,
  calendar: Calendar,
  calendarDays: CalendarDays,
  calendarX: CalendarMinus,
  checkSquare: CheckSquare,
  clipboardEdit: ClipboardEdit,
  clipboardList: ClipboardList,
  coins: Coins,
  fileCheck: FileCheck,
  fileText: FileText,
  flame: Flame,
  gift: Gift,
  grid: Grid3X3,
  home: Home,
  languages: Languages,
  layers: Layers,
  lineChart: LineChart,
  megaphone: Megaphone,
  messageSquare: MessageSquare,
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
};

export type MoreNavItem = {
  href: string;
  label: string;
  icon: string;
  badge?: string;
  exact?: boolean;
};

export interface BottomNavProps {
  items: BottomNavItem[];
  /** All nav items shown in the full-screen "Mehr" drawer. When provided, only 4 primary items are shown + a "Mehr" button. */
  moreItems?: MoreNavItem[];
}

function getIcon(key: string): LucideIcon {
  return (ICONS as Record<string, LucideIcon>)[key] ?? Home;
}

function isActive(pathname: string, item: { href: string; exact?: boolean }) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function BottomNav({ items, moreItems }: BottomNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (moreOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [moreOpen]);

  const displayItems = moreItems ? items.slice(0, 4) : items.slice(0, 5);

  return (
    <>
      <nav
        aria-label="Untere Navigation"
        className="sticky bottom-0 z-40 border-t border-border bg-bg/95 backdrop-blur supports-backdrop-filter:bg-bg/80 lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid grid-cols-5">
          {displayItems.map((item) => {
            const Icon = ICONS[item.icon];
            const active = isActive(pathname, item);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex flex-col items-center gap-0.5 px-1 py-2.5 text-[10px] font-semibold uppercase tracking-wider transition-colors",
                    active ? "text-fg" : "text-muted-fg"
                  )}
                >
                  {active && (
                    <span className="absolute inset-x-2 top-0 h-0.5 bg-brand" aria-hidden="true" />
                  )}
                  <span className="relative">
                    <Icon className="size-5" strokeWidth={1.75} />
                    {item.badge && (
                      <span
                        className="absolute -right-2 -top-1 grid min-w-3.5 place-items-center bg-brand px-1 font-mono text-[9px] font-bold leading-tight text-brand-fg"
                        aria-label={`${item.badge} ungelesen`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </span>
                  <span className="truncate max-w-full">{item.label}</span>
                </Link>
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
                className="relative flex w-full flex-col items-center gap-0.5 px-1 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-fg transition-colors"
              >
                <LayoutGrid className="size-5" strokeWidth={1.75} />
                <span>Mehr</span>
              </button>
            </li>
          )}
        </ul>
      </nav>

      {/* Full-screen navigation drawer */}
      {moreItems && (
        <div
          role="dialog"
          aria-label="Alle Navigation"
          aria-modal="true"
          className={cn(
            "fixed inset-0 z-50 flex flex-col bg-bg transition-transform duration-200 ease-out lg:hidden",
            moreOpen ? "translate-y-0" : "translate-y-full pointer-events-none"
          )}
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
              Navigation
            </span>
            <button
              type="button"
              onClick={() => setMoreOpen(false)}
              aria-label="Schließen"
              className="grid size-9 place-items-center text-muted-fg transition-colors hover:text-fg"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Scrollable item list */}
          <nav className="flex-1 overflow-y-auto" aria-label="Alle Seiten">
            <ul className="divide-y divide-border">
              {moreItems.map((item) => {
                const Icon = getIcon(item.icon);
                const active = isActive(pathname, item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-4 px-5 py-3.5 text-sm font-medium transition-colors",
                        active ? "bg-fg text-bg" : "text-fg hover:bg-surface"
                      )}
                    >
                      <Icon
                        className={cn("size-4 shrink-0", active ? "text-bg" : "text-muted-fg")}
                        strokeWidth={1.75}
                      />
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <span
                          className={cn(
                            "px-1.5 py-px font-mono text-[10px] font-bold",
                            active ? "bg-bg/20 text-bg" : "bg-brand text-brand-fg"
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      )}
    </>
  );
}
