import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app/AppHeader";
import { ImpersonationBar } from "@/components/ImpersonationBar";
import {
  ROLE_HOME,
  displayUser,
  effectiveRole,
  getSession,
  isImpersonating,
  isSuper,
} from "@/lib/session";
import { fetchNotifications } from "@/lib/notifications";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const effective = effectiveRole(session);
  if (effective !== "admin") redirect(ROLE_HOME[effective]);

  const { notifications, unreadCount } = await fetchNotifications(session.userId);

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <div className="sticky top-0 z-30">
        {isSuper(session) && (
          <ImpersonationBar
            effective={effective}
            isImpersonating={isImpersonating(session)}
          />
        )}
        <AppHeader
          user={displayUser(session)}
          searchPlaceholder="Suchen — Nutzer, Klassen, Lizenzen, Audit-Logs …"
          unreadCount={unreadCount}
          notifications={notifications}
        />
      </div>
      <main className="flex-1 px-6 py-8 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}
