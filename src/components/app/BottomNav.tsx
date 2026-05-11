"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  BookOpen,
  Brain,
  Calendar,
  CheckSquare,
  ClipboardEdit,
  Home,
  Layers,
  LineChart,
  MessageSquare,
  Shield,
  Sparkles,
  Swords,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = {
  home: Home,
  bookOpen: BookOpen,
  brain: Brain,
  calendar: Calendar,
  checkSquare: CheckSquare,
  layers: Layers,
  award: Award,
  sparkles: Sparkles,
  users: Users,
  clipboardEdit: ClipboardEdit,
  lineChart: LineChart,
  messageSquare: MessageSquare,
  shield: Shield,
  swords: Swords,
} satisfies Record<string, LucideIcon>;

export type BottomNavIcon = keyof typeof ICONS;

export type BottomNavItem = {
  href: string;
  label: string;
  icon: BottomNavIcon;
  badge?: string;
  exact?: boolean;
};

export interface BottomNavProps {
  items: BottomNavItem[];
}

export function BottomNav({ items }: BottomNavProps) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Untere Navigation"
      className="sticky bottom-0 z-40 border-t border-border bg-bg/95 backdrop-blur supports-[backdrop-filter]:bg-bg/80 lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {items.slice(0, 5).map((item) => {
          const Icon = ICONS[item.icon];
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wider transition-colors",
                  active ? "text-fg" : "text-muted-fg hover:text-fg"
                )}
              >
                {active && (
                  <span
                    className="absolute inset-x-2 top-0 h-0.5 bg-brand"
                    aria-hidden="true"
                  />
                )}
                <span className="relative">
                  <Icon className="size-5" strokeWidth={1.75} />
                  {item.badge && (
                    <span
                      className="absolute -right-2 -top-1 grid min-w-[14px] place-items-center bg-brand px-1 font-mono text-[9px] font-bold leading-tight text-brand-fg"
                      aria-label={`${item.badge} ungelesen`}
                    >
                      {item.badge}
                    </span>
                  )}
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
