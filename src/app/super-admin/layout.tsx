import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Link from "next/link";
import { Shield, Users, Swords, Settings, Terminal, BarChart3, AlertTriangle } from "lucide-react";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.isSuperAdmin) redirect("/login");

  const navItems = [
    { href: "/super-admin",          label: "Übersicht",    icon: BarChart3   },
    { href: "/super-admin/schulen",  label: "Schulen",      icon: Shield      },
    { href: "/super-admin/nutzer",   label: "Alle Nutzer",  icon: Users       },
    { href: "/super-admin/events",   label: "Events",       icon: Swords      },
    { href: "/super-admin/terminal", label: "Terminal",     icon: Terminal    },
    { href: "/super-admin/settings", label: "Einstellungen",icon: Settings    },
  ];

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] text-white">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-white/10 p-4">
        <div className="mb-6 flex items-center gap-2 px-2">
          <AlertTriangle className="size-4 text-red-400" />
          <span className="text-xs font-black uppercase tracking-wider text-red-400">Super Admin</span>
        </div>
        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white"
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto pt-4 border-t border-white/10">
          <Link href="/app" className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-white/40 hover:text-white/70">
            ← Zurück zur App
          </Link>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto p-8">
        {children}
      </main>
    </div>
  );
}
