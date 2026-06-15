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
  CalendarDays,
  CalendarMinus,
  CheckSquare,
  ClipboardEdit,
  Coins,
  Compass,
  FileCheck,
  FileText,
  Flame,
  Gift,
  Grid3X3,
  Home,
  Languages,
  Layers,
  LineChart,
  Mail,
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
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/BrandLogo";

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
  fileCheck: FileCheck,
  fileText: FileText,
  flame: Flame,
  gift: Gift,
  grid: Grid3X3,
  home: Home,
  languages: Languages,
  layers: Layers,
  lineChart: LineChart,
  mail: Mail,
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
  coins: Coins,
  compass: Compass,
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
  logoSrc?: string | null;
  logoAlt?: string;
}

export function Sidebar({ items, bottomItems = [], rootHref, logoSrc, logoAlt }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-surface/60 backdrop-blur-sm lg:flex">
      {/* Logo */}
      <Link
        href={rootHref}
        className="flex h-16 items-center gap-2.5 border-b border-border px-5 font-bold tracking-tight"
      >
        <BrandLogo height="h-7" showName src={logoSrc} alt={logoAlt} />
      </Link>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Hauptnavigation">
        <ul className="space-y-0.5">
          {items.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(pathname, item)} />
          ))}
        </ul>
      </nav>

      {/* Bottom items */}
      {bottomItems.length > 0 && (
        <div className="border-t border-border px-3 py-3">
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
          "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
          active
            ? "bg-brand/10 text-brand"
            : "text-muted-fg hover:bg-surface-2 hover:text-fg"
        )}
      >
        <Icon
          className={cn(
            "size-4 shrink-0 transition-colors",
            active ? "text-brand" : "text-muted-fg group-hover:text-fg"
          )}
          strokeWidth={1.75}
        />
        <span className="flex-1 truncate">{item.label}</span>
        {item.badge && (
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold",
              active
                ? "bg-brand/15 text-brand"
                : "bg-brand text-white"
            )}
          >
            {item.badge}
          </span>
        )}
      </Link>
    </li>
  );
}
