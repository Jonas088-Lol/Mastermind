"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ClipboardList, Home, UserCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/sekretariat", label: "Übersicht", icon: Home, exact: true },
  { href: "/sekretariat/klassen", label: "Klassenlisten", icon: BookOpen },
  { href: "/sekretariat/schueler", label: "Schüler", icon: Users },
  { href: "/sekretariat/fehlzeiten", label: "Fehlzeiten", icon: ClipboardList },
];

export function SekretariatNav() {
  const path = usePathname();
  return (
    <aside className="hidden w-56 shrink-0 border-r border-border bg-bg lg:flex lg:flex-col">
      <div className="border-b border-border px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-fg">Sekretariat</p>
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
