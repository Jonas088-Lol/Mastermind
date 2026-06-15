import { Mail, Send, Settings, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Postfach · Admin" };

export default async function PostfachPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/admin");
  if (!session.schoolId) redirect("/admin");

  const { tab } = await searchParams;
  const activeTab = tab === "gesendet" ? "gesendet" : "eingang";

  const school = await prisma.school.findUnique({
    where: { id: session.schoolId },
    select: { mailboxAddress: true, mailboxName: true },
  });

  const emails = await prisma.mailboxEmail.findMany({
    where: {
      schoolId: session.schoolId,
      direction: activeTab === "gesendet" ? "outbound" : "inbound",
    },
    orderBy: { sentAt: "desc" },
    take: 50,
  });

  const unreadCount = await prisma.mailboxEmail.count({
    where: { schoolId: session.schoolId, direction: "inbound", readAt: null },
  });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">E-Mail</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Postfach</h1>
          <p className="mt-1 text-sm text-muted-fg">
            {school?.mailboxAddress ? (
              <span className="font-mono">{school.mailboxAddress}</span>
            ) : (
              <Link href="/admin/postfach/einstellungen" className="text-brand underline underline-offset-2">
                E-Mail-Adresse konfigurieren
              </Link>
            )}
            {unreadCount > 0 && (
              <> · <span className="font-semibold text-fg">{unreadCount} ungelesen</span></>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/postfach/einstellungen"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Settings className="size-3.5" />
          </Link>
          <Link href="/admin/postfach/neu" className={buttonVariants({ size: "sm" })}>
            <Plus className="size-3.5" />
            Neue Mail
          </Link>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["eingang", "gesendet"] as const).map((t) => (
          <Link
            key={t}
            href={`/admin/postfach?tab=${t}`}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              activeTab === t
                ? "border-brand text-brand"
                : "border-transparent text-muted-fg hover:text-fg"
            )}
          >
            {t === "eingang" ? <Mail className="size-3.5" /> : <Send className="size-3.5" />}
            {t === "eingang" ? "Posteingang" : "Gesendet"}
            {t === "eingang" && unreadCount > 0 && (
              <span className="rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                {unreadCount}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* E-Mail-Liste */}
      {!school?.mailboxAddress && (
        <div className="grid place-items-center border border-dashed border-border p-16 text-center">
          <Mail className="size-8 text-muted-fg" strokeWidth={1.5} />
          <p className="mt-4 text-base font-semibold">Kein Postfach konfiguriert</p>
          <p className="mt-1 text-sm text-muted-fg">
            Hinterlege zuerst eine E-Mail-Adresse für deine Schule.
          </p>
          <Link href="/admin/postfach/einstellungen" className={cn(buttonVariants({ size: "sm" }), "mt-4")}>
            Jetzt konfigurieren
          </Link>
        </div>
      )}

      {school?.mailboxAddress && emails.length === 0 && (
        <div className="grid place-items-center border border-dashed border-border p-16 text-center">
          <Mail className="size-8 text-muted-fg" strokeWidth={1.5} />
          <p className="mt-4 text-base font-semibold">
            {activeTab === "eingang" ? "Keine E-Mails" : "Noch keine gesendeten E-Mails"}
          </p>
        </div>
      )}

      {emails.length > 0 && (
        <div className="divide-y divide-border border border-border">
          {emails.map((email) => {
            const isUnread = activeTab === "eingang" && !email.readAt;
            const displayAddress =
              activeTab === "eingang" ? email.fromAddress : email.toAddress;
            const displayName =
              activeTab === "eingang" ? (email.fromName ?? email.fromAddress) : email.toAddress;
            const preview = email.bodyText.slice(0, 120).replace(/\n/g, " ");

            return (
              <Link
                key={email.id}
                href={`/admin/postfach/${email.id}`}
                className={cn(
                  "flex items-start gap-4 px-5 py-4 transition-colors hover:bg-surface",
                  isUnread && "bg-brand/[0.03]"
                )}
              >
                {/* Avatar-Platzhalter */}
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold uppercase text-muted-fg">
                  {(displayName[0] ?? "?").toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("truncate text-sm", isUnread ? "font-bold" : "font-semibold")}>
                      {displayName}
                    </p>
                    <span className="shrink-0 font-mono text-[10px] text-muted-fg">
                      {email.sentAt.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  <p className={cn("mt-0.5 truncate text-xs", isUnread ? "font-medium text-fg" : "text-muted-fg")}>
                    {email.subject}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-fg">{preview}</p>
                </div>
                {isUnread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
