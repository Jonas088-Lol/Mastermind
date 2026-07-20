/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Megaphone, Trash2 } from "lucide-react";
import { effectiveRole, getSession } from "@/lib/session";
import { getCurrentPlatformUpdate } from "@/lib/platform-update";
import { publishUpdate, retractUpdate } from "./actions";

export const metadata: Metadata = { title: "Updates · Plattform" };

export default async function PlattformUpdatesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; mailed?: string; error?: string }>;
}) {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "super") redirect("/login");

  const sp = await searchParams;
  const current = await getCurrentPlatformUpdate();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Plattform</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Update ankündigen</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Wird allen Nutzern beim nächsten Öffnen der App einmalig als Popup angezeigt —
          optional zusätzlich per E-Mail an alle verschickt.
        </p>
      </header>

      {sp.ok && (
        <p className="border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
          Update veröffentlicht{Number(sp.mailed) > 0 ? ` — ${sp.mailed} E-Mails versendet.` : "."}
        </p>
      )}
      {sp.error && (
        <p className="border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          Titel und Beschreibung dürfen nicht leer sein.
        </p>
      )}

      {current && (
        <div className="flex items-start justify-between gap-4 border border-border bg-surface p-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
              Aktuell aktives Update ·{" "}
              {new Date(current.publishedAt).toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
            <p className="mt-1 font-semibold">{current.title}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-fg">{current.body}</p>
          </div>
          <form action={retractUpdate}>
            <button
              type="submit"
              className="flex shrink-0 items-center gap-1.5 border border-border bg-bg px-3 py-2 text-xs font-semibold text-danger transition-colors hover:border-danger/40"
            >
              <Trash2 className="size-3.5" /> Zurückziehen
            </button>
          </form>
        </div>
      )}

      <form action={publishUpdate} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="title" className="text-sm font-semibold">Titel</label>
          <input
            id="title" name="title" type="text" required maxLength={120}
            placeholder="z. B. Neues Update: Klassen-Nachrichten & ASV-Export"
            className="h-10 border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="body" className="text-sm font-semibold">Was ist neu?</label>
          <textarea
            id="body" name="body" rows={8} required maxLength={4000}
            placeholder={"• Nachrichten direkt an ganze Klassen\n• ASV-kompatibler Export\n• …"}
            className="resize-y border border-border bg-bg px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 text-sm">
          <input type="checkbox" name="sendEmail" className="mt-0.5 size-4 accent-brand" />
          <span>
            <span className="font-semibold">Zusätzlich per E-Mail an alle Nutzer senden</span>
            <span className="block text-xs text-muted-fg">
              Demo-Accounts werden übersprungen. Der Versand kann bei vielen Nutzern etwas dauern.
            </span>
          </span>
        </label>

        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center gap-2 self-start bg-brand px-5 text-sm font-semibold text-brand-fg transition-opacity hover:opacity-90"
        >
          <Megaphone className="size-4" /> Update veröffentlichen
        </button>
      </form>
    </div>
  );
}
