/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { ArrowLeft, Reply, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/security/sanitize-html";
import { markAsRead, replyToEmail, deleteEmail } from "./actions";

export const metadata: Metadata = { title: "E-Mail · Admin" };

export default async function PostfachDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/admin");
  if (!session.schoolId) redirect("/admin");

  const { id } = await params;

  const email = await prisma.mailboxEmail.findFirst({
    where: { id, schoolId: session.schoolId },
  });
  if (!email) notFound();

  // Als gelesen markieren
  if (email.direction === "inbound" && !email.readAt) {
    await markAsRead(email.id);
  }

  // Thread-Verlauf laden
  const thread =
    email.threadKey
      ? await prisma.mailboxEmail.findMany({
          where: { schoolId: session.schoolId, threadKey: email.threadKey },
          orderBy: { sentAt: "asc" },
        })
      : [email];

  const school = await prisma.school.findUnique({
    where: { id: session.schoolId },
    select: { mailboxAddress: true },
  });

  const replyToAddress =
    email.direction === "inbound" ? email.fromAddress : email.toAddress;
  const replySubject = email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/postfach"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft className="size-4" />
          Zurück
        </Link>
      </div>

      <h1 className="text-2xl font-bold tracking-tight">{email.subject}</h1>

      {/* Thread */}
      <div className="flex flex-col gap-4">
        {thread.map((msg) => {
          const isOutbound = msg.direction === "outbound";
          return (
            <div key={msg.id} className={cn("border border-border bg-bg", isOutbound && "border-brand/30")}>
              {/* Mail-Header */}
              <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {isOutbound
                      ? (school?.mailboxAddress ?? "Du")
                      : (msg.fromName ?? msg.fromAddress)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-fg">
                    {isOutbound ? `An: ${msg.toAddress}` : `Von: ${msg.fromAddress}`}
                  </p>
                </div>
                <time className="shrink-0 font-mono text-[10px] text-muted-fg">
                  {msg.sentAt.toLocaleString("de-DE", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </div>

              {/* Mail-Body */}
              <div className="px-5 py-4">
                {msg.bodyHtml ? (
                  <div
                    className="prose prose-sm max-w-none text-sm"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(msg.bodyHtml) }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-sm text-fg">
                    {msg.bodyText}
                  </pre>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Aktionen */}
      <div className="flex items-start justify-between gap-4">
        {school?.mailboxAddress ? (
          <form action={replyToEmail} className="flex flex-1 flex-col gap-3 border border-border p-5">
            <input type="hidden" name="emailId" value={email.id} />
            <div className="flex items-center gap-2">
              <Reply className="size-4 text-muted-fg" />
              <p className="text-sm font-semibold">
                Antwort an <span className="font-mono">{replyToAddress}</span>
              </p>
            </div>
            <p className="text-xs text-muted-fg">Betreff: {replySubject}</p>
            <textarea
              name="body"
              required
              rows={6}
              placeholder="Deine Antwort …"
              className="w-full resize-y rounded border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted-fg focus:outline-none focus:ring-2 focus:ring-brand/50"
            />
            <div className="flex justify-end">
              <button type="submit" className={buttonVariants({ size: "sm" })}>
                <Reply className="size-3.5" />
                Senden
              </button>
            </div>
          </form>
        ) : (
          <div />
        )}

        <form action={deleteEmail.bind(null, email.id)} className="shrink-0">
          <button
            type="submit"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <Trash2 className="size-3.5 text-danger" />
            <span className="text-danger">Löschen</span>
          </button>
        </form>
      </div>
    </div>
  );
}
