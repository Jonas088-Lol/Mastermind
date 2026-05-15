"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Home, Megaphone, Shield, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/rektor", label: "Übersicht", icon: Home, exact: true },
  { href: "/rektor/statistiken", label: "Statistiken", icon: BarChart3 },
  { href: "/rektor/personal", label: "Personal", icon: Users },
  { href: "/rektor/mannschaften", label: "Mannschaften", icon: Shield },
  { href: "/rektor/broadcast", label: "Broadcast", icon: Megaphone },
];

export function RektorNav() {
  const path = usePathname();
  return (
    <aside className="hidden w-56 shrink-0 border-r border-border bg-bg lg:flex lg:flex-col">
      <div className="border-b border-border px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-fg">Schulleitung</p>
      </div>
      <nav className="flex flex-col gap-0.5 p-3">
        {items.map((item) => {
          const active = item.exact ? path === item.href : path.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-surface text-fg" : "text-muted-fg hover:bg-surface hover:text-fg"
              )}
            >
              <item.icon className="size-4" strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
