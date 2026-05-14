import { redirect } from "next/navigation";
import { effectiveRole, getSession } from "@/lib/session";
import { BottomNav, type BottomNavItem } from "@/components/app/BottomNav";
import { RektorNav } from "./RektorNav";

const rektorBottomItems: BottomNavItem[] = [
  { href: "/rektor",             label: "Start",       icon: "home",      exact: true },
  { href: "/rektor/statistiken", label: "Statistiken", icon: "barChart3" },
  { href: "/rektor/personal",    label: "Personal",    icon: "users" },
  { href: "/rektor/broadcast",   label: "Broadcast",   icon: "megaphone" },
];

export default async function RektorLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (
    role !== "rector" &&
    role !== "vice_rector" &&
    role !== "admin" &&
    role !== "super"
  ) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <RektorNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-bg px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">Schulleitung</p>
        </header>
        <main className="flex-1 px-6 py-8 pb-24 lg:px-10 lg:py-10 lg:pb-10">
          {children}
        </main>
        <BottomNav items={rektorBottomItems} />
      </div>
    </div>
  );
}
