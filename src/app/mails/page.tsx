import {
  Inbox,
  Send,
  Settings,
  Plus,
  Reply,
  Trash2,
  Mail,
  Info,
  CheckCircle2,
  X,
  PenSquare,
} from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { MAIL_COOKIE, isMailSessionValid } from "@/lib/mail-session";
import { cn } from "@/lib/utils";
import { markRead, sendReply, sendNew, deleteMail, saveSettings } from "./actions";

type Tab = "eingang" | "gesendet" | "neu" | "einstellungen";

export default async function MailsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; id?: string; saved?: string }>;
}) {
  // Eigenständige Auth — kein App-Login nötig
  const jar = await cookies();
  const token = jar.get(MAIL_COOKIE)?.value;
  if (!isMailSessionValid(token)) redirect("/mails/login");

  // Schule ermitteln: MAIL_SCHOOL_SLUG env-var, sonst erste Schule mit Mailbox
  const schoolSlug = process.env.MAIL_SCHOOL_SLUG;
  const schoolBase = await (schoolSlug
    ? prisma.school.findUnique({ where: { slug: schoolSlug }, select: { id: true } })
    : prisma.school.findFirst({ where: { mailboxAddress: { not: null } }, select: { id: true } })
      ?? prisma.school.findFirst({ select: { id: true } }));
  if (!schoolBase) redirect("/mails/login");
  const schoolId = schoolBase.id;

  const { tab: tabParam, id: selectedId, saved } = await searchParams;
  const tab: Tab =
    tabParam === "gesendet" ? "gesendet"
    : tabParam === "neu" ? "neu"
    : tabParam === "einstellungen" ? "einstellungen"
    : "eingang";

  const [school, emails, unread] = await Promise.all([
    prisma.school.findUnique({
      where: { id: schoolId },
      select: { mailboxAddress: true, mailboxName: true },
    }),
    tab === "eingang" || tab === "gesendet"
      ? prisma.mailboxEmail.findMany({
          where: {
            schoolId,
            direction: tab === "gesendet" ? "outbound" : "inbound",
          },
          orderBy: { sentAt: "desc" },
          take: 60,
        })
      : Promise.resolve([]),
    prisma.mailboxEmail.count({
      where: { schoolId, direction: "inbound", readAt: null },
    }),
  ]);

  // Ausgewählte Mail
  let selectedEmail: Awaited<ReturnType<typeof prisma.mailboxEmail.findFirst>> | null = null;
  let thread: typeof emails = [];
  if (selectedId && (tab === "eingang" || tab === "gesendet")) {
    selectedEmail = await prisma.mailboxEmail.findFirst({
      where: { id: selectedId, schoolId },
    });
    if (selectedEmail) {
      if (selectedEmail.direction === "inbound" && !selectedEmail.readAt) {
        await markRead(selectedEmail.id);
      }
      thread = selectedEmail.threadKey
        ? await prisma.mailboxEmail.findMany({
            where: { schoolId, threadKey: selectedEmail.threadKey },
            orderBy: { sentAt: "asc" },
          })
        : [selectedEmail];
    }
  }

  const navItems = [
    { key: "eingang", label: "Posteingang", icon: Inbox, badge: unread > 0 ? unread : null },
    { key: "gesendet", label: "Gesendet", icon: Send, badge: null },
    { key: "neu", label: "Neue Mail", icon: PenSquare, badge: null },
    { key: "einstellungen", label: "Einstellungen", icon: Settings, badge: null },
  ] as const;

  return (
    <div className="flex h-screen flex-col bg-bg text-fg">
      {/* Top Bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
        <div className="flex items-center gap-3">
          <Mail className="size-5 text-brand" />
          <span className="text-base font-bold tracking-tight">Postfach</span>
          {school?.mailboxAddress && (
            <span className="hidden font-mono text-xs text-muted-fg sm:inline">
              {school.mailboxAddress}
            </span>
          )}
        </div>
        <Link href="/admin" className="text-xs text-muted-fg hover:text-fg">
          ← Admin
        </Link>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <nav className="flex w-48 shrink-0 flex-col border-r border-border bg-surface py-3 lg:w-56">
          {navItems.map(({ key, label, icon: Icon, badge }) => (
            <Link
              key={key}
              href={`/mails?tab=${key}`}
              className={cn(
                "mx-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                tab === key
                  ? "bg-brand text-white"
                  : "text-muted-fg hover:bg-muted hover:text-fg"
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {badge && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                    tab === key ? "bg-white/20 text-white" : "bg-brand text-white"
                  )}
                >
                  {badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Content */}
        <div className="flex min-w-0 flex-1">

          {/* ── Eingang / Gesendet ── */}
          {(tab === "eingang" || tab === "gesendet") && (
            <>
              {/* Mail-Liste */}
              <div className={cn(
                "flex flex-col border-r border-border",
                selectedEmail ? "hidden w-72 shrink-0 lg:flex" : "flex flex-1 lg:flex-none lg:w-80"
              )}>
                <div className="flex h-12 shrink-0 items-center border-b border-border px-4">
                  <p className="text-sm font-semibold">
                    {tab === "eingang" ? "Posteingang" : "Gesendet"}
                  </p>
                  {unread > 0 && tab === "eingang" && (
                    <span className="ml-2 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {unread}
                    </span>
                  )}
                </div>

                {!school?.mailboxAddress ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
                    <Mail className="size-8 text-muted-fg" strokeWidth={1.5} />
                    <p className="text-sm font-semibold">Kein Postfach konfiguriert</p>
                    <Link href="/mails?tab=einstellungen" className="text-xs text-brand underline">
                      Jetzt einrichten
                    </Link>
                  </div>
                ) : emails.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
                    <Mail className="size-8 text-muted-fg" strokeWidth={1.5} />
                    <p className="text-sm text-muted-fg">Keine E-Mails</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto">
                    {emails.map((email) => {
                      const isUnread = tab === "eingang" && !email.readAt;
                      const isSelected = email.id === selectedId;
                      const displayName =
                        tab === "eingang"
                          ? (email.fromName ?? email.fromAddress)
                          : email.toAddress;
                      return (
                        <Link
                          key={email.id}
                          href={`/mails?tab=${tab}&id=${email.id}`}
                          className={cn(
                            "flex flex-col gap-0.5 border-b border-border px-4 py-3 transition-colors",
                            isSelected ? "bg-brand/10" : "hover:bg-surface",
                            isUnread && !isSelected && "bg-brand/[0.03]"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className={cn("truncate text-xs", isUnread ? "font-bold text-fg" : "font-medium text-fg")}>
                              {displayName}
                            </p>
                            <span className="shrink-0 text-[10px] text-muted-fg">
                              {email.sentAt.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                            </span>
                          </div>
                          <p className={cn("truncate text-xs", isUnread ? "font-semibold" : "text-muted-fg")}>
                            {email.subject}
                          </p>
                          <p className="truncate text-[11px] text-muted-fg">
                            {email.bodyText.slice(0, 60)}
                          </p>
                          {isUnread && (
                            <span className="absolute right-3 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-brand" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Mail-Detail */}
              {selectedEmail ? (
                <div className="flex flex-1 flex-col overflow-hidden">
                  {/* Detail-Header */}
                  <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-5">
                    <Link
                      href={`/mails?tab=${tab}`}
                      className="flex items-center gap-1.5 text-xs text-muted-fg hover:text-fg lg:hidden"
                    >
                      <X className="size-3.5" />
                      Schließen
                    </Link>
                    <p className="hidden truncate text-sm font-semibold lg:block">
                      {selectedEmail.subject}
                    </p>
                    <form action={deleteMail.bind(null, selectedEmail.id)}>
                      <button type="submit" className="flex items-center gap-1.5 text-xs text-danger hover:opacity-80">
                        <Trash2 className="size-3.5" />
                        Löschen
                      </button>
                    </form>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {/* Betreff-Titel (mobil) */}
                    <div className="px-6 pt-5 lg:hidden">
                      <h1 className="text-lg font-bold">{selectedEmail.subject}</h1>
                    </div>

                    {/* Thread */}
                    <div className="flex flex-col gap-0 divide-y divide-border px-6 py-4">
                      {thread.map((msg) => {
                        const isOut = msg.direction === "outbound";
                        return (
                          <div key={msg.id} className="py-5">
                            <div className="mb-3 flex items-start justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-bold uppercase text-muted-fg">
                                  {isOut
                                    ? (school?.mailboxName?.[0] ?? school?.mailboxAddress?.[0] ?? "S")
                                    : (msg.fromName?.[0] ?? msg.fromAddress[0]).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold">
                                    {isOut ? (school?.mailboxName ?? school?.mailboxAddress) : (msg.fromName ?? msg.fromAddress)}
                                  </p>
                                  <p className="text-xs text-muted-fg">
                                    {isOut ? `An: ${msg.toAddress}` : `Von: ${msg.fromAddress}`}
                                  </p>
                                </div>
                              </div>
                              <time className="shrink-0 text-[10px] text-muted-fg">
                                {msg.sentAt.toLocaleString("de-DE", {
                                  day: "numeric", month: "short", year: "numeric",
                                  hour: "2-digit", minute: "2-digit",
                                })}
                              </time>
                            </div>
                            {msg.bodyHtml ? (
                              <div
                                className="prose prose-sm max-w-none text-sm"
                                dangerouslySetInnerHTML={{ __html: msg.bodyHtml }}
                              />
                            ) : (
                              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-fg">
                                {msg.bodyText}
                              </pre>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Antwort-Box */}
                    {school?.mailboxAddress && (
                      <div className="border-t border-border px-6 py-5">
                        <form action={sendReply} className="flex flex-col gap-3">
                          <input type="hidden" name="emailId" value={selectedEmail.id} />
                          <div className="flex items-center gap-2 text-xs text-muted-fg">
                            <Reply className="size-3.5" />
                            Antwort an{" "}
                            <span className="font-mono font-medium text-fg">
                              {selectedEmail.direction === "inbound"
                                ? selectedEmail.fromAddress
                                : selectedEmail.toAddress}
                            </span>
                          </div>
                          <textarea
                            name="body"
                            required
                            rows={5}
                            placeholder="Deine Antwort …"
                            className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2.5 text-sm placeholder:text-muted-fg focus:outline-none focus:ring-2 focus:ring-brand/40"
                          />
                          <div className="flex justify-end">
                            <button
                              type="submit"
                              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90"
                            >
                              <Reply className="size-3.5" />
                              Senden
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="hidden flex-1 flex-col items-center justify-center gap-2 text-center lg:flex">
                  <Mail className="size-10 text-muted-fg" strokeWidth={1.5} />
                  <p className="text-sm text-muted-fg">Mail auswählen</p>
                </div>
              )}
            </>
          )}

          {/* ── Neue Mail ── */}
          {tab === "neu" && (
            <div className="flex flex-1 flex-col">
              <div className="flex h-12 shrink-0 items-center border-b border-border px-5">
                <p className="text-sm font-semibold">Neue E-Mail</p>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-6">
                {!school?.mailboxAddress ? (
                  <div className="flex flex-col items-center gap-3 py-16 text-center">
                    <Mail className="size-8 text-muted-fg" strokeWidth={1.5} />
                    <p className="font-semibold">Kein Postfach konfiguriert</p>
                    <Link href="/mails?tab=einstellungen" className="text-sm text-brand underline">
                      Jetzt einrichten
                    </Link>
                  </div>
                ) : (
                  <form action={sendNew} className="flex max-w-2xl flex-col gap-4">
                    {school.mailboxAddress && (
                      <p className="text-xs text-muted-fg">
                        Von:{" "}
                        <span className="font-mono">
                          {school.mailboxName ? `${school.mailboxName} <${school.mailboxAddress}>` : school.mailboxAddress}
                        </span>
                      </p>
                    )}
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="to" className="text-sm font-medium">An</label>
                      <input
                        id="to" name="to" type="email" required
                        placeholder="empfaenger@example.com"
                        className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm placeholder:text-muted-fg focus:outline-none focus:ring-2 focus:ring-brand/40"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="subject" className="text-sm font-medium">Betreff</label>
                      <input
                        id="subject" name="subject" type="text" required
                        placeholder="Betreff der E-Mail"
                        className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm placeholder:text-muted-fg focus:outline-none focus:ring-2 focus:ring-brand/40"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="body" className="text-sm font-medium">Nachricht</label>
                      <textarea
                        id="body" name="body" required rows={12}
                        placeholder="Schreib deine Nachricht …"
                        className="resize-y rounded-lg border border-border bg-surface px-3 py-2.5 text-sm placeholder:text-muted-fg focus:outline-none focus:ring-2 focus:ring-brand/40"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand/90"
                      >
                        <Send className="size-3.5" />
                        Senden
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* ── Einstellungen ── */}
          {tab === "einstellungen" && (
            <div className="flex flex-1 flex-col">
              <div className="flex h-12 shrink-0 items-center border-b border-border px-5">
                <p className="text-sm font-semibold">Einstellungen</p>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-6">
                <div className="flex max-w-xl flex-col gap-6">
                  {saved && (
                    <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
                      <CheckCircle2 className="size-4 shrink-0" />
                      Gespeichert.
                    </div>
                  )}

                  <form action={saveSettings} className="flex flex-col gap-5 rounded-lg border border-border p-5">
                    <h2 className="text-sm font-semibold">E-Mail-Adresse</h2>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="mailboxAddress" className="text-sm font-medium">
                        Adresse der Schule
                      </label>
                      <input
                        id="mailboxAddress" name="mailboxAddress" type="email"
                        defaultValue={school?.mailboxAddress ?? ""}
                        placeholder="info@konvertis.de"
                        className="rounded-lg border border-border bg-surface px-3 py-2.5 font-mono text-sm placeholder:font-sans placeholder:text-muted-fg focus:outline-none focus:ring-2 focus:ring-brand/40"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="mailboxName" className="text-sm font-medium">
                        Anzeigename (optional)
                      </label>
                      <input
                        id="mailboxName" name="mailboxName" type="text"
                        defaultValue={school?.mailboxName ?? ""}
                        placeholder="Konvertis"
                        className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm placeholder:text-muted-fg focus:outline-none focus:ring-2 focus:ring-brand/40"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90"
                      >
                        Speichern
                      </button>
                    </div>
                  </form>

                  {/* Resend Setup */}
                  <div className="flex flex-col gap-4 rounded-lg border border-border p-5">
                    <h2 className="text-sm font-semibold">Eingehende Mails — Resend Inbound</h2>
                    <div className="flex gap-2 rounded-lg border border-info/30 bg-info/5 px-4 py-3 text-xs text-fg">
                      <Info className="mt-0.5 size-3.5 shrink-0 text-info" />
                      <p>
                        Trage in Resend unter <strong>Domains → konvertis.de → Inbound</strong> den
                        MX-Eintrag und diesen Webhook ein:
                      </p>
                    </div>
                    <code className="break-all rounded-lg border border-border bg-muted px-4 py-3 text-xs text-fg">
                      https://konvertis.de/api/email/inbound
                    </code>
                    <ol className="flex flex-col gap-2.5 text-xs text-muted-fg">
                      <li className="flex gap-2.5">
                        <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-fg">1</span>
                        Resend → Domains → konvertis.de → Tab <strong>Inbound</strong>
                      </li>
                      <li className="flex gap-2.5">
                        <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-fg">2</span>
                        MX-Record bei INWX eintragen: <code className="rounded bg-muted px-1">inbound-smtp.eu-west-1.amazonaws.com</code> Prio 10
                      </li>
                      <li className="flex gap-2.5">
                        <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-fg">3</span>
                        Webhook-URL oben kopieren und in Resend eintragen
                      </li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
