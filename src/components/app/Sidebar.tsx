"use client";

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
  CheckSquare,
  ClipboardEdit,
  Home,
  Layers,
  LineChart,
  MessageSquare,
  Settings,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  UserCircle,
  Users,
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
  checkSquare: CheckSquare,
  clipboardEdit: ClipboardEdit,
  home: Home,
  layers: Layers,
  lineChart: LineChart,
  messageSquare: MessageSquare,
  settings: Settings,
  shield: Shield,
  sparkles: Sparkles,
  swords: Swords,
  trophy: Trophy,
  userCircle: UserCircle,
  users: Users,
} satisfies Record<string, LucideIcon>;

export type IconKey = keyof typeof ICONS;

export type NavItem = {
  href: string;
  label: string;
  icon: IconKey;
  badge?: string;
  exact?: boolean;
};

export interface SidebarProps {
  items: NavItem[];
  bottomItems?: NavItem[];
  rootHref: string;
}

export function Sidebar({ items, bottomItems = [], rootHref }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-bg lg:flex">
      <Link
        href={rootHref}
        className="flex h-16 items-center gap-2 border-b border-border px-5 font-bold tracking-tight"
      >
        <span className="grid size-7 place-items-center bg-fg text-bg text-[11px] font-black">
          MM
        </span>
        <span>MasterMind</span>
      </Link>

      <nav className="flex-1 overflow-y-auto p-3" aria-label="Hauptnavigation">
        <ul className="space-y-0.5">
          {items.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(pathname, item)} />
          ))}
        </ul>
      </nav>

      {bottomItems.length > 0 && (
        <div className="border-t border-border p-3">
          <ul className="space-y-0.5">
            {bottomItems.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(pathname, item)} />
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = ICONS[item.icon];
  return (
    <li>
      <Link
        href={item.href}
        className={cn(
          "group flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "bg-fg text-bg"
            : "text-muted-fg hover:bg-surface hover:text-fg"
        )}
      >
        <Icon className="size-4 shrink-0" strokeWidth={1.75} />
        <span className="flex-1 truncate">{item.label}</span>
        {item.badge && (
          <span
            className={cn(
              "px-1.5 py-px font-mono text-[10px] font-semibold",
              active ? "bg-bg/15 text-bg" : "bg-surface-2 text-muted-fg"
            )}
          >
            {item.badge}
          </span>
        )}
      </Link>
    </li>
  );
}
