/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { ArrowLeft, CheckCircle2, Info } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { saveMailboxSettings } from "./actions";
import { canManageSchool, canAccessArea } from "@/lib/school-admin";

export const metadata: Metadata = { title: "Postfach-Einstellungen · Admin" };

export default async function PostfachEinstellungenPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const session = await getSession();
  if (!session || !canManageSchool(effectiveRole(session))) redirect("/admin");
  if (!canAccessArea(effectiveRole(session), "postfach")) redirect("/admin");
  if (!session.schoolId) redirect("/admin");

  const { saved } = await searchParams;

  const school = await prisma.school.findUnique({
    where: { id: session.schoolId },
    select: { mailboxAddress: true, mailboxName: true },
  });

  const webhookUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/email/inbound`
    : "/api/email/inbound";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/postfach" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft className="size-4" />
          Zurück
        </Link>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Postfach</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Einstellungen</h1>
      </div>

      {saved && (
        <div className="flex items-center gap-2 border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          <CheckCircle2 className="size-4 shrink-0" />
          Einstellungen gespeichert.
        </div>
      )}

      {/* Adress-Konfiguration */}
      <form action={saveMailboxSettings} className="flex flex-col gap-5 border border-border p-6">
        <h2 className="text-base font-semibold">E-Mail-Adresse</h2>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="mailboxAddress" className="text-sm font-medium">
            E-Mail-Adresse der Schule
          </label>
          <input
            id="mailboxAddress"
            name="mailboxAddress"
            type="email"
            defaultValue={school?.mailboxAddress ?? ""}
            placeholder="info@meineschule.de"
            className="rounded border border-border bg-surface px-3 py-2 text-sm font-mono placeholder:font-sans placeholder:text-muted-fg focus:outline-none focus:ring-2 focus:ring-brand/50"
          />
          <p className="text-xs text-muted-fg">
            Diese Adresse wird als Absender für alle ausgehenden E-Mails verwendet und muss in
            Resend als verifizierte Domain hinterlegt sein.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="mailboxName" className="text-sm font-medium">
            Anzeigename (optional)
          </label>
          <input
            id="mailboxName"
            name="mailboxName"
            type="text"
            defaultValue={school?.mailboxName ?? ""}
            placeholder="Gymnasium Musterstadt"
            className="rounded border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted-fg focus:outline-none focus:ring-2 focus:ring-brand/50"
          />
          <p className="text-xs text-muted-fg">
            Wird im Absender-Feld angezeigt: „Gymnasium Musterstadt &lt;info@schule.de&gt;"
          </p>
        </div>

        <div className="flex justify-end">
          <button type="submit" className={buttonVariants({ size: "sm" })}>
            Speichern
          </button>
        </div>
      </form>

      {/* Eingehende Mails — Resend Inbound Setup */}
      <div className="flex flex-col gap-4 border border-border p-6">
        <h2 className="text-base font-semibold">Eingehende E-Mails (Resend Inbound)</h2>

        <div className="flex gap-2 border border-info/30 bg-info/5 px-4 py-3 text-sm text-fg">
          <Info className="mt-0.5 size-4 shrink-0 text-info" />
          <p>
            Damit eingehende Mails im Postfach landen, musst du in deinem{" "}
            <strong>Resend-Dashboard</strong> unter{" "}
            <em>Domains → Inbound</em> einen MX-Eintrag und einen Webhook eintragen.
          </p>
        </div>

        <ol className="flex flex-col gap-3 text-sm text-muted-fg">
          <li className="flex gap-3">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-fg">
              1
            </span>
            <span>
              Öffne <strong>resend.com → Domains</strong>, wähle deine Schul-Domain und klicke auf{" "}
              <strong>Inbound</strong>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-fg">
              2
            </span>
            <span>
              Trage den angezeigten <strong>MX-Record</strong> bei deinem DNS-Anbieter ein (z.B.{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">inbound-smtp.resend.com</code>).
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-fg">
              3
            </span>
            <div className="flex flex-col gap-1">
              <span>
                Erstelle einen <strong>Webhook</strong> mit der folgenden URL:
              </span>
              <code className="break-all rounded border border-border bg-muted px-3 py-2 text-xs text-fg">
                {webhookUrl}
              </code>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-fg">
              4
            </span>
            <span>
              Optional: Setze die Umgebungsvariable{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">RESEND_INBOUND_SECRET</code>{" "}
              auf den in Resend angezeigten Signaturschlüssel.
            </span>
          </li>
        </ol>
      </div>
    </div>
  );
}
