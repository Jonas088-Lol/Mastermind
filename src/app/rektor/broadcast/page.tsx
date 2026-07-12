/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { effectiveRole, getSession } from "@/lib/session";
import { sendBroadcast } from "./actions";

export const metadata: Metadata = { title: "Broadcast · Schulleitung" };

export default async function BroadcastPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (role !== "rector" && role !== "vice_rector" && role !== "admin" && role !== "super") {
    redirect("/login");
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schulleitung</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Broadcast-Nachricht</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Sende eine Systemnachricht an alle Nutzer einer Gruppe.
        </p>
      </header>

      <form action={sendBroadcast} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold">Zielgruppe</label>
          <select
            name="target"
            required
            className="h-10 border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none"
          >
            <option value="">Zielgruppe wählen…</option>
            <option value="all">Alle Nutzer der Schule</option>
            <option value="teacher">Alle Lehrkräfte</option>
            <option value="student">Alle Schüler</option>
            <option value="parent">Alle Eltern</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold">Betreff</label>
          <input
            name="subject"
            type="text"
            required
            placeholder="z. B. Wichtige Mitteilung"
            className="h-10 border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold">Nachricht</label>
          <textarea
            name="message"
            required
            rows={6}
            placeholder="Text der Broadcast-Nachricht…"
            className="border border-border bg-bg px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <div className="border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-muted-fg">
          <strong className="font-semibold text-fg">Achtung:</strong> Diese Nachricht wird sofort als
          App-Benachrichtigung an alle Nutzer der gewählten Gruppe gesendet und kann nicht
          zurückgerufen werden.
        </div>

        <button
          type="submit"
          className="bg-fg px-5 py-2.5 text-sm font-semibold text-bg hover:bg-fg/90"
        >
          Broadcast senden
        </button>
      </form>
    </div>
  );
}
