import { redirect } from "next/navigation";
import { effectiveRole, getSession } from "@/lib/session";
import { SchultraegerNav } from "./SchultraegerNav";

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
        <main className="flex-1 px-6 py-8 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
