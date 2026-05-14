import { redirect } from "next/navigation";
import { effectiveRole, getSession } from "@/lib/session";
import { BottomNav, type BottomNavItem } from "@/components/app/BottomNav";
import { SchultraegerNav } from "./SchultraegerNav";

const schultraegerBottomItems: BottomNavItem[] = [
  { href: "/schultraeger",             label: "Start",       icon: "home",      exact: true },
  { href: "/schultraeger/schulen",     label: "Schulen",     icon: "building2" },
  { href: "/schultraeger/statistiken", label: "Statistiken", icon: "barChart3" },
];

export default async function SchultraegerLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (role !== "school_company" && role !== "super") redirect("/login");

  return (
    <div className="flex min-h-screen bg-surface">
      <SchultraegerNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-bg px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">Schulträger-Portal</p>
        </header>
        <main className="flex-1 px-6 py-8 pb-24 lg:px-10 lg:py-10 lg:pb-10">
          {children}
        </main>
        <BottomNav items={schultraegerBottomItems} />
      </div>
    </div>
  );
}
