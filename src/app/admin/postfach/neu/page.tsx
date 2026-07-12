/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { ArrowLeft, Send } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { sendNewEmail } from "./actions";

export const metadata: Metadata = { title: "Neue E-Mail · Admin" };

export default async function NeuePage() {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/admin");
  if (!session.schoolId) redirect("/admin");

  const school = await prisma.school.findUnique({
    where: { id: session.schoolId },
    select: { mailboxAddress: true, mailboxName: true },
  });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/postfach"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft className="size-4" />
          Zurück
        </Link>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Postfach</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Neue E-Mail</h1>
        {school?.mailboxAddress && (
          <p className="mt-1 text-sm text-muted-fg">
            Von: <span className="font-mono">{school.mailboxName ? `${school.mailboxName} <${school.mailboxAddress}>` : school.mailboxAddress}</span>
          </p>
        )}
      </div>

      {!school?.mailboxAddress ? (
        <div className="border border-dashed border-border p-10 text-center">
          <p className="font-semibold">Kein Postfach konfiguriert</p>
          <p className="mt-1 text-sm text-muted-fg">
            Hinterlege zuerst eine Absender-Adresse in den{" "}
            <Link href="/admin/postfach/einstellungen" className="text-brand underline underline-offset-2">
              Postfach-Einstellungen
            </Link>
            .
          </p>
        </div>
      ) : (
        <form action={sendNewEmail} className="flex flex-col gap-4 border border-border p-6">
          {/* An */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="to" className="text-sm font-medium">
              An
            </label>
            <input
              id="to"
              name="to"
              type="email"
              required
              placeholder="empfaenger@example.com"
              className="rounded border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted-fg focus:outline-none focus:ring-2 focus:ring-brand/50"
            />
          </div>

          {/* Betreff */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="subject" className="text-sm font-medium">
              Betreff
            </label>
            <input
              id="subject"
              name="subject"
              type="text"
              required
              placeholder="Betreff der E-Mail"
              className="rounded border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted-fg focus:outline-none focus:ring-2 focus:ring-brand/50"
            />
          </div>

          {/* Text */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="body" className="text-sm font-medium">
              Nachricht
            </label>
            <textarea
              id="body"
              name="body"
              required
              rows={10}
              placeholder="Schreib deine Nachricht …"
              className="resize-y rounded border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted-fg focus:outline-none focus:ring-2 focus:ring-brand/50"
            />
          </div>

          <div className="flex justify-end">
            <button type="submit" className={buttonVariants()}>
              <Send className="size-3.5" />
              Senden
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
